"""
URL configuration for Pipeline app.

Exposes Pipeline ViewSet endpoints:
- POST /execute/ - Execute complete pipeline (14 stages)
- GET /status/{execution_id}/ - Get execution status with progress
- GET /history/ - Get pipeline execution history
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PipelineViewSet

router = DefaultRouter()
router.register(r'', PipelineViewSet, basename='pipeline')

urlpatterns = [
    path('', include(router.urls)),
]
