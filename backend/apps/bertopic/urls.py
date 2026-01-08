"""
BERTopic URLs

URLs para la API de BERTopic.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BERTopicViewSet

router = DefaultRouter()
router.register(r'bertopic', BERTopicViewSet, basename='bertopic')

urlpatterns = [
    path('', include(router.urls)),
]
