"""
TF-IDF Analysis App Configuration
"""

from django.apps import AppConfig


class TfidfAnalysisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.tfidf_analysis'
    verbose_name = 'Análisis TF-IDF'
