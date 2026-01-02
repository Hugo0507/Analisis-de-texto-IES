"""
Data Preparation App Configuration
"""

from django.apps import AppConfig


class DataPreparationConfig(AppConfig):
    """Configuration for Data Preparation app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.data_preparation'
    verbose_name = 'Preparación de Datos'

    def ready(self):
        """Import signal handlers."""
        pass
