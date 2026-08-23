"""
Views da API REST do PAC UFPI.

Expõe autenticação por sessão e os recursos consumidos pelo front-end React.
A regra de negócio replica o fluxo das views server-side originais, agora
sobre endpoints JSON.
"""

from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.middleware.csrf import get_token
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalogo.models import ItemCatalogo
from apps.demandas.constants import pode_transicionar_demanda, pode_transicionar_item
from apps.demandas.models import Demanda, ItemDemanda, StatusDemanda, StatusItemDemanda
from apps.demandas.services import (
    ErroDominio,
    OperacaoItemDemanda,
    verificar_acesso_item_demanda,
    reenviar_item_devolvido,
    sincronizar_status_macro_demanda,
)
from apps.dfd.models import DFD
from apps.dfd.selectors import (
    agrupar_itens_elegiveis,
    listar_ciclos_elegiveis,
    listar_itens_elegiveis,
)
from apps.dfd.services import ConflitoConsolidacao, consolidar_itens_em_dfd
from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade
from apps.validacoes.models import TipoAcao, Validacao

from .permissions import IsAdminMasterUserPermission, IsAdminUserPermission
from .serializers import (
    DemandaSerializer,
    DFDSerializer,
    ConsolidarDFDSerializer,
    GrupoContratacaoSerializer,
    ItemCatalogoSerializer,
    ItemDemandaCorrecaoSerializer,
    ItemDemandaSerializer,
    ItensElegiveisQuerySerializer,
    UnidadeSerializer,
    UsuarioMeSerializer,
    UsuarioSerializer,
    ValidacaoSerializer,
)
from .validation_serializers import ItemPendenteValidacaoSerializer


def erro_dominio_response(exc: ErroDominio):
    return Response(exc.detail if isinstance(exc.detail, dict) else {"detail": exc.detail}, status=exc.status_code)


def demandas_no_escopo_do_usuario(queryset, usuario):
    """Aplica o mesmo isolamento de demandas nas telas e nos indicadores."""
    if getattr(usuario, "is_admin_master_user", False):
        return queryset
    if getattr(usuario, "is_admin_user", False):
        filtro = Q(usuario=usuario)
        if usuario.unidade_id:
            filtro |= Q(
                itens__item_catalogo__grupo__unidade_admin_id=usuario.unidade_id
            ) | Q(
                itens__item_catalogo__isnull=True, unidade_id=usuario.unidade_id
            )
        return queryset.filter(filtro).distinct()
    return queryset.filter(usuario=usuario)


def itens_no_escopo_do_usuario(queryset, usuario):
    """Inclui itens proprios e, para ADMIN, os grupos da unidade administradora."""
    if getattr(usuario, "is_admin_master_user", False):
        return queryset
    if getattr(usuario, "is_admin_user", False):
        filtro = Q(demanda__usuario=usuario)
        if usuario.unidade_id:
            filtro |= Q(
                item_catalogo__grupo__unidade_admin_id=usuario.unidade_id
            ) | Q(
                item_catalogo__isnull=True, demanda__unidade_id=usuario.unidade_id
            )
        return queryset.filter(filtro).distinct()
    return queryset.filter(demanda__usuario=usuario)


def dfds_no_escopo_do_usuario(queryset, usuario):
    """Restringe DFDs ao grupo administrado ou a itens do proprio usuario."""
    if getattr(usuario, "is_admin_master_user", False):
        return queryset

    filtro = Q(itens_demanda__demanda__usuario=usuario) | Q(
        itens_vinculados__demanda__usuario=usuario
    )
    if getattr(usuario, "is_admin_user", False) and usuario.unidade_id:
        filtro |= Q(grupo__unidade_admin_id=usuario.unidade_id)
    return queryset.filter(filtro).distinct()


