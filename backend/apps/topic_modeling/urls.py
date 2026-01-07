"""
Topic Modeling URLs

Rutas para la API de Topic Modeling.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TopicModelingViewSet

router = DefaultRouter()
router.register(r'topic-modeling', TopicModelingViewSet, basename='topic-modeling')

urlpatterns = [
    path('', include(router.urls)),
]
