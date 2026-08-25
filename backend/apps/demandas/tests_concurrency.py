import threading

from django.db import close_old_connections, connection, transaction
from django.test import TransactionTestCase

from apps.demandas.models import Demanda, StatusDemanda
from apps.unidades.models import Unidade
from apps.usuarios.models import Usuario


class DemandaSelectForUpdateConcurrencyTests(TransactionTestCase):
    def setUp(self):
        if connection.vendor != "postgresql":
            self.skipTest("Este teste exige PostgreSQL.")

        self.unidade = Unidade.objects.create(
            nome="Unidade Lock",
            sigla="LOCK",
            codigo="LOCK-1",
        )
        self.usuario = Usuario.objects.create_user(
            username="usuario_lock",
            email="usuario_lock@example.com",
            siape="LOCK-1",
            unidade=self.unidade,
        )
        self.demanda = Demanda.objects.create(
            unidade=self.unidade,
            usuario=self.usuario,
            ano_referencia=2027,
            status=StatusDemanda.RASCUNHO,
        )

    def test_select_for_update_bloqueia_outra_conexao(self):
        holder_ready = threading.Event()
        waiter_attempted = threading.Event()
        waiter_acquired = threading.Event()
        release_holder = threading.Event()
        errors = []
        errors_lock = threading.Lock()

        def record_error(error):
            with errors_lock:
                errors.append(error)

        def holder():
            close_old_connections()
            try:
                with transaction.atomic():
                    Demanda.objects.select_for_update().get(pk=self.demanda.pk)
                    holder_ready.set()
                    if not release_holder.wait(timeout=5):
                        raise AssertionError("Timeout aguardando liberação do lock.")
            except BaseException as error:
                record_error(error)
            finally:
                close_old_connections()

        def waiter():
            close_old_connections()
            try:
                if not holder_ready.wait(timeout=5):
                    raise AssertionError("A primeira thread não adquiriu o lock.")

                waiter_attempted.set()
                with transaction.atomic():
                    Demanda.objects.select_for_update().get(pk=self.demanda.pk)
                    waiter_acquired.set()
            except BaseException as error:
                record_error(error)
            finally:
                close_old_connections()

        holder_thread = threading.Thread(target=holder)
        waiter_thread = threading.Thread(target=waiter)
        holder_thread.start()
        waiter_thread.start()

        try:
            self.assertTrue(holder_ready.wait(timeout=5))
            self.assertTrue(waiter_attempted.wait(timeout=5))
            self.assertFalse(
                waiter_acquired.wait(timeout=0.5),
                "A segunda conexão obteve o lock antes da primeira liberá-lo.",
            )
        finally:
            release_holder.set()
            holder_thread.join(timeout=5)
            waiter_thread.join(timeout=5)

        self.assertFalse(holder_thread.is_alive())
        self.assertFalse(waiter_thread.is_alive())
        self.assertEqual(errors, [])
        self.assertTrue(waiter_acquired.is_set())
