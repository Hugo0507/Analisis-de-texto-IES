"""
User models for authentication and authorization.
"""

from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class CustomUserManager(UserManager):
    """
    Manager de usuarios que mantiene coherentes `role` e `is_superuser`.

    `create_superuser` de Django solo activa is_staff e is_superuser, asi que
    todo superusuario nacia con el `role` por defecto, 'user'. La propiedad
    is_admin lo seguia considerando administrador -mira is_superuser-, pero la
    ficha del usuario decia "Usuario". Esa contradiccion fue justo la que hizo
    que la cuenta admin fuese rechazada por unas pantallas y aceptada por otras.
    """

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.

    Adds additional fields for the application:
    - name: User's first name
    - surname: User's last name/surname
    - is_active: Whether the user account is active
    - role: User role (Admin or User)
    """

    objects = CustomUserManager()

    ROLE_CHOICES = [
        ('admin', 'Administrador'),
        ('user', 'Usuario'),
    ]

    # Override first_name and last_name with custom fields
    name = models.CharField('Nombre', max_length=150, blank=True)
    surname = models.CharField('Apellido', max_length=150, blank=True)

    # Role field
    role = models.CharField(
        'Rol',
        max_length=20,
        choices=ROLE_CHOICES,
        default='user'
    )

    # Email is required
    email = models.EmailField('Correo electrónico', unique=True)

    # Override is_active to have a default
    is_active = models.BooleanField('Activo', default=True)

    # Timestamps
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)

    # Google Drive OAuth fields
    google_drive_connected = models.BooleanField(
        'Conectado a Google Drive',
        default=False,
        help_text='Indica si el usuario ha conectado su cuenta de Google Drive'
    )
    google_drive_email = models.EmailField(
        'Email de Google Drive',
        blank=True,
        null=True,
        help_text='Email de la cuenta de Google Drive conectada'
    )
    google_drive_access_token = models.TextField(
        'Token de Acceso de Google Drive',
        blank=True,
        null=True,
        help_text='Token de acceso encriptado para Google Drive API'
    )
    google_drive_refresh_token = models.TextField(
        'Token de Refresco de Google Drive',
        blank=True,
        null=True,
        help_text='Token de refresco encriptado para renovar el access token'
    )
    google_drive_token_expires_at = models.DateTimeField(
        'Expiración del Token',
        blank=True,
        null=True,
        help_text='Fecha y hora de expiración del access token'
    )
    google_drive_scopes = models.TextField(
        'Scopes de Google Drive',
        blank=True,
        null=True,
        help_text='Permisos otorgados (JSON array)'
    )
    google_drive_connected_at = models.DateTimeField(
        'Fecha de Conexión a Google Drive',
        blank=True,
        null=True,
        help_text='Fecha y hora en que se conectó la cuenta de Google Drive'
    )
    google_drive_oauth_state = models.CharField(
        'OAuth State Temporal',
        max_length=64,
        blank=True,
        null=True,
        help_text='Parámetro state temporal para protección CSRF en OAuth (se limpia después de usar)'
    )

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-created_at']

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        """Return the user's full name."""
        return f"{self.name} {self.surname}".strip() or self.username

    @property
    def is_admin(self):
        """Check if user is an admin."""
        return self.role == 'admin' or self.is_superuser
