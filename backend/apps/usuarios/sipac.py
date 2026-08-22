"""
Cliente de integração com a API do SIPAC (UFPI).

Permite a autenticação de usuários e a sincronização de unidades organizacionais.
"""

import json
import logging
import urllib.error
import urllib.request
from django.conf import settings
from apps.unidades.models import Unidade

logger = logging.getLogger(__name__)


class SipacClient:
    """
    Cliente para comunicação com os serviços de API do SIPAC da UFPI.
    """

    def __init__(self, base_url=None, client_id=None, client_secret=None, timeout=None):
        self.base_url = (base_url or getattr(settings, "SIPAC_API_BASE_URL", "https://sipac.ufpi.br/api")).rstrip("/")
        self.client_id = client_id if client_id is not None else getattr(settings, "SIPAC_CLIENT_ID", "")
        self.client_secret = client_secret if client_secret is not None else getattr(settings, "SIPAC_CLIENT_SECRET", "")
        self.timeout = timeout if timeout is not None else getattr(settings, "SIPAC_TIMEOUT_SECONDS", 10)

    def autenticar_e_obter_dados(self, username, password):
        """
        Autentica o usuário no SIPAC e retorna os dados cadastrais (SIAPE, nome, email, unidade).

        Retorna:
            dict com os dados do usuário em caso de sucesso, ou None se falhar.
        """
        if not username or not password:
            return None

        url = f"{self.base_url}/auth/login/"
        payload = {
            "username": username,
            "password": password,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "PAC-UFPI/1.0",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                if response.status == 200:
                    body = response.read().decode("utf-8")
                    return json.loads(body)
                return None
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, Exception) as exc:
            logger.warning("Falha na autenticação via SIPAC para '%s': %s", username, exc)
            return None

    def sincronizar_unidade(self, codigo_unidade, nome_unidade=None, sigla_unidade=None):
        """
        Garante a existência e sincronização da Unidade no banco local.

        Retorna:
            Instância de apps.unidades.models.Unidade criada ou atualizada.
        """
        if not codigo_unidade:
            return None

        codigo = str(codigo_unidade).strip()
        nome = str(nome_unidade or f"Unidade {codigo}").strip()
        sigla = str(sigla_unidade or codigo).strip()

        unidade = Unidade.objects.filter(codigo=codigo).first()
        if not unidade and sigla:
            unidade = Unidade.objects.filter(sigla=sigla).first()

        if unidade:
            unidade.codigo = codigo
            unidade.nome = nome
            unidade.sigla = sigla
            unidade.ativo = True
            unidade.save(update_fields=["codigo", "nome", "sigla", "ativo", "atualizado_em"])
            return unidade

        unidade, _ = Unidade.objects.update_or_create(
            codigo=codigo,
            defaults={
                "nome": nome,
                "sigla": sigla,
                "ativo": True,
            },
        )
        return unidade
