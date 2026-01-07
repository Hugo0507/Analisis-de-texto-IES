"""
NER Analysis App Configuration
"""

from django.apps import AppConfig


class NerAnalysisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ner_analysis'
    verbose_name = 'NER Analysis'

    def ready(self):
        """
        Initialize app - download spaCy models if needed.
        Only runs once when Django starts.
        """
        import os
        import logging

        logger = logging.getLogger(__name__)

        # Only run in main process (not in management commands or migrations)
        if os.environ.get('RUN_MAIN') != 'true' and not any(
            arg in os.sys.argv for arg in ['makemigrations', 'migrate', 'shell', 'test']
        ):
            return

        try:
            import spacy
            import subprocess

            # Modelos spaCy a verificar e instalar
            models = [
                {
                    'name': 'en_core_web_sm',
                    'version': '3.7.1',
                    'url': 'https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl'
                },
                {
                    'name': 'en_core_web_md',
                    'version': '3.7.1',
                    'url': 'https://github.com/explosion/spacy-models/releases/download/en_core_web_md-3.7.1/en_core_web_md-3.7.1-py3-none-any.whl'
                },
                {
                    'name': 'en_core_web_lg',
                    'version': '3.7.1',
                    'url': 'https://github.com/explosion/spacy-models/releases/download/en_core_web_lg-3.7.1/en_core_web_lg-3.7.1-py3-none-any.whl'
                },
                {
                    'name': 'en_core_web_trf',
                    'version': '3.7.3',
                    'url': 'https://github.com/explosion/spacy-models/releases/download/en_core_web_trf-3.7.3/en_core_web_trf-3.7.3-py3-none-any.whl'
                }
            ]

            # Verificar e instalar cada modelo
            for model in models:
                try:
                    spacy.load(model['name'])
                    logger.info(f"[OK] spaCy model {model['name']} already loaded")
                except OSError:
                    logger.warning(f"[INSTALL] Installing spaCy model {model['name']}...")

                    # Install directly via pip with specific wheel URL
                    result = subprocess.run(
                        ['pip', 'install', '--no-cache-dir', model['url']],
                        capture_output=True,
                        text=True
                    )

                    if result.returncode == 0:
                        logger.info(f"[OK] spaCy model {model['name']} installed successfully")
                    else:
                        logger.error(f"[ERROR] Failed to install {model['name']}: {result.stderr}")

        except Exception as e:
            logger.error(f'[ERROR] Error initializing spaCy models: {str(e)}')
