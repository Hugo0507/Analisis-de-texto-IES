"""
Bag of Words App Configuration
"""

from django.apps import AppConfig


class BagOfWordsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.bag_of_words'
    verbose_name = 'Bag of Words'
