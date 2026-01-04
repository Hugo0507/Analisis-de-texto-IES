"""
Ngram Analysis URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NgramAnalysisViewSet

router = DefaultRouter()
router.register(r'', NgramAnalysisViewSet, basename='ngram-analysis')

urlpatterns = [
    path('', include(router.urls)),
]
