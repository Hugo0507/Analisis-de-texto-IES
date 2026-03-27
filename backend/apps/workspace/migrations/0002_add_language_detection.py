"""
Add detected_language and language_confidence to WorkspaceDocument.

Allows tracking the detected language of uploaded PDFs and filtering out
documents whose language doesn't match the corpus preprocessing language.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='workspacedocument',
            name='detected_language',
            field=models.CharField(
                blank=True,
                help_text='Código ISO detectado por langdetect (ej: en, es)',
                max_length=10,
                null=True,
                verbose_name='Idioma detectado',
            ),
        ),
        migrations.AddField(
            model_name='workspacedocument',
            name='language_confidence',
            field=models.FloatField(
                default=0.0,
                help_text='Probabilidad de langdetect (0.0 – 1.0)',
                verbose_name='Confianza detección idioma',
            ),
        ),
    ]
