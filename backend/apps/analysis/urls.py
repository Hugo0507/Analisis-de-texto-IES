"""
URL configuration for Analysis app.

Exposes Analysis ViewSets:

Factor Analysis Endpoints:
- POST /factors/analyze/ - Analyze factors
- GET /factors/{document_id}/ - Get factors for document
- GET /factors/statistics/ - Get global factor statistics
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FactorAnalysisViewSet,
    FactorCRUDViewSet,
    FactorRunViewSet,
    DatasetFileExportViewSet,
)

router = DefaultRouter()
router.register(r'factors', FactorAnalysisViewSet, basename='factors')
router.register(r'factors-catalog', FactorCRUDViewSet, basename='factors-catalog')
router.register(r'factor-runs', FactorRunViewSet, basename='factor-runs')
router.register(r'dataset-export', DatasetFileExportViewSet, basename='dataset-export')

urlpatterns = [
    path('', include(router.urls)),
]
