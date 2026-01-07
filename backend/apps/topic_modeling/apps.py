"""
Topic Modeling App Configuration
"""

from django.apps import AppConfig


class TopicModelingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.topic_modeling'
    verbose_name = 'Topic Modeling'
