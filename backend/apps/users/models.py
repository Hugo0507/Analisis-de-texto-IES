"""
User models for authentication and authorization.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.

    Adds additional fields for the application:
    - name: User's first name
    - surname: User's last name/surname
    - is_active: Whether the user account is active
    - role: User role (Admin or User)
    """

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
