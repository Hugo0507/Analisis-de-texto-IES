"""
Migration: expand bib_source_db choices to include ScienceDirect, SAGE,
Taylor & Francis, Springer, Wiley, IEEE, ACM.

Choices are only metadata in Django (no DB schema change).
This migration keeps makemigrations clean.
"""

from django.db import migrations, models


SOURCE_DB_CHOICES = [
    ('scopus', 'Scopus'),
    ('wos', 'Web of Science'),
    ('sciencedirect', 'ScienceDirect / Elsevier'),
    ('sage', 'SAGE Journals'),
    ('taylor_francis', 'Taylor & Francis'),
    ('springer', 'Springer / SpringerLink'),
    ('wiley', 'Wiley Online Library'),
    ('ieee', 'IEEE Xplore'),
    ('acm', 'ACM Digital Library'),
    ('redalyc', 'Redalyc'),
    ('scielo', 'SciELO'),
    ('dialnet', 'Dialnet'),
    ('eric', 'ERIC'),
    ('pubmed', 'PubMed'),
    ('google_scholar', 'Google Scholar'),
    ('semantic_scholar', 'Semantic Scholar'),
    ('other', 'Otra'),
]


class Migration(migrations.Migration):

    dependencies = [
        ('datasets', '0003_dataset_prisma_datasetfile_bib_metadata'),
    ]

    operations = [
        migrations.AlterField(
            model_name='datasetfile',
            name='bib_source_db',
            field=models.CharField(
                blank=True,
                choices=SOURCE_DB_CHOICES,
                help_text='Base de datos bibliográfica de origen',
                max_length=50,
                null=True,
            ),
        ),
    ]
