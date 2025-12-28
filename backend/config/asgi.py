"""
ASGI config for Análisis de Transformación Digital project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application

# Set the default settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

# Initialize Django ASGI application early to ensure apps are loaded
django_asgi_app = get_asgi_application()

# Import Channels components after Django is initialized
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from apps.pipeline import routing as pipeline_routing

application = ProtocolTypeRouter({
    # HTTP requests are handled by Django's ASGI application
    "http": django_asgi_app,

    # WebSocket requests are handled by Channels
    "websocket": AuthMiddlewareStack(
        URLRouter(
            pipeline_routing.websocket_urlpatterns
        )
    ),
})
