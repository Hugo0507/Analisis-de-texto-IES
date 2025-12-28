"""
WebSocket routing for Pipeline app.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/pipeline/(?P<execution_id>[0-9a-f-]+)/$', consumers.PipelineConsumer.as_asgi()),
]
