"""
BERTopic App Configuration
"""

from django.apps import AppConfig


class BertopicConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.bertopic'
    verbose_name = 'BERTopic Analysis'
