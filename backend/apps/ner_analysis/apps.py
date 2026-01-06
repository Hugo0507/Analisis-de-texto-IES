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

            # Check if model exists
            try:
                spacy.load('en_core_web_sm')
                logger.info('✅ spaCy model en_core_web_sm already loaded')
            except OSError:
                logger.warning('⬇️  Installing spaCy model en_core_web_sm...')

                import subprocess
                # Install directly via pip with specific wheel URL
                result = subprocess.run(
                    [
                        'pip', 'install', '--no-cache-dir',
                        'https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl'
                    ],
                    capture_output=True,
                    text=True
                )

                if result.returncode == 0:
                    logger.info('✅ spaCy model en_core_web_sm installed successfully')
                else:
                    logger.error(f'❌ Failed to install spaCy model: {result.stderr}')

        except Exception as e:
            logger.error(f'❌ Error initializing spaCy models: {str(e)}')
