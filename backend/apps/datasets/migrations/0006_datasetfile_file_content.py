from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('datasets', '0005_fix_bow_tfidf_fk_to_datasetfile'),
    ]

    operations = [
        migrations.AddField(
            model_name='datasetfile',
            name='file_content',
            field=models.BinaryField(blank=True, editable=False, null=True),
        ),
    ]
