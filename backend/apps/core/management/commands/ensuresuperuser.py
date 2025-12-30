"""
Django management command to ensure a superuser exists.

This command creates a superuser if one doesn't exist, using environment variables
for credentials. Useful for automated deployments where interactive input is not possible.

Environment Variables:
    DJANGO_SUPERUSER_USERNAME: Admin username (default: admin)
    DJANGO_SUPERUSER_EMAIL: Admin email (default: admin@example.com)
    DJANGO_SUPERUSER_PASSWORD: Admin password (required in production)
"""

import logging
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

User = get_user_model()


class Command(BaseCommand):
    help = 'Ensures a superuser exists for Django admin access'

    def handle(self, *args, **options):
        """
        Create superuser if it doesn't exist.

        Uses environment variables:
        - DJANGO_SUPERUSER_USERNAME (default: admin)
        - DJANGO_SUPERUSER_EMAIL (default: admin@example.com)
        - DJANGO_SUPERUSER_PASSWORD (required)
        """
        username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD')

        # Check if superuser already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.SUCCESS(f'✅ Superuser "{username}" already exists')
            )
            logger.info(f'Superuser "{username}" already exists')
            return

        # Require password in production
        if not password:
            self.stdout.write(
                self.style.WARNING(
                    '⚠️  No DJANGO_SUPERUSER_PASSWORD environment variable set. '
                    'Skipping superuser creation.'
                )
            )
            logger.warning('No DJANGO_SUPERUSER_PASSWORD set, skipping superuser creation')
            return

        # Create superuser
        try:
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Successfully created superuser "{username}"\n'
                    f'   Email: {email}\n'
                    f'   You can now login at /admin/'
                )
            )
            logger.info(f'Created superuser: {username} ({email})')
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error creating superuser: {e}')
            )
            logger.exception(f'Failed to create superuser: {e}')
            raise
