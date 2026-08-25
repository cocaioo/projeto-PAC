"""
Backends de autenticação para o PAC UFPI.

Inclui autenticação integrada via SIPAC com provisionamento automático de usuários
e fallback transparente para autenticação local (ModelBackend).
"""

import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db import models

from .sipac import SipacClient

Usuario = get_user_model()
logger = logging.getLogger(__name__)


class SipacAuthBackend(ModelBackend):
    """
    Backend de autenticação via API do SIPAC.

    - Se settings.SIPAC_AUTH_ENABLED for True, tenta autenticar via SipacClient
      e provisiona/atualiza o Usuario vinculando SIAPE, nome, email e unidade.
    - Faz fallback transparente para super().authenticate() (ModelBackend) se
      SIPAC estiver desativado ou se a autenticação no SIPAC falhar.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None

        sipac_enabled = getattr(settings, "SIPAC_AUTH_ENABLED", False)

        if sipac_enabled:
            client = SipacClient()
            try:
                dados_sipac = client.autenticar_e_obter_dados(username, password)
            except Exception as exc:
                logger.error("Erro inesperado ao consultar SIPAC: %s", exc)
                dados_sipac = None

            if dados_sipac:
                user = self._provisionar_ou_atualizar_usuario(username, dados_sipac, password=password)
                if user and self.user_can_authenticate(user):
                    return user

        # Fallback transparente para o backend local (ModelBackend) com suporte a email ou username
        user = Usuario.objects.filter(
            models.Q(username__iexact=username) | models.Q(email__iexact=username)
        ).first()
        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user

        return super().authenticate(request, username=username, password=password, **kwargs)

    def _provisionar_ou_atualizar_usuario(self, username, dados_sipac, password=None):
        """
        Localiza ou cria o registro de Usuario com base nos dados retornados pelo SIPAC.
        """
        siape = str(dados_sipac.get("siape") or username).strip()
        email = str(dados_sipac.get("email") or f"{username}@ufpi.edu.br").strip()

        nome = str(dados_sipac.get("nome") or "").strip()
        first_name = str(dados_sipac.get("first_name") or "").strip()
        last_name = str(dados_sipac.get("last_name") or "").strip()
        if nome and not first_name:
            partes = nome.split(" ", 1)
            first_name = partes[0]
            last_name = partes[1] if len(partes) > 1 else ""

        # Unidade
        unidade_obj = None
        codigo_unidade = (
            dados_sipac.get("codigo_unidade")
            or (dados_sipac.get("unidade") or {}).get("codigo")
        )
        nome_unidade = (
            dados_sipac.get("nome_unidade")
            or (dados_sipac.get("unidade") or {}).get("nome")
        )
        sigla_unidade = (
            dados_sipac.get("sigla_unidade")
            or (dados_sipac.get("unidade") or {}).get("sigla")
        )

        if codigo_unidade:
            client = SipacClient()
            unidade_obj = client.sincronizar_unidade(
                codigo_unidade=codigo_unidade,
                nome_unidade=nome_unidade,
                sigla_unidade=sigla_unidade,
            )

        # Busca por username, siape ou email
        user = Usuario.objects.filter(username=username).first()
        if not user and siape:
            user = Usuario.objects.filter(siape=siape).first()
        if not user and email:
            user = Usuario.objects.filter(email=email).first()

        if user:
            user.username = username
            if first_name:
                user.first_name = first_name
            if last_name:
                user.last_name = last_name
            if email:
                user.email = email
            if siape:
                user.siape = siape
            if unidade_obj:
                user.unidade = unidade_obj
            user.is_active = True
            if password:
                user.set_password(password)
            user.save()
            return user

        # Cria novo usuário provisionado pelo SIPAC
        user = Usuario(
            username=username,
            email=email,
            siape=siape,
            first_name=first_name or username,
            last_name=last_name,
            unidade=unidade_obj,
            is_active=True,
        )
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user
