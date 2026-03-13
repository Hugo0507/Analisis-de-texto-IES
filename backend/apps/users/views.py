"""
Views for User management.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
)

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer to include user data in response."""

    def validate(self, attrs):
        data = super().validate(attrs)

        # Add user data to response
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'name': self.user.name,
            'surname': self.user.surname,
            'full_name': self.user.full_name,
            'role': self.user.role,
            'is_admin': self.user.is_admin,
        }

        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom JWT login view with rate limiting to prevent brute-force attacks."""

    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User CRUD operations.

    Endpoints:
    - GET /api/v1/users/ - List all users
    - POST /api/v1/users/ - Create a new user
    - GET /api/v1/users/{id}/ - Get user detail
    - PUT /api/v1/users/{id}/ - Update user
    - PATCH /api/v1/users/{id}/ - Partial update user
    - DELETE /api/v1/users/{id}/ - Delete user
    - POST /api/v1/users/{id}/change-password/ - Change user password
    """

    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        """
        Allow any user to create an account (registration).
        All other operations require authentication.
        """
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'], url_path='change-password')
    def change_password(self, request, pk=None):
        """
        Change user password.

        POST /api/v1/users/{id}/change-password/
        {
            "old_password": "current_password",
            "new_password": "new_password",
            "new_password_confirm": "new_password"
        }
        """
        user = self.get_object()

        # Only allow users to change their own password or admins to change any
        if user != request.user and not request.user.is_admin:
            return Response(
                {'detail': 'No tienes permiso para cambiar esta contraseña.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response({
                'detail': 'Contraseña actualizada exitosamente.'
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """
        Get current authenticated user information.

        GET /api/v1/users/me/
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
