"""
TF-IDF Analysis URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TfIdfAnalysisViewSet

router = DefaultRouter()
router.register(r'tfidf-analysis', TfIdfAnalysisViewSet, basename='tfidf-analysis')

urlpatterns = [
    path('', include(router.urls)),
]
