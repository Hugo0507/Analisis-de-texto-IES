"""
Development settings for Análisis de Transformación Digital project.
"""

import os
from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'backend', '*']

# Override database for development (SQLite by default, easier for local dev)
# You can use DATABASE_URL from .env to override this
if os.environ.get('DATABASE_URL'):
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(
            default=os.environ.get('DATABASE_URL'),
            conn_max_age=600
        )
    }
elif os.environ.get('DATABASE_URL', '').startswith('sqlite'):
    # SQLite for local development (no MySQL/PostgreSQL required)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR.parent / 'db.sqlite3',
        }
    }
# else: use MySQL config from base.py

# Cache - use local memory cache in development (no Redis required)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Channel Layers - use in-memory backend for development (no Redis required)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer'
    }
}

# Django Debug Toolbar (opcional)
INSTALLED_APPS += [
    'django_extensions',  # shell_plus, etc.
]

# Logging más verboso en desarrollo
LOGGING['root']['level'] = 'DEBUG'
LOGGING['loggers']['apps']['level'] = 'DEBUG'

# CORS más permisivo en desarrollo
CORS_ALLOW_ALL_ORIGINS = True

# Email backend para desarrollo (imprime en consola)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
