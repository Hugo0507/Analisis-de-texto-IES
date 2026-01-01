"""
Django management command to ensure test user exists.

This command creates or verifies the existence of the test user
with username 'testuser' and password 'Test2024!'
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.users.models import User


class Command(BaseCommand):
    help = 'Ensure test user exists with username testuser and password Test2024!'

    def handle(self, *args, **options):
        """Create or verify test user."""

        username = 'testuser'
        password = 'Test2024!'
        email = 'testuser@example.com'

        try:
            with transaction.atomic():
                # Check if user exists
                user, created = User.objects.get_or_create(
                    username=username,
                    defaults={
                        'email': email,
                        'name': 'Test',
                        'surname': 'User',
                        'role': 'admin',
                        'is_active': True,
                        'is_staff': True,
                        'is_superuser': False,
                    }
                )

                if created:
                    # Set password for new user
                    user.set_password(password)
                    user.save()

                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✅ Test user created successfully!'
                        )
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   Username: {username}'
                        )
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   Password: {password}'
                        )
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   Email: {email}'
                        )
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   Role: admin'
                        )
                    )
                else:
                    # User already exists - update password to ensure it's correct
                    user.set_password(password)
                    user.role = 'admin'
                    user.is_active = True
                    user.save()

                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✅ Test user already exists - password verified/updated'
                        )
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   Username: {username}'
                        )
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   Password: {password}'
                        )
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   Email: {user.email}'
                        )
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'   Role: {user.role}'
                        )
                    )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error ensuring test user: {e}')
            )
            raise
