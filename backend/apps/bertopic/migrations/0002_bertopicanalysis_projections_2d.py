from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bertopic', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='bertopicanalysis',
            name='projections_2d',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Coordenadas PCA, t-SNE y UMAP por documento para visualización',
                verbose_name='Proyecciones 2D',
            ),
        ),
    ]
