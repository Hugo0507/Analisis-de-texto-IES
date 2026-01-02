"""
Data Preparation URLs

Configuración de rutas para preparación de datos.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DataPreparationViewSet

# Router para endpoints REST
router = DefaultRouter()
router.register(r'data-preparation', DataPreparationViewSet, basename='data-preparation')

urlpatterns = [
    path('', include(router.urls)),
]
