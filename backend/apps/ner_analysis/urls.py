"""
NER Analysis URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NerAnalysisViewSet

router = DefaultRouter()
router.register(r'ner-analysis', NerAnalysisViewSet, basename='ner-analysis')

urlpatterns = [
    path('', include(router.urls)),
]
