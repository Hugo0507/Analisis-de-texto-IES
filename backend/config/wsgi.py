"""
WSGI config for Análisis de Transformación Digital project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os
import logging

from django.core.wsgi import get_wsgi_application

logger = logging.getLogger(__name__)

# Usar settings.production en producción (detectado por DJANGO_SETTINGS_MODULE env var)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

application = get_wsgi_application()

# Crear superusuario automáticamente si no existe
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()

    # Admin principal desde variables de entorno
    username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
    email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
    password = os.getenv('DJANGO_SUPERUSER_PASSWORD')

    if password and not User.objects.filter(username=username).exists():
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        logger.info(f'✅ Superuser "{username}" created successfully via WSGI')
        print(f'✅ Superuser "{username}" created successfully')
    elif User.objects.filter(username=username).exists():
        logger.info(f'✅ Superuser "{username}" already exists')

    # Admin de respaldo (hardcoded) en caso de problemas con variables de entorno
    backup_username = 'hugoadmin'
    backup_email = 'hugomondragon0821@gmail.com'
    backup_password = 'Admin2026'  # Password simple sin caracteres especiales

    if not User.objects.filter(username=backup_username).exists():
        User.objects.create_superuser(
            username=backup_username,
            email=backup_email,
            password=backup_password
        )
        logger.info(f'✅ Backup admin "{backup_username}" created successfully')
        print(f'✅ Backup admin "{backup_username}" created (user: hugoadmin, pass: Admin2026)')

except Exception as e:
    logger.exception(f'❌ Error creating superuser via WSGI: {e}')
    # Don't raise - allow application to start even if superuser creation fails
