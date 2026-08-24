"""
Django settings for PAC UFPI.

Configurações do projeto PAC - Plano Anual de Contratações da UFPI.
"""

from pathlib import Path

from decouple import config
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# =============================================================================
# Segurança
# =============================================================================

SECRET_KEY = config('DJANGO_SECRET_KEY', default=config('SECRET_KEY', default='unsafe-development-key'))
DEBUG = config('DJANGO_DEBUG', default=False, cast=bool)
PAC_ENVIRONMENT = config('PAC_ENVIRONMENT', default='')
ALLOW_HOMOLOGACAO_SEED = config(
    'ALLOW_HOMOLOGACAO_SEED',
    default=False,
    cast=bool,
)
HOMOLOGACAO_SEED_REMOTE_FINGERPRINTS = config(
    'HOMOLOGACAO_SEED_REMOTE_FINGERPRINTS',
    default='',
    cast=lambda value: [
        fingerprint.strip().lower()
        for fingerprint in value.split(',')
        if fingerprint.strip()
    ],
)
ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [s.strip() for s in v.split(',') if s.strip()])
CSRF_TRUSTED_ORIGINS = config('DJANGO_CSRF_TRUSTED_ORIGINS', default='', cast=lambda v: [s.strip() for s in v.split(',') if s.strip()])


# =============================================================================
# Aplicações instaladas
# =============================================================================

INSTALLED_APPS = [
    # Django
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Terceiros
    'rest_framework',
    'corsheaders',
    'django_filters',

    # Apps do PAC
    'apps.core',
    'apps.api',
    'apps.usuarios',
    'apps.unidades',
    'apps.grupos_contratacao',
    'apps.catalogo',
    'apps.demandas',
    'apps.validacoes',
    'apps.dfd',
    'apps.dashboard',
    'apps.auditoria',
]


# =============================================================================
# Middleware
# =============================================================================

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# =============================================================================
# URLs e WSGI
# =============================================================================

ROOT_URLCONF = 'config.urls'

WSGI_APPLICATION = 'config.wsgi.application'


# =============================================================================
# Templates
# =============================================================================

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# =============================================================================
# Banco de dados — PostgreSQL
# =============================================================================

DATABASE_URL = config(
    'DATABASE_URL',
    default='postgres://pac_user:pac_password@localhost:5433/pac_db',
)

DATABASES = {
    'default': dj_database_url.parse(DATABASE_URL)
}


# =============================================================================
# Validação de senhas
# =============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# =============================================================================
# Internacionalização
# =============================================================================

LANGUAGE_CODE = 'pt-br'

TIME_ZONE = 'America/Fortaleza'

USE_I18N = True

USE_TZ = True


# =============================================================================
# Arquivos estáticos
# =============================================================================

STATIC_URL = '/static/'

STATICFILES_DIRS = [BASE_DIR / 'static']

# Em produção, o build do front-end React (Vite) é copiado para
# `frontend_build/` (ver Dockerfile) e servido como estático pelo WhiteNoise.
# O diretório só existe na imagem de produção; localmente é ignorado.
_frontend_build = BASE_DIR / 'frontend_build'
if _frontend_build.exists():
    STATICFILES_DIRS.append(_frontend_build)

STATIC_ROOT = BASE_DIR / 'staticfiles'

WHITENOISE_MANIFEST_STRICT = False

STORAGES = {
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}


# =============================================================================
# Autenticação
# =============================================================================

LOGIN_URL = '/login/'

LOGIN_REDIRECT_URL = '/dashboard/'

LOGOUT_REDIRECT_URL = '/login/'

AUTH_USER_MODEL = 'usuarios.Usuario'

AUTHENTICATION_BACKENDS = [
    'apps.usuarios.backends.SipacAuthBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# =============================================================================
# Integração SIPAC
# =============================================================================

SIPAC_AUTH_ENABLED = config('SIPAC_AUTH_ENABLED', default=False, cast=bool)
SIPAC_API_BASE_URL = config('SIPAC_API_BASE_URL', default='https://sipac.ufpi.br/api')
SIPAC_CLIENT_ID = config('SIPAC_CLIENT_ID', default='')
SIPAC_CLIENT_SECRET = config('SIPAC_CLIENT_SECRET', default='')
SIPAC_TIMEOUT_SECONDS = config('SIPAC_TIMEOUT_SECONDS', default=10, cast=int)



# =============================================================================
# Configurações gerais
# =============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# =============================================================================
# Django Admin — Personalização
# =============================================================================

ADMIN_SITE_HEADER = 'PAC UFPI — Administração'
ADMIN_SITE_TITLE = 'PAC UFPI Admin'
ADMIN_INDEX_TITLE = 'Painel de Administração'


# =============================================================================
# Django REST Framework — API consumida pelo front-end React
# =============================================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
}


# =============================================================================
# CORS — permite que o front-end React (Vite) consuma a API
# =============================================================================

CORS_ALLOWED_ORIGINS = config(
    'DJANGO_CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173',
    cast=lambda v: [s.strip() for s in v.split(',') if s.strip()],
)

# Necessário para o envio do cookie de sessão a partir do front-end.
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = CSRF_TRUSTED_ORIGINS or CORS_ALLOWED_ORIGINS

FRONTEND_URL = config('FRONTEND_URL', default='')
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='')

SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = config('DJANGO_SECURE_SSL_REDIRECT', default=False, cast=bool)
