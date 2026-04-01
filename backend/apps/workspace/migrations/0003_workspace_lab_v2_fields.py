from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspace', '0002_add_language_detection'),
    ]

    operations = [
        migrations.AddField(
            model_name='workspace',
            name='ner_id',
            field=models.IntegerField(blank=True, null=True, verbose_name='NER de referencia'),
        ),
        migrations.AddField(
            model_name='workspace',
            name='bertopic_id',
            field=models.IntegerField(blank=True, null=True, verbose_name='BERTopic de referencia'),
        ),
        migrations.AddField(
            model_name='workspace',
            name='custom_stopwords',
            field=models.JSONField(
                blank=True,
                default=list,
                verbose_name='Stopwords personalizadas',
                help_text='Lista de palabras adicionales a excluir durante el preprocesamiento',
            ),
        ),
        migrations.AddField(
            model_name='workspace',
            name='inference_params',
            field=models.JSONField(
                blank=True,
                default=dict,
                verbose_name='Parámetros de inferencia',
                help_text='Parámetros configurables: num_top_terms, strip_references, min_word_length, ner_entity_types',
            ),
        ),
    ]
