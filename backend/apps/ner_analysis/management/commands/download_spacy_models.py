"""
Management command to download spaCy models if not already installed.
"""

import logging
from django.core.management.base import BaseCommand
import spacy

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Download spaCy models for NER analysis if not already installed'

    def handle(self, *args, **options):
        models = ['en_core_web_sm']

        for model_name in models:
            self.stdout.write(f'📦 Checking spaCy model: {model_name}')

            try:
                # Try to load the model
                spacy.load(model_name)
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Model {model_name} already installed')
                )
            except OSError:
                # Model not found, download it
                self.stdout.write(
                    self.style.WARNING(f'⬇️  Downloading model {model_name}...')
                )

                try:
                    import subprocess
                    result = subprocess.run(
                        ['python', '-m', 'spacy', 'download', model_name],
                        capture_output=True,
                        text=True,
                        check=True
                    )

                    self.stdout.write(
                        self.style.SUCCESS(f'✅ Model {model_name} downloaded successfully')
                    )
                    logger.info(f'spaCy model {model_name} downloaded successfully')

                except subprocess.CalledProcessError as e:
                    self.stdout.write(
                        self.style.ERROR(f'❌ Failed to download {model_name}: {e.stderr}')
                    )
                    logger.error(f'Failed to download spaCy model {model_name}: {e.stderr}')
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'❌ Error downloading {model_name}: {str(e)}')
                    )
                    logger.error(f'Error downloading spaCy model {model_name}: {str(e)}')

        self.stdout.write(self.style.SUCCESS('✅ spaCy models check completed'))
