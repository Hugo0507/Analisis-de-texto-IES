from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('topic_modeling', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='topicmodeling',
            name='model_artifact',
            field=models.FileField(
                blank=True,
                help_text='Modelo de tópicos serializado (joblib) para inferencia sobre nuevos documentos',
                null=True,
                upload_to='artifacts/topic/',
                verbose_name='Artefacto del modelo',
            ),
        ),
        migrations.AddField(
            model_name='topicmodeling',
            name='vectorizer_artifact',
            field=models.FileField(
                blank=True,
                help_text='Vectorizador serializado (joblib) compatible con el modelo de tópicos',
                null=True,
                upload_to='artifacts/topic/',
                verbose_name='Artefacto del vectorizador',
            ),
        ),
    ]
