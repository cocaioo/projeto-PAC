import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

def enviar_email_aprovacao(solicitacao, usuario):
    try:
        assunto = "Sua solicitação de acesso foi aprovada"
        mensagem = (
            f"Olá {solicitacao.nome_completo},\n\n"
            f"Sua solicitação de acesso ao sistema PAC foi aprovada.\n"
            f"Você já pode acessar o sistema utilizando seu e-mail ({solicitacao.email}) "
            f"e a senha cadastrada no momento da solicitação.\n\n"
            f"Atenciosamente,\nEquipe PAC."
        )
        send_mail(
            subject=assunto,
            message=mensagem,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[solicitacao.email],
            fail_silently=True,
        )
    except Exception as e:
        logger.error(f"Erro ao enviar e-mail de aprovação para {solicitacao.email}: {e}")

def enviar_email_rejeicao(solicitacao, justificativa):
    try:
        assunto = "Sua solicitação de acesso foi rejeitada"
        mensagem = (
            f"Olá {solicitacao.nome_completo},\n\n"
            f"Infelizmente, sua solicitação de acesso ao sistema PAC foi rejeitada.\n"
            f"Justificativa:\n{justificativa}\n\n"
            f"Atenciosamente,\nEquipe PAC."
        )
        send_mail(
            subject=assunto,
            message=mensagem,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[solicitacao.email],
            fail_silently=True,
        )
    except Exception as e:
        logger.error(f"Erro ao enviar e-mail de rejeição para {solicitacao.email}: {e}")
