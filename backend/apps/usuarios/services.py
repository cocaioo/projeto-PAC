import re
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ValidationError
from django.contrib.auth.hashers import make_password
from django.utils.text import slugify

from apps.usuarios.models import Usuario, SolicitacaoAcesso, StatusSolicitacao, Perfil
from apps.auditoria.models import LogAuditoria
from apps.usuarios.services_email import enviar_email_aprovacao, enviar_email_rejeicao

def registrar_log(usuario, acao, modelo, objeto_id, dados_novos):
    LogAuditoria.objects.create(
        usuario=usuario,
        acao=acao,
        modelo=modelo,
        objeto_id=objeto_id,
        dados_novos=dados_novos
    )



def validar_email_institucional(email):
    dominio_permitido = getattr(settings, 'INSTITUTIONAL_EMAIL_DOMAIN', '@ufpi.edu.br')
    if not email.endswith(dominio_permitido):
        raise ValidationError(f"O e-mail deve pertencer ao domínio {dominio_permitido}")

def solicitar_acesso(nome_completo, email, unidade, senha):
    validar_email_institucional(email)
    
    if SolicitacaoAcesso.objects.filter(email=email, status=StatusSolicitacao.PENDENTE).exists():
        raise ValidationError("Já existe uma solicitação pendente para este e-mail.")
    
    if Usuario.objects.filter(email=email).exists():
        raise ValidationError("Já existe um usuário com este e-mail.")
        
    senha_hash = make_password(senha)
    
    solicitacao = SolicitacaoAcesso.objects.create(
        nome_completo=nome_completo,
        email=email,
        unidade=unidade,
        senha_hash=senha_hash,
        status=StatusSolicitacao.PENDENTE
    )
    
    registrar_log(
        usuario=None,
        acao="SOLICITACAO_ACESSO",
        modelo="SolicitacaoAcesso",
        objeto_id=solicitacao.id,
        dados_novos={'email': email, 'nome': nome_completo}
    )
    
    return solicitacao


@transaction.atomic
def aprovar_solicitacao(solicitacao_id, admin_master_user):
    solicitacao = SolicitacaoAcesso.objects.select_for_update().get(id=solicitacao_id)
    
    if solicitacao.status != StatusSolicitacao.PENDENTE:
        raise ValidationError("Apenas solicitações pendentes podem ser aprovadas.")
        
    username = solicitacao.email.split('@')[0]
    base_username = slugify(username)
    username = base_username
    counter = 1
    while Usuario.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1
        
    usuario = Usuario.objects.create(
        username=username,
        first_name=solicitacao.nome_completo,
        email=solicitacao.email,
        password=solicitacao.senha_hash,
        unidade=solicitacao.unidade,
        perfil=Perfil.USUARIO,
        is_active=True
    )
    
    solicitacao.status = StatusSolicitacao.APROVADO
    solicitacao.analisado_por = admin_master_user
    solicitacao.analisado_em = timezone.now()
    solicitacao.usuario_criado = usuario
    solicitacao.save()
    
    registrar_log(
        usuario=admin_master_user,
        acao="APROVACAO_SOLICITACAO",
        modelo="SolicitacaoAcesso",
        objeto_id=solicitacao.id,
        dados_novos={'status': StatusSolicitacao.APROVADO}
    )
    
    registrar_log(
        usuario=admin_master_user,
        acao="CRIACAO_USUARIO",
        modelo="Usuario",
        objeto_id=usuario.id,
        dados_novos={'email': usuario.email, 'perfil': usuario.perfil}
    )
    
    enviar_email_aprovacao(solicitacao, usuario)
    return usuario


@transaction.atomic
def rejeitar_solicitacao(solicitacao_id, admin_master_user, justificativa=""):
    solicitacao = SolicitacaoAcesso.objects.select_for_update().get(id=solicitacao_id)
    
    if solicitacao.status != StatusSolicitacao.PENDENTE:
        raise ValidationError("Apenas solicitações pendentes podem ser rejeitadas.")
        
    solicitacao.status = StatusSolicitacao.REJEITADO
    solicitacao.justificativa_rejeicao = justificativa
    solicitacao.analisado_por = admin_master_user
    solicitacao.analisado_em = timezone.now()
    solicitacao.save()
    
    registrar_log(
        usuario=admin_master_user,
        acao="REJEICAO_SOLICITACAO",
        modelo="SolicitacaoAcesso",
        objeto_id=solicitacao.id,
        dados_novos={'status': StatusSolicitacao.REJEITADO, 'justificativa': justificativa}
    )
    
    enviar_email_rejeicao(solicitacao, justificativa)
    return solicitacao


@transaction.atomic
def criar_usuario_admin(admin_master_user, nome_completo, email, unidade, perfil, senha_temporaria, grupos_ids=None):
    if perfil not in [Perfil.USUARIO, Perfil.ADMIN, Perfil.ADMIN_MASTER]:
        raise ValidationError("Perfil inválido.")
        
    username = email.split('@')[0]
    base_username = slugify(username)
    username = base_username
    counter = 1
    while Usuario.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1
        
    usuario = Usuario.objects.create(
        username=username,
        first_name=nome_completo,
        email=email,
        unidade=unidade,
        perfil=perfil,
        precisa_trocar_senha=True,
        is_active=True
    )
    usuario.set_password(senha_temporaria)
    usuario.save()
    
    registrar_log(
        usuario=admin_master_user,
        acao="CRIACAO_USUARIO_ADMIN",
        modelo="Usuario",
        objeto_id=usuario.id,
        dados_novos={'email': email, 'perfil': perfil}
    )
    
    return usuario


@transaction.atomic
def alterar_status_usuario(admin_master_user, usuario_id, is_active):
    usuario = Usuario.objects.get(id=usuario_id)
    
    if usuario.perfil == Perfil.ADMIN_MASTER and not is_active:
        ativos_count = Usuario.objects.filter(perfil=Perfil.ADMIN_MASTER, is_active=True).exclude(id=usuario.id).count()
        if ativos_count == 0:
            raise ValidationError("Não é possível desativar o último admin master do sistema.")
            
    usuario.is_active = is_active
    usuario.save()
    
    registrar_log(
        usuario=admin_master_user,
        acao="ALTERACAO_STATUS_USUARIO",
        modelo="Usuario",
        objeto_id=usuario.id,
        dados_novos={'is_active': is_active}
    )
    
    return usuario
