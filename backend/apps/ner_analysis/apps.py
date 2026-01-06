"""
NER Analysis App Configuration
"""

from django.apps import AppConfig


class NerAnalysisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ner_analysis'
    verbose_name = 'NER Analysis'
