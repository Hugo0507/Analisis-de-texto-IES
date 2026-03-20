from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tfidf_analysis', '0002_remove_tfidf_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='tfidfanalysis',
            name='vectorizer_artifact',
            field=models.FileField(
                blank=True,
                help_text='TfidfVectorizer serializado (joblib) con IDF del corpus para inferencia',
                null=True,
                upload_to='artifacts/tfidf/',
                verbose_name='Artefacto del vectorizador',
            ),
        ),
    ]
