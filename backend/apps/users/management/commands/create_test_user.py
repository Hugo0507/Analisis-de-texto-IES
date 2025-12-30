"""
Django management command to create a test user for development.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates a test user for development and testing'

    def handle(self, *args, **options):
        """Create test user if it doesn't exist."""

        # Test user credentials
        username = 'testuser'
        email = 'test@analisis-ies.com'
        password = 'Test2024!'
        name = 'Usuario'
        surname = 'de Prueba'

        # Check if user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'Test user "{username}" already exists.')
            )
            return

        # Create test user
        user = User.objects.create(
            username=username,
            email=email,
            name=name,
            surname=surname,
            role='admin',
            is_active=True,
            is_staff=True,
        )
        user.set_password(password)
        user.save()

        self.stdout.write(
            self.style.SUCCESS(
                f'\n'
                f'✓ Test user created successfully!\n'
                f'  Username: {username}\n'
                f'  Email: {email}\n'
                f'  Password: {password}\n'
                f'  Role: admin\n'
            )
        )
