from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bag_of_words', '0002_remove_tfidf_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='bagofwords',
            name='model_artifact',
            field=models.FileField(
                blank=True,
                help_text='Vectorizador CountVectorizer serializado (joblib) para inferencia sobre nuevos documentos',
                null=True,
                upload_to='artifacts/bow/',
            ),
        ),
    ]