# =============================================================================
# Autenticação (sessão)
# =============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def csrf(request):
    """Garante o cookie CSRF para o front-end antes do login."""
    return Response({"detail": get_token(request)})


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = (
        request.data.get("username")
        or request.data.get("email")
        or request.data.get("login")
    )
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {"detail": "Informe usuário e senha."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response(
            {"detail": "Credenciais inválidas."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    login(request, user)
    return Response(UsuarioMeSerializer(user).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UsuarioMeSerializer(request.user).data)


# =============================================================================
# Recursos de referência
# =============================================================================

class UnidadeViewSet(viewsets.ModelViewSet):
    queryset = Unidade.objects.all()
    serializer_class = UnidadeSerializer

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsAdminMasterUserPermission()]
        return [AllowAny()]


class GrupoContratacaoViewSet(viewsets.ModelViewSet):
    queryset = GrupoContratacao.objects.select_related("unidade_admin").all()
    serializer_class = GrupoContratacaoSerializer

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsAdminMasterUserPermission()]
        return [IsAuthenticated()]


class ItemCatalogoViewSet(viewsets.ModelViewSet):
    queryset = ItemCatalogo.objects.select_related("grupo").all()
    serializer_class = ItemCatalogoSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy", "ativar", "desativar"]:
            return [IsAuthenticated(), IsAdminUserPermission()]
        return [IsAuthenticated()]

    def _validar_grupo_para_mutacao(self, grupo):
        usuario = self.request.user
        if getattr(usuario, "is_admin_master_user", False):
            return
        if (
            getattr(usuario, "is_admin_user", False)
            and usuario.unidade_id
            and grupo.unidade_admin_id == usuario.unidade_id
        ):
            return
        raise PermissionDenied(
            "Voce nao tem permissao para gerenciar itens deste grupo de contratacao."
        )

    def perform_create(self, serializer):
        self._validar_grupo_para_mutacao(serializer.validated_data["grupo"])
        serializer.save()

    def perform_update(self, serializer):
        self._validar_grupo_para_mutacao(serializer.instance.grupo)
        self._validar_grupo_para_mutacao(
            serializer.validated_data.get("grupo", serializer.instance.grupo)
        )
        serializer.save()

    def perform_destroy(self, instance):
        self._validar_grupo_para_mutacao(instance.grupo)
        instance.delete()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        termo = self.request.query_params.get("q") or self.request.query_params.get("search")
        grupo = self.request.query_params.get("grupo")
        ativo = self.request.query_params.get("ativo")

        if termo:
            qs = qs.filter(
                Q(nome__icontains=termo)
                | Q(codigo_catmat_catser__icontains=termo)
            )
        if grupo:
            qs = qs.filter(grupo_id=grupo)

        if getattr(user, "is_admin_user", False):
            if ativo in ["true", "1", "sim"]:
                qs = qs.filter(ativo=True)
            elif ativo in ["false", "0", "nao"]:
                qs = qs.filter(ativo=False)
        else:
            qs = qs.filter(ativo=True)
            if ativo in ["false", "0", "nao"]:
                qs = qs.none()

        return qs

    @action(detail=True, methods=["post"])
    def ativar(self, request, pk=None):
        item = self.get_object()
        self._validar_grupo_para_mutacao(item.grupo)
        item.ativo = True
        item.save(update_fields=["ativo", "atualizado_em"])
        return Response(self.get_serializer(item).data)

    @action(detail=True, methods=["post"])
    def desativar(self, request, pk=None):
        item = self.get_object()
        self._validar_grupo_para_mutacao(item.grupo)
        item.ativo = False
        item.save(update_fields=["ativo", "atualizado_em"])
        return Response(self.get_serializer(item).data)


# =============================================================================
# Demandas e itens
# =============================================================================

class DemandaViewSet(viewsets.ModelViewSet):
    serializer_class = DemandaSerializer

    def get_queryset(self):
        from django.db.models import Prefetch
        from apps.validacoes.models import Validacao, TipoAcao
        user = self.request.user
        ultima_devolucao_prefetch = Prefetch(
            "validacoes",
            queryset=Validacao.objects.filter(acao=TipoAcao.DEVOLVIDO).select_related("usuario").order_by("-criado_em", "-id"),
            to_attr="devolucoes_prefetched"
        )
        todas_validacoes_prefetch = Prefetch(
            "validacoes",
            queryset=Validacao.objects.select_related("usuario").order_by("-criado_em", "-id"),
            to_attr="todas_validacoes_prefetched"
        )
        itens_visiveis = itens_no_escopo_do_usuario(
            ItemDemanda.objects.select_related("dfd").prefetch_related(
                ultima_devolucao_prefetch,
                todas_validacoes_prefetch,
            ),
            user,
        )
        itens_prefetch = Prefetch("itens", queryset=itens_visiveis)
        qs = (
            Demanda.objects.select_related("unidade", "usuario")
            .prefetch_related(itens_prefetch)
        )
        return demandas_no_escopo_do_usuario(qs, user)

    def perform_create(self, serializer):
        unidade = getattr(self.request.user, "unidade", None)
        if unidade is None:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                "Seu usuário não possui uma unidade vinculada. "
                "Contate o administrador."
            )
        serializer.save(usuario=self.request.user, unidade=unidade)

    def _pode_editar(self, demanda):
        user = self.request.user
        return demanda.usuario_id == user.id

    def _pode_cancelar_demanda_inteira(self, demanda):
        user = self.request.user
        if demanda.usuario_id == user.id or user.is_admin_master_user:
            return True
        if not user.is_admin_user or not user.unidade_id:
            return False
        return not demanda.itens.exclude(
            item_catalogo__grupo__unidade_admin_id=user.unidade_id
        ).exists()

    def update(self, request, *args, **kwargs):
        demanda = self.get_object()
        if not self._pode_editar(demanda):
            return Response(
                {"detail": "Você não tem permissão para editar esta demanda."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
            return Response(
                {"detail": "Não é permitido alterar solicitações encerradas ou canceladas."},
                status=status.HTTP_409_CONFLICT,
            )
        if demanda.status != StatusDemanda.RASCUNHO:
            return Response(
                {"detail": "Somente demandas em rascunho podem ser editadas."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        demanda = self.get_object()
        if not self._pode_editar(demanda):
            return Response(
                {"detail": "Você não tem permissão para excluir esta demanda."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if demanda.status != StatusDemanda.RASCUNHO:
            return Response(
                {"detail": "Somente demandas em rascunho podem ser excluídas."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["get", "post"])
    def itens(self, request, pk=None):
        demanda = self.get_object()

        if request.method == "GET":
            serializer = ItemDemandaSerializer(demanda.itens.all(), many=True)
            return Response(serializer.data)

        if not self._pode_editar(demanda):
            return Response(
                {"detail": "Você não tem permissão para alterar esta demanda."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
            return Response(
                {"detail": "Não é permitido alterar solicitações encerradas ou canceladas."},
                status=status.HTTP_409_CONFLICT,
            )
        if demanda.status != StatusDemanda.RASCUNHO:
            return Response(
                {"detail": "Itens só podem ser adicionados em rascunho."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            demanda_locked = Demanda.objects.select_for_update().get(pk=demanda.pk)
            serializer = ItemDemandaSerializer(
                data=request.data,
                context={**self.get_serializer_context(), "demanda": demanda_locked},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save(demanda=demanda_locked)
            sincronizar_status_macro_demanda(demanda_locked)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def enviar(self, request, pk=None):
        with transaction.atomic():
            demanda = get_object_or_404(Demanda.objects.select_for_update(), pk=pk)
            if not demandas_no_escopo_do_usuario(
                Demanda.objects.filter(pk=demanda.pk), request.user
            ).exists():
                raise Http404("Demanda não encontrada.")
            if not self._pode_editar(demanda):
                return Response(
                    {"detail": "Você não tem permissão para enviar esta demanda."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
                return Response(
                    {"detail": "Não é permitido alterar solicitações encerradas ou canceladas."},
                    status=status.HTTP_409_CONFLICT,
                )
            if not demanda.itens.exists():
                return Response(
                    {"detail": "Adicione pelo menos um item antes de enviar."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not pode_transicionar_demanda(demanda.status, StatusDemanda.AGUARDANDO_VALIDACAO):
                return Response(
                    {"detail": f"Transição inválida de {demanda.status} para {StatusDemanda.AGUARDANDO_VALIDACAO}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            from apps.demandas.services import validar_item_para_envio
            from django.core.exceptions import ValidationError
            for item in demanda.itens.all():
                try:
                    validar_item_para_envio(item)
                except ValidationError as ve:
                    msg = ve.message if hasattr(ve, "message") else str(ve)
                    return Response(
                        {"detail": f"Item '{item.nome}': {msg}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            demanda.enviada_em = timezone.now()
            demanda.save(update_fields=["enviada_em", "atualizado_em"])
            demanda.itens.update(status=StatusItemDemanda.AGUARDANDO_VALIDACAO)
            sincronizar_status_macro_demanda(demanda)
            return Response(DemandaSerializer(demanda).data)

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        with transaction.atomic():
            demanda = get_object_or_404(Demanda.objects.select_for_update(), pk=pk)
            if not demandas_no_escopo_do_usuario(
                Demanda.objects.filter(pk=demanda.pk), request.user
            ).exists():
                raise Http404("Demanda não encontrada.")
            user = request.user

            # A acao macro nao pode alterar itens de grupos fora do escopo do ADMIN.
            if not self._pode_cancelar_demanda_inteira(demanda):
                return Response(
                    {"detail": "Você não tem permissão para cancelar esta demanda."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if not user.is_admin_user and demanda.status != StatusDemanda.RASCUNHO:
                return Response(
                    {"detail": "Usuários comuns só podem cancelar solicitações em rascunho."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if demanda.status == StatusDemanda.CONCLUIDA:
                return Response(
                    {"detail": "Solicitações concluídas não podem ser canceladas."},
                    status=status.HTTP_409_CONFLICT,
                )

            demanda.status = StatusDemanda.CANCELADA
            demanda.save(update_fields=["status", "atualizado_em"])
            demanda.itens.update(status=StatusItemDemanda.CANCELADA)
            return Response(DemandaSerializer(demanda).data)


class ItemDemandaViewSetLegacy(viewsets.ModelViewSet):
    serializer_class = ItemDemandaSerializer

    def get_queryset(self):
        from django.db.models import Prefetch
        from apps.validacoes.models import Validacao, TipoAcao
        ultima_devolucao_prefetch = Prefetch(
            "validacoes",
            queryset=Validacao.objects.filter(acao=TipoAcao.DEVOLVIDO).select_related("usuario").order_by("-criado_em", "-id"),
            to_attr="devolucoes_prefetched"
        )
        qs = ItemDemanda.objects.select_related("demanda", "demanda__usuario").prefetch_related(ultima_devolucao_prefetch)
        user = self.request.user
        if not user.is_admin_user:
            qs = qs.filter(demanda__usuario=user)
        return qs

    def _pode_editar(self, item):
        user = self.request.user
        return item.demanda.usuario_id == user.id

    def update(self, request, *args, **kwargs):
        item = self.get_object()
        if not self._pode_editar(item):
            return Response(
                {"detail": "Você não tem permissão para editar este item."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if item.demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
            return Response(
                {"detail": "Não é permitido alterar solicitações encerradas ou canceladas."},
                status=status.HTTP_409_CONFLICT,
            )
        if item.demanda.status != StatusDemanda.RASCUNHO and item.status != StatusItemDemanda.DEVOLVIDA:
            return Response(
                {"detail": "Itens só podem ser editados em rascunho ou devolvidos."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        with transaction.atomic():
            response = super().update(request, *args, **kwargs)
            demanda_locked = Demanda.objects.select_for_update().get(pk=item.demanda_id)
            sincronizar_status_macro_demanda(demanda_locked)
            return response

    def destroy(self, request, *args, **kwargs):
        item = self.get_object()
        if not self._pode_editar(item):
            return Response(
                {"detail": "Você não tem permissão para excluir este item."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if item.demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
            return Response(
                {"detail": "Não é permitido alterar solicitações encerradas ou canceladas."},
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            demanda_locked = Demanda.objects.select_for_update().get(pk=item.demanda_id)
            response = super().destroy(request, *args, **kwargs)
            sincronizar_status_macro_demanda(demanda_locked)
            return response

    @action(detail=True, methods=["post"])
    def reenviar(self, request, pk=None):
        with transaction.atomic():
            item = ItemDemanda.objects.select_for_update(of=("self",)).select_related("demanda").filter(pk=pk).first()
            if item is None:
                return Response({"detail": "Item não encontrado."}, status=status.HTTP_404_NOT_FOUND)

            demanda = Demanda.objects.select_for_update().get(pk=item.demanda_id)

            if not self._pode_editar(item):
                return Response(
                    {"detail": "Você não tem permissão para reenviar este item."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
                return Response(
                    {"detail": "Não é permitido alterar solicitações encerradas ou canceladas."},
                    status=status.HTTP_409_CONFLICT,
                )
            if not pode_transicionar_item(item.status, StatusItemDemanda.AGUARDANDO_VALIDACAO):
                return Response(
                    {"detail": "Somente itens devolvidos podem ser reenviados para validação."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            from apps.demandas.services import validar_item_para_envio
            from django.core.exceptions import ValidationError
            try:
                validar_item_para_envio(item)
            except ValidationError as ve:
                msg = ve.message if hasattr(ve, "message") else str(ve)
                return Response({"detail": msg}, status=status.HTTP_400_BAD_REQUEST)

            item.status = StatusItemDemanda.AGUARDANDO_VALIDACAO
            item.save(update_fields=["status", "atualizado_em"])
            sincronizar_status_macro_demanda(demanda)
            return Response(
                {
                    "detail": "Item reenviado para validação com sucesso.",
                    "item": ItemDemandaSerializer(item, context={"request": request}).data,
                    "demanda": {
                        "id": demanda.id,
                        "status": demanda.status,
                        "status_display": demanda.get_status_display(),
                    },
                },
                status=status.HTTP_200_OK,
            )


# =============================================================================
# Validações
# =============================================================================

class ItemDemandaViewSet(viewsets.ModelViewSet):
    serializer_class = ItemDemandaSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action == "partial_update":
            return ItemDemandaCorrecaoSerializer
        return ItemDemandaSerializer

    def get_queryset(self):
        from django.db.models import Prefetch, Q
        from apps.validacoes.models import Validacao, TipoAcao

        ultima_devolucao_prefetch = Prefetch(
            "validacoes",
            queryset=Validacao.objects.filter(acao=TipoAcao.DEVOLVIDO)
            .select_related("usuario")
            .order_by("-criado_em", "-id"),
            to_attr="devolucoes_prefetched",
        )
        qs = (
            ItemDemanda.objects.select_related(
                "demanda", "demanda__usuario", "dfd", "item_catalogo__grupo__unidade_admin"
            )
            .prefetch_related(ultima_devolucao_prefetch)
        )
        user = self.request.user
        if getattr(user, "is_admin_master_user", False):
            return qs
        if getattr(user, "is_admin_user", False):
            return qs.filter(
                Q(demanda__usuario=user)
                | Q(item_catalogo__grupo__unidade_admin_id=user.unidade_id)
                | Q(item_catalogo__isnull=True, demanda__unidade_id=user.unidade_id)
            )
        return qs.filter(demanda__usuario=user)

    def retrieve(self, request, *args, **kwargs):
        item = self.get_object()
        try:
            verificar_acesso_item_demanda(
                usuario=request.user,
                item=item,
                operacao=OperacaoItemDemanda.VISUALIZAR,
            )
        except ErroDominio as exc:
            return erro_dominio_response(exc)
        return Response(self.get_serializer(item).data)

    def update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Metodo PUT nao permitido para itens de demanda."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def partial_update(self, request, *args, **kwargs):
        item = self.get_object()
        try:
            verificar_acesso_item_demanda(
                usuario=request.user,
                item=item,
                operacao=OperacaoItemDemanda.EDITAR,
            )
        except ErroDominio as exc:
            return erro_dominio_response(exc)

        if item.demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
            return Response(
                {"detail": "Nao e permitido alterar solicitacoes encerradas ou canceladas."},
                status=status.HTTP_409_CONFLICT,
            )
        if item.demanda.status != StatusDemanda.RASCUNHO and item.status != StatusItemDemanda.DEVOLVIDA:
            return Response(
                {"detail": "Itens so podem ser editados em rascunho ou devolvidos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            demanda_locked = Demanda.objects.select_for_update().get(pk=item.demanda_id)
            item_locked = (
                ItemDemanda.objects.select_for_update(of=("self",))
                .select_related("demanda", "item_catalogo__grupo__unidade_admin")
                .get(pk=item.pk)
            )
            serializer = self.get_serializer(item_locked, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            sincronizar_status_macro_demanda(demanda_locked)
            return Response(ItemDemandaSerializer(item_locked, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        item = self.get_object()
        try:
            verificar_acesso_item_demanda(
                usuario=request.user,
                item=item,
                operacao=OperacaoItemDemanda.EDITAR,
            )
        except ErroDominio as exc:
            return erro_dominio_response(exc)
        if item.demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
            return Response(
                {"detail": "Nao e permitido alterar solicitacoes encerradas ou canceladas."},
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            demanda_locked = Demanda.objects.select_for_update().get(pk=item.demanda_id)
            response = super().destroy(request, *args, **kwargs)
            sincronizar_status_macro_demanda(demanda_locked)
            return response

    @action(detail=True, methods=["post"])
    def reenviar(self, request, pk=None):
        try:
            item = reenviar_item_devolvido(item_id=pk, usuario=request.user)
        except ErroDominio as exc:
            return erro_dominio_response(exc)

        demanda = item.demanda
        demanda.refresh_from_db()
        item.refresh_from_db()
        return Response(
            {
                "detail": "Item reenviado para validacao com sucesso.",
                "item": ItemDemandaSerializer(item, context={"request": request}).data,
                "demanda": {
                    "id": demanda.id,
                    "status": demanda.status,
                    "status_display": demanda.get_status_display(),
                },
            },
            status=status.HTTP_200_OK,
        )


class ValidacaoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Validacao.objects.select_related("usuario", "item_demanda").all()
    serializer_class = ValidacaoSerializer
    permission_classes = [IsAuthenticated, IsAdminUserPermission]

    def get_queryset(self):
        queryset = super().get_queryset().select_related(
            "item_demanda__item_catalogo__grupo"
        )
        user = self.request.user
        if user.is_admin_master_user:
            return queryset
        if not user.unidade_id:
            return queryset.none()
        filtro = Q(item_demanda__item_catalogo__grupo__unidade_admin_id=user.unidade_id)
        filtro |= Q(
            item_demanda__item_catalogo__isnull=True,
            item_demanda__demanda__unidade_id=user.unidade_id
        )
        return queryset.filter(filtro)

    @staticmethod
    def _itens_no_escopo_do_usuario(queryset, user):
        """Restringe ADMIN ao grupo administrado pela sua unidade.
        Também permite que ADMIN valide itens manuais caso tenham sido
        criados pela sua própria unidade.
        """
        if user.is_admin_master_user:
            return queryset
        if not user.unidade_id:
            return queryset.none()
        filtro = Q(item_catalogo__grupo__unidade_admin_id=user.unidade_id)
        filtro |= Q(
            item_catalogo__isnull=True,
            demanda__unidade_id=user.unidade_id
        )
        return queryset.filter(filtro)

    @staticmethod
    def _usuario_pode_decidir_item(user, item):
        if user.is_admin_master_user:
            return True
        if not user.unidade_id:
            return False
        
        if item.item_catalogo_id:
            return item.item_catalogo.grupo.unidade_admin_id == user.unidade_id
        
        return item.demanda.unidade_id == user.unidade_id

    @staticmethod
    def _filtro_id(request, nome, *aliases):
        valor = request.query_params.get(nome)
        if valor in (None, ""):
            for alias in aliases:
                valor = request.query_params.get(alias)
                if valor not in (None, ""):
                    break
        if valor in (None, ""):
            return None, None
        try:
            valor = int(valor)
        except (TypeError, ValueError):
            valor = 0
        if valor <= 0:
            return None, Response(
                {nome: ["Informe um identificador inteiro positivo."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return valor, None

    @action(detail=False, methods=["get"])
    def pendentes(self, request):
        from django.db.models import Prefetch

        unidade_id, erro = self._filtro_id(request, "unidade", "unidade_id")
        if erro:
            return erro
        grupo_id, erro = self._filtro_id(
            request, "grupo", "grupo_id", "grupo_contratacao_id"
        )
        if erro:
            return erro

        ultima_devolucao_prefetch = Prefetch(
            "validacoes",
            queryset=Validacao.objects.filter(acao=TipoAcao.DEVOLVIDO)
            .select_related("usuario")
            .order_by("-criado_em", "-id"),
            to_attr="devolucoes_prefetched",
        )
        itens = (
            ItemDemanda.objects.filter(
                status=StatusItemDemanda.AGUARDANDO_VALIDACAO
            )
            .select_related(
                "demanda",
                "demanda__unidade",
                "demanda__usuario",
                "item_catalogo",
                "item_catalogo__grupo",
                "item_catalogo__grupo__unidade_admin",
            )
            .prefetch_related(ultima_devolucao_prefetch)
        )
        itens = self._itens_no_escopo_do_usuario(itens, request.user)
        if unidade_id is not None:
            itens = itens.filter(demanda__unidade_id=unidade_id)
        if grupo_id is not None:
            itens = itens.filter(item_catalogo__grupo_id=grupo_id)
        itens = itens.order_by("-demanda__enviada_em", "demanda_id", "id")

        return Response(
            ItemPendenteValidacaoSerializer(
                itens, many=True, context={"request": request}
            ).data
        )

    @action(detail=False, methods=["post"])
    def decidir(self, request):
        item_id = request.data.get("item_demanda")
        acao = request.data.get("acao")
        comentario = request.data.get("comentario", "")

        try:
            item_id = int(item_id)
        except (TypeError, ValueError):
            item_id = 0
        if item_id <= 0:
            return Response(
                {"item_demanda": ["Informe um identificador inteiro positivo."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if comentario is None:
            comentario = ""
        if not isinstance(comentario, str):
            return Response(
                {"comentario": ["Informe um texto valido."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        comentario = comentario.strip()

        with transaction.atomic():
            # Nao usa select_related no lock porque item_catalogo e anulavel;
            # no PostgreSQL, FOR UPDATE sobre o lado anulavel de um OUTER JOIN
            # e rejeitado. As relacoes de escopo sao carregadas sob a transacao.
            item = ItemDemanda.objects.select_for_update().filter(pk=item_id).first()
            if item is None:
                return Response(
                    {"detail": "Item não encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if not self._usuario_pode_decidir_item(request.user, item):
                return Response(
                    {
                        "detail": (
                            "Voce nao tem permissao para validar itens deste "
                            "grupo de contratacao."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            demanda_locked = Demanda.objects.select_for_update().get(pk=item.demanda_id)
            if demanda_locked.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
                return Response(
                    {"detail": "Não é permitido alterar solicitações encerradas ou canceladas."},
                    status=status.HTTP_409_CONFLICT,
                )

            if acao == TipoAcao.VALIDADO:
                novo_status = StatusItemDemanda.VALIDADA
            elif acao == TipoAcao.DEVOLVIDO:
                if not comentario:
                    return Response(
                        {"detail": "Comentário é obrigatório para devolução."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                novo_status = StatusItemDemanda.DEVOLVIDA
            else:
                return Response(
                    {"detail": "Ação inválida. Use 'validado' ou 'devolvido'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not pode_transicionar_item(item.status, novo_status):
                return Response(
                    {"detail": f"Transição de status inválida de {item.status} para {novo_status}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            item.status = novo_status
            item.save(update_fields=["status", "atualizado_em"])
            validacao = Validacao.objects.create(
                item_demanda=item,
                usuario=request.user,
                acao=acao,
                comentario=comentario,
            )
            sincronizar_status_macro_demanda(demanda_locked)
            return Response(
                ValidacaoSerializer(validacao).data, status=status.HTTP_201_CREATED
            )


# =============================================================================
# DFD
# =============================================================================

class ItensElegiveisConsolidacaoView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserPermission]

    def get(self, request):
        parametros = request.query_params.copy()
        if not parametros.get("grupo_contratacao_id") and parametros.get("grupo_id"):
            parametros["grupo_contratacao_id"] = parametros["grupo_id"]
        serializer = ItensElegiveisQuerySerializer(data=parametros)
        serializer.is_valid(raise_exception=True)
        queryset = listar_itens_elegiveis(
            usuario=request.user,
            **serializer.validated_data,
        )
        return Response(agrupar_itens_elegiveis(queryset))


class CiclosElegiveisConsolidacaoView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserPermission]

    def get(self, request):
        ciclos = listar_ciclos_elegiveis(usuario=request.user)
        return Response([
            {
                "id": ciclo["demanda__ciclo_pac_id"],
                "ano": ciclo["demanda__ciclo_pac__ano"],
                "ativo": ciclo["demanda__ciclo_pac__ativo"],
                "total_itens_elegiveis": ciclo["total_itens_elegiveis"],
            }
            for ciclo in ciclos
        ])


class ConsolidarDFDView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUserPermission]

    def post(self, request):
        # Compatibilidade temporaria para clientes da API anterior. O novo
        # contrato abaixo e o unico aceito para novas integracoes.
        if "numero" in request.data:
            return self._post_legado(request)
        serializer = ConsolidarDFDSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            resultado = consolidar_itens_em_dfd(usuario=request.user, **serializer.validated_data)
        except ConflitoConsolidacao as error:
            return Response(
                {"code": "ITEM_NAO_ELEGIVEL", "detail": error.message, "item_ids": error.item_ids},
                status=status.HTTP_409_CONFLICT,
            )
        dfd = resultado["dfd"]
        return Response({
            "dfd": {
                "id": dfd.id,
                "numero": dfd.numero,
                "ciclo_pac": {
                    "id": dfd.ciclo_pac_id,
                    "ano": dfd.ciclo_pac.ano,
                },
                "grupo_contratacao": {
                    "id": dfd.grupo_id,
                    "nome": dfd.grupo.nome,
                },
            },
            "itens_vinculados": len(resultado["itens"]),
            "item_ids": [item.id for item in resultado["itens"]],
            "demandas_afetadas": resultado["demandas_afetadas"],
        }, status=status.HTTP_201_CREATED if resultado["criado"] else status.HTTP_200_OK)

    def _post_legado(self, request):
        numero = request.data.get("numero")
        raw_item_ids = request.data.get("itens") or []
        try:
            grupo_id = int(request.data.get("grupo"))
            item_ids = list(dict.fromkeys(int(item_id) for item_id in raw_item_ids))
        except (TypeError, ValueError):
            return Response(
                {"detail": "Grupo e itens devem possuir identificadores inteiros."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(numero, str) or not numero.strip() or not grupo_id or not item_ids:
            return Response({"detail": "Informe numero, grupo e ao menos um item."}, status=status.HTTP_400_BAD_REQUEST)
        numero = numero.strip()
        grupo = GrupoContratacao.objects.filter(pk=grupo_id).first()
        if grupo is None:
            return Response(
                {"detail": "Grupo de contratacao nao encontrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (
            not request.user.is_admin_master_user
            and request.user.unidade_id != grupo.unidade_admin_id
        ):
            return Response(
                {"detail": "Voce nao tem permissao para consolidar itens deste grupo."},
                status=status.HTTP_403_FORBIDDEN,
            )
        with transaction.atomic():
            itens = list(
                ItemDemanda.objects.select_for_update(of=("self",))
                .select_related("item_catalogo", "item_catalogo__grupo", "demanda__ciclo_pac")
                .filter(id__in=item_ids)
            )
            if len(itens) != len(item_ids):
                return Response({"detail": "Um ou mais itens nao foram encontrados."}, status=status.HTTP_400_BAD_REQUEST)
            if any(
                item.item_catalogo_id
                and item.item_catalogo.grupo_id != grupo_id
                for item in itens
            ):
                return Response(
                    {"detail": "Todos os itens catalogados devem pertencer ao grupo informado."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            demandas = list(Demanda.objects.select_for_update().filter(id__in={item.demanda_id for item in itens}).order_by("id"))
            if any(d.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA] for d in demandas):
                return Response({"detail": "Solicitacao encerrada ou cancelada."}, status=status.HTTP_409_CONFLICT)
            if any(not pode_transicionar_item(item.status, StatusItemDemanda.VINCULADA_DFD) for item in itens):
                return Response({"detail": "Item nao pode ser consolidado."}, status=status.HTTP_400_BAD_REQUEST)
            ciclo_ids = {item.demanda.ciclo_pac_id for item in itens}
            if len(ciclo_ids) != 1:
                return Response({"detail": "Itens de ciclos diferentes."}, status=status.HTTP_400_BAD_REQUEST)
            ciclo_id = ciclo_ids.pop()
            if not itens[0].demanda.ciclo_pac.ativo:
                return Response(
                    {"detail": "Nao e permitido consolidar itens de um ciclo inativo."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if DFD.objects.filter(numero=numero, ciclo_pac_id=ciclo_id).exists():
                return Response(
                    {"detail": "Ja existe um DFD com este numero no ciclo informado."},
                    status=status.HTTP_409_CONFLICT,
                )
            dfd = DFD.objects.create(numero=numero, grupo=grupo, ciclo_pac_id=ciclo_id, criado_por=request.user)
            for item in itens:
                item.dfd = dfd
                item.status = StatusItemDemanda.VINCULADA_DFD
            ItemDemanda.objects.bulk_update(itens, ["dfd", "status"])
            dfd.itens_demanda.add(*itens)
            for demanda in demandas:
                sincronizar_status_macro_demanda(demanda)
            return Response(DFDSerializer(dfd).data, status=status.HTTP_201_CREATED)

class DFDViewSet(viewsets.ModelViewSet):
    queryset = (
        DFD.objects.select_related("grupo", "criado_por")
        .prefetch_related("itens_demanda")
        .all()
    )
    serializer_class = DFDSerializer
    permission_classes = [IsAuthenticated, IsAdminUserPermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_admin_master_user:
            return queryset
        if not self.request.user.unidade_id:
            return queryset.none()
        return queryset.filter(
            grupo__unidade_admin_id=self.request.user.unidade_id
        )

    @action(detail=False, methods=["get"])
    def disponiveis(self, request):
        itens = (
            ItemDemanda.objects.filter(
                status=StatusItemDemanda.VALIDADA,
                dfd__isnull=True,
            )
            .select_related(
                "demanda",
                "demanda__unidade",
                "item_catalogo",
                "item_catalogo__grupo",
            )
        )
        if not request.user.is_admin_master_user:
            itens = itens.filter(
                item_catalogo__isnull=False,
                item_catalogo__grupo__unidade_admin_id=request.user.unidade_id,
            )
        return Response(ItemDemandaSerializer(itens, many=True).data)

    @action(detail=False, methods=["post"])
    def consolidar(self, request):
        numero = request.data.get("numero")
        grupo_id = request.data.get("grupo")
        raw_item_ids = request.data.get("itens") or []
        item_ids = list(dict.fromkeys(raw_item_ids))

        if not numero or not grupo_id or not item_ids:
            return Response(
                {"detail": "Informe número, grupo e ao menos um item."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            itens = list(ItemDemanda.objects.select_for_update().filter(id__in=item_ids))
            if len(itens) != len(item_ids):
                return Response(
                    {"detail": "Um ou mais itens não foram encontrados."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Ordena e bloqueia deterministicamente as demandas afetadas por ID para evitar deadlock
            demanda_ids = sorted(set(item.demanda_id for item in itens))
            demandas_locked = list(
                Demanda.objects.select_for_update().filter(id__in=demanda_ids).order_by("id")
            )

            for demanda in demandas_locked:
                if demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
                    return Response(
                        {"detail": f"A solicitação #{demanda.id} está encerrada ou cancelada."},
                        status=status.HTTP_409_CONFLICT,
                    )

            for item in itens:
                if not pode_transicionar_item(item.status, StatusItemDemanda.VINCULADA_DFD):
                    return Response(
                        {"detail": f"Item #{item.id} em status '{item.status}' não pode ser consolidado/vinculado."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            dfd = DFD.objects.create(
                numero=numero,
                grupo_id=grupo_id,
                criado_por=request.user,
                numero_processo=request.data.get("numero_processo", ""),
                observacao=request.data.get("observacao", ""),
            )
            dfd.itens_demanda.set(itens)
            ItemDemanda.objects.filter(id__in=item_ids).update(
                status=StatusItemDemanda.VINCULADA_DFD
            )

            for demanda in demandas_locked:
                sincronizar_status_macro_demanda(demanda)

            return Response(
                DFDSerializer(dfd).data, status=status.HTTP_201_CREATED
            )


# =============================================================================
# Dashboard
# =============================================================================

class DashboardStatsView(APIView):
    def get(self, request):
        demandas = demandas_no_escopo_do_usuario(
            Demanda.objects.all(), request.user
        )
        itens = itens_no_escopo_do_usuario(ItemDemanda.objects.all(), request.user)
        dfds = dfds_no_escopo_do_usuario(DFD.objects.all(), request.user)

        por_status = {
            row["status"]: row["total"]
            for row in itens.order_by().values("status").annotate(total=Count("id"))
        }
        valor_total = itens.aggregate(total=Sum("valor_total"))["total"] or 0

        return Response(
            {
                "total_demandas": demandas.count(),
                "total_itens": itens.count(),
                "itens_por_status": por_status,
                "valor_total_estimado": valor_total,
                "aguardando_validacao": itens.filter(
                    status=StatusItemDemanda.AGUARDANDO_VALIDACAO
                ).count(),
                "validados": itens.filter(status=StatusItemDemanda.VALIDADA).count(),
                "consolidados": itens.filter(
                    status=StatusItemDemanda.VINCULADA_DFD
                ).count(),
                "total_dfds": dfds.count(),
            }
        )


# =============================================================================
# GESTÃO DE ACESSOS E USUÁRIOS
# =============================================================================

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.api.permissions import IsAdminMasterUserPermission
from apps.unidades.models import Unidade
from apps.usuarios.services import (
    solicitar_acesso, aprovar_solicitacao, rejeitar_solicitacao, 
    criar_usuario_admin, alterar_status_usuario, excluir_usuario
)
from apps.usuarios.models import SolicitacaoAcesso, Usuario
from apps.api.serializers import (
    SolicitarAcessoSerializer, SolicitacaoAcessoListSerializer,
    DecisaoSolicitacaoSerializer, CriarUsuarioAdminSerializer,
    UsuarioAdminListSerializer, UsuarioStatusUpdateSerializer
)

class SolicitarAcessoView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SolicitarAcessoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            unidade = Unidade.objects.get(id=serializer.validated_data['unidade_id'])
            solicitar_acesso(
                nome_completo=serializer.validated_data['nome_completo'],
                email=serializer.validated_data['email'],
                unidade=unidade,
                senha=serializer.validated_data['senha']
            )
            return Response({"message": "Solicitação enviada com sucesso."}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class AdminSolicitacoesListView(APIView):
    permission_classes = [IsAdminMasterUserPermission]

    def get(self, request):
        status_filter = request.query_params.get('status', None)
        queryset = SolicitacaoAcesso.objects.all().order_by('-criado_em')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        serializer = SolicitacaoAcessoListSerializer(queryset, many=True)
        return Response(serializer.data)

class AdminAprovarSolicitacaoView(APIView):
    permission_classes = [IsAdminMasterUserPermission]

    def post(self, request, pk):
        try:
            aprovar_solicitacao(pk, request.user)
            return Response({"message": "Solicitação aprovada."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class AdminRejeitarSolicitacaoView(APIView):
    permission_classes = [IsAdminMasterUserPermission]

    def post(self, request, pk):
        serializer = DecisaoSolicitacaoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            rejeitar_solicitacao(
                solicitacao_id=pk, 
                admin_master_user=request.user, 
                justificativa=serializer.validated_data.get('justificativa', '')
            )
            return Response({"message": "Solicitação rejeitada."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class AdminUsuariosView(APIView):
    permission_classes = [IsAdminMasterUserPermission]

    def get(self, request):
        users = Usuario.objects.all().select_related('unidade').prefetch_related('unidade__grupos_administrados').order_by('first_name')
        perfil = request.query_params.get('perfil')
        unidade = request.query_params.get('unidade')
        if perfil:
            users = users.filter(perfil=perfil)
        if unidade:
            users = users.filter(unidade_id=unidade)
        serializer = UsuarioAdminListSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CriarUsuarioAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            unidade = Unidade.objects.get(id=serializer.validated_data['unidade_id'])
            criar_usuario_admin(
                admin_master_user=request.user,
                nome_completo=serializer.validated_data['nome_completo'],
                email=serializer.validated_data['email'],
                unidade=unidade,
                perfil=serializer.validated_data['perfil'],
                senha_temporaria=serializer.validated_data['senha_temporaria']
            )
            return Response({"message": "Usuário criado com sucesso."}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class AdminUsuarioStatusView(APIView):
    permission_classes = [IsAdminMasterUserPermission]

    def patch(self, request, pk):
        serializer = UsuarioStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            alterar_status_usuario(
                admin_master_user=request.user,
                usuario_id=pk,
                is_active=serializer.validated_data['is_active']
            )
            return Response({"message": "Status atualizado."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AdminUsuarioDetailView(APIView):
    permission_classes = [IsAdminMasterUserPermission]

    def delete(self, request, pk):
        try:
            excluir_usuario(
                admin_master_user=request.user,
                usuario_id=pk
            )
            return Response({"message": "Usuário excluído com sucesso."}, status=status.HTTP_200_OK)
        except Usuario.DoesNotExist:
            return Response({"error": "Usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            msg = e.message if hasattr(e, 'message') else str(e)
            if msg.startswith("['") and msg.endswith("']"):
                msg = msg[2:-2]
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)

