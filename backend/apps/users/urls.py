"""
URL configuration for Users app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import CustomTokenObtainPairView, UserViewSet
from .oauth_views import GoogleDriveOAuthViewSet

# Create router for ViewSets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'oauth/google-drive', GoogleDriveOAuthViewSet, basename='google-drive-oauth')

urlpatterns = [
    # JWT Authentication endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # User CRUD endpoints
    path('', include(router.urls)),
]
