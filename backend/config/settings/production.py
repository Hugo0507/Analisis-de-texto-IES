"""
Production settings for Análisis de Transformación Digital project.

Security-hardened configuration optimized for deployment.
Last updated: 2025-12-30 - Password validation set to 8 characters minimum
"""

from .base import *

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY') or os.environ.get('SECRET_KEY')

if not SECRET_KEY:
    raise ValueError("DJANGO_SECRET_KEY or SECRET_KEY environment variable must be set in production")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

# Parse ALLOWED_HOSTS with whitespace trimming
allowed_hosts_str = os.environ.get('DJANGO_ALLOWED_HOSTS', '')
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_str.split(',') if host.strip()]

# Always add HF Space hostname (explicit is better than relying on wildcards)
hf_hostname = 'hugo0507-analisis-ies-backend.hf.space'
if hf_hostname not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(hf_hostname)

# Also add with dot prefix for subdomain matching
if '.hf.space' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('.hf.space')

# Log ALLOWED_HOSTS for debugging
print(f"✅ ALLOWED_HOSTS configured: {ALLOWED_HOSTS}")

if not ALLOWED_HOSTS:
    raise ValueError("DJANGO_ALLOWED_HOSTS environment variable must be set in production")

# Database Configuration
# PostgreSQL in production (Render provides DATABASE_URL automatically)
import dj_database_url

# Check if DATABASE_URL is provided (Render, Heroku, etc.)
if os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.config(
            default=os.environ.get('DATABASE_URL'),
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=True
        )
    }
else:
    # Manual configuration fallback
    db_engine = os.environ.get('DB_ENGINE', 'postgresql')

    if db_engine == 'postgresql':
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': os.environ.get('DB_NAME', 'analisis_transformacion_digital'),
                'USER': os.environ.get('DB_USER', 'postgres'),
                'PASSWORD': os.environ.get('DB_PASSWORD', ''),
                'HOST': os.environ.get('DB_HOST', 'localhost'),
                'PORT': os.environ.get('DB_PORT', '5432'),
                'CONN_MAX_AGE': 600,
                'OPTIONS': {
                    'sslmode': 'require',
                },
            }
        }
    elif db_engine == 'mysql':
        # Legacy MySQL support
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.mysql',
                'NAME': os.environ.get('DB_NAME'),
                'USER': os.environ.get('DB_USER'),
                'PASSWORD': os.environ.get('DB_PASSWORD'),
                'HOST': os.environ.get('DB_HOST'),
                'PORT': os.environ.get('DB_PORT', '3306'),
                'OPTIONS': {
                    'charset': 'utf8mb4',
                    'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
                },
                'CONN_MAX_AGE': 600,
            }
        }
    else:
        raise ValueError(f"Unsupported DB_ENGINE: {db_engine}. Use 'postgresql' or 'mysql'")

# Cache Configuration (Redis with fallback to in-memory)
REDIS_URL = os.environ.get('REDIS_URL')

if REDIS_URL:
    # Use Redis if available
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 50,
                    'retry_on_timeout': True,
                },
                'SOCKET_CONNECT_TIMEOUT': 5,
                'SOCKET_TIMEOUT': 5,
            },
            'KEY_PREFIX': 'nlp_analysis',
            'TIMEOUT': 7200,  # 2 horas
        }
    }
else:
    # Fallback to in-memory cache (HF Spaces without Redis)
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'nlp_analysis_cache',
            'TIMEOUT': 7200,
        }
    }

# Channel Layers (WebSocket - Redis with fallback to in-memory)
if REDIS_URL:
    # Use Redis for channel layers if available
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [REDIS_URL],
                'capacity': 1500,
                'expiry': 10,
            },
        },
    }
else:
    # Fallback to in-memory channel layer (HF Spaces without Redis)
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# Static and Media files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR.parent.parent, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR.parent.parent, 'mediafiles')

# Security Settings
SECURE_SSL_REDIRECT = os.environ.get('DJANGO_SECURE_SSL_REDIRECT', 'True') == 'True'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# HSTS (HTTP Strict Transport Security)
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CORS Settings
cors_origins_str = os.environ.get('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins_str.split(',') if origin.strip()]

# Add HF Space URL if not present
hf_space_url = 'https://hugo0507-analisis-ies-backend.hf.space'
if hf_space_url not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(hf_space_url)

CORS_ALLOW_CREDENTIALS = True

# CSRF Trusted Origins
csrf_origins_str = os.environ.get('CSRF_TRUSTED_ORIGINS', '')
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in csrf_origins_str.split(',') if origin.strip()]

# Add HF Space URL if not present
if hf_space_url not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append(hf_space_url)

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)

ADMINS = [
    (name.strip(), email.strip())
    for admin in os.environ.get('DJANGO_ADMINS', '').split(',')
    if admin.strip() and ':' in admin
    for name, email in [admin.split(':', 1)]
]

# Google Drive Configuration
GOOGLE_DRIVE_CREDENTIALS_FILE = os.environ.get(
    'GOOGLE_DRIVE_CREDENTIALS_FILE',
    '/app/credentials/credentials.json'
)
GOOGLE_DRIVE_TOKEN_FILE = os.environ.get(
    'GOOGLE_DRIVE_TOKEN_FILE',
    '/app/credentials/token.json'
)

# Template Caching
# Must disable APP_DIRS when using custom loaders
TEMPLATES[0]['APP_DIRS'] = False
TEMPLATES[0]['OPTIONS']['loaders'] = [
    ('django.template.loaders.cached.Loader', [
        'django.template.loaders.filesystem.Loader',
        'django.template.loaders.app_directories.Loader',
    ]),
]

# Session Configuration
if REDIS_URL:
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
    SESSION_CACHE_ALIAS = 'default'
else:
    # Use database sessions if no Redis
    SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# Password Validation (consistent with base.py)
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

# Sentry Error Monitoring (optional)
SENTRY_DSN = os.environ.get('SENTRY_DSN', '')

if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        environment=os.environ.get('ENVIRONMENT', 'production'),
        traces_sample_rate=0.1,
        send_default_pii=False,
    )

# WhiteNoise for static files
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

print("✅ Production settings loaded successfully")
