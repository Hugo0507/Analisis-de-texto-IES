"""
Django settings for Análisis de Transformación Digital project.
Base settings shared across all environments.
"""

import os
from pathlib import Path
from cryptography.fernet import Fernet

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-change-this-in-production-2024'
)

# Application definition
INSTALLED_APPS = [
    # Django core apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party apps
    'rest_framework',
    'drf_spectacular',
    'corsheaders',
    'django_filters',
    'channels',

    # Custom apps (Clean Architecture)
    'apps.core',
    'apps.users',
    'apps.documents',
    'apps.datasets',
    'apps.data_preparation',
    'apps.bag_of_words',
    'apps.ngram_analysis',
    'apps.tfidf_analysis',
    'apps.ner_analysis',
    'apps.topic_modeling',
    'apps.bertopic',
    'apps.analysis',
    'apps.pipeline',
    'apps.infrastructure',
]

# Try to import simplejwt - if available, add to INSTALLED_APPS
try:
    import rest_framework_simplejwt
    INSTALLED_APPS.insert(INSTALLED_APPS.index('rest_framework') + 1, 'rest_framework_simplejwt')
    print("djangorestframework-simplejwt is installed and loaded")
except ImportError:
    print("WARNING: djangorestframework-simplejwt not found - JWT auth will not be available")

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # CORS - debe ir temprano
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

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

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'analisis_transformacion_digital'),
        'USER': os.environ.get('DB_USER', 'analisis_user'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'analisis_password_2024'),
        'HOST': os.environ.get('DB_HOST', 'mysql'),
        'PORT': os.environ.get('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'"
        }
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'es-es'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# ============================================================
# REST FRAMEWORK
# ============================================================
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DATETIME_FORMAT': '%Y-%m-%d %H:%M:%S',
}

# ============================================================
# DRF SPECTACULAR (OpenAPI/Swagger)
# ============================================================
SPECTACULAR_SETTINGS = {
    'TITLE': 'Análisis de Transformación Digital API',
    'DESCRIPTION': 'API REST para análisis NLP/ML de transformación digital en educación superior',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# ============================================================
# JWT AUTHENTICATION (Simple JWT) - Only if installed
# ============================================================
try:
    from datetime import timedelta
    # rest_framework_simplejwt ya fue importado en línea 46

    # Update authentication classes to include JWT
    REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'] = [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ]
    REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES'] = [
        'rest_framework.permissions.IsAuthenticated',
    ]

    SIMPLE_JWT = {
        'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
        'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
        'ROTATE_REFRESH_TOKENS': True,
        'BLACKLIST_AFTER_ROTATION': False,
        'UPDATE_LAST_LOGIN': True,

        'ALGORITHM': 'HS256',
        'SIGNING_KEY': SECRET_KEY,
        'VERIFYING_KEY': None,

        'AUTH_HEADER_TYPES': ('Bearer',),
        'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
        'USER_ID_FIELD': 'id',
        'USER_ID_CLAIM': 'user_id',

        'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
        'TOKEN_TYPE_CLAIM': 'token_type',
    }
    print("JWT authentication configured")
except ImportError:
    print("JWT authentication not available - using session auth only")

# ============================================================
# CORS HEADERS
# ============================================================
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://analisis-de-texto-ies.vercel.app',
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# ============================================================
# DJANGO CHANNELS (WebSocket)
# ============================================================
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [(
                os.environ.get('REDIS_HOST', 'redis'),
                int(os.environ.get('REDIS_PORT', 6379))
            )],
        },
    },
}

# ============================================================
# REDIS CACHE
# ============================================================
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://redis:6379/0'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'analisis_td',
        'TIMEOUT': 3600,  # 1 hora por defecto
    }
}

# ============================================================
# LOGGING
# ============================================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Crear directorio de logs si no existe
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

# ============================================================
# CELERY (OPTIONAL - for async tasks)
# ============================================================
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://redis:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://redis:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# ============================================================
# GOOGLE DRIVE API (Legacy - to be deprecated)
# ============================================================
GOOGLE_DRIVE_CREDENTIALS_FILE = BASE_DIR.parent / 'credentials.json'
GOOGLE_DRIVE_TOKEN_FILE = BASE_DIR.parent / 'token.json'

# ============================================================
# GOOGLE OAUTH 2.0 (Google Drive User Authentication)
# ============================================================
GOOGLE_OAUTH_CLIENT_ID = os.environ.get('GOOGLE_OAUTH_CLIENT_ID', '')
GOOGLE_OAUTH_CLIENT_SECRET = os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET', '')
GOOGLE_OAUTH_REDIRECT_URI = os.environ.get(
    'GOOGLE_OAUTH_REDIRECT_URI',
    'http://localhost:3000/oauth/callback/google-drive'
)

# Encryption key for storing OAuth tokens securely in database
# IMPORTANT: Generate this key once and store it securely in environment variables
# To generate a new key, run: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
GOOGLE_OAUTH_ENCRYPTION_KEY = os.environ.get(
    'GOOGLE_OAUTH_ENCRYPTION_KEY',
    Fernet.generate_key().decode()  # Auto-generate in development only
)

# ============================================================
# NLP/ML CONFIGURATION
# ============================================================
NLTK_DATA_PATH = BASE_DIR / 'nltk_data'
SPACY_MODEL = 'en_core_web_sm'

# Stopwords globales (200+ palabras)
GLOBAL_STOPWORDS_FILE = BASE_DIR / 'data' / 'global_stopwords.txt'

# ============================================================
# PIPELINE CONFIGURATION
# ============================================================
PIPELINE_CACHE_TTL = 3600  # 1 hora
PIPELINE_MAX_WORKERS = 4
PIPELINE_TIMEOUT = 1800  # 30 minutos
