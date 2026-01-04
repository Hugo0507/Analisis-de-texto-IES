"""
Bag of Words URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BagOfWordsViewSet

router = DefaultRouter()
router.register(r'', BagOfWordsViewSet, basename='bag-of-words')

urlpatterns = [
    path('', include(router.urls)),
]
