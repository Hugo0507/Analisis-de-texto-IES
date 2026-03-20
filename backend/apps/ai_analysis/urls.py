"""
URL configuration for AI Analysis app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AIAnalysisConfigViewSet,
    AIAnalysisResultViewSet,
    AIComparisonViewSet,
)

router = DefaultRouter()
router.register(r'configs', AIAnalysisConfigViewSet, basename='ai-config')
router.register(r'results', AIAnalysisResultViewSet, basename='ai-result')
router.register(r'comparisons', AIComparisonViewSet, basename='ai-comparison')

urlpatterns = [
    path('', include(router.urls)),
]
