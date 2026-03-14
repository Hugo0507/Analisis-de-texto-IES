"""
Migration: Add bibliographic metadata and PRISMA protocol fields.

- Dataset: search_strategy, inclusion_criteria, exclusion_criteria, database_sources
- DatasetFile: bib_title, bib_authors, bib_year, bib_journal, bib_doi, bib_abstract,
               bib_keywords, bib_source_db, bib_volume, bib_issue, bib_pages,
               inclusion_status, exclusion_reason
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('datasets', '0002_datasetfile_directory_name_and_more'),
    ]

    operations = [
        # ── Dataset: PRISMA / search protocol fields ──────────────────────────
        migrations.AddField(
            model_name='dataset',
            name='search_strategy',
            field=models.TextField(
                blank=True, null=True,
                help_text='Descripción de la estrategia de búsqueda (ecuación, bases de datos, fechas)'
            ),
        ),
        migrations.AddField(
            model_name='dataset',
            name='inclusion_criteria',
            field=models.TextField(
                blank=True, null=True,
                help_text='Criterios de inclusión del corpus (uno por línea)'
            ),
        ),
        migrations.AddField(
            model_name='dataset',
            name='exclusion_criteria',
            field=models.TextField(
                blank=True, null=True,
                help_text='Criterios de exclusión del corpus (uno por línea)'
            ),
        ),
        migrations.AddField(
            model_name='dataset',
            name='database_sources',
            field=models.CharField(
                max_length=500, blank=True, null=True,
                help_text='Bases de datos consultadas separadas por coma (ej: Scopus, WoS, Redalyc)'
            ),
        ),

        # ── DatasetFile: Bibliographic metadata ───────────────────────────────
        migrations.AddField(
            model_name='datasetfile',
            name='bib_title',
            field=models.CharField(
                max_length=1000, blank=True, null=True,
                help_text='Título del artículo/documento'
            ),
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='bib_authors',
            field=models.TextField(
                blank=True, null=True,
                help_text='Autores separados por punto y coma'
            ),
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='bib_year',
            field=models.IntegerField(
                blank=True, null=True,
                help_text='Año de publicación'
            ),
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='bib_journal',
            field=models.CharField(
                max_length=500, blank=True, null=True,
                help_text='Nombre de la revista o conferencia'
            ),
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='bib_doi',
            field=models.CharField(
                max_length=300, blank=True, null=True,
                help_text='Digital Object Identifier (DOI)'
            ),
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='bib_abstract',
            field=models.TextField(
                blank=True, null=True,
                help_text='Resumen del artículo'
            ),
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='bib_keywords',
            field=models.TextField(
                blank=True, null=True,
                help_text='Palabras clave del autor separadas por punto y coma'
            ),
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='bib_source_db',
            field=models.CharField(
                max_length=50, blank=True, null=True,
                choices=[
                    ('scopus', 'Scopus'),
                    ('wos', 'Web of Science'),
                    ('redalyc', 'Redalyc'),
                    ('eric', 'ERIC'),
                    ('pubmed', 'PubMed'),
                    ('google_scholar', 'Google Scholar'),
                    ('semantic_scholar', 'Semantic Scholar'),
                    ('scielo', 'SciELO'),
                    ('dialnet', 'Dialnet'),
                    ('other', 'Otra'),
                ],
                help_text='Base de datos bibliográfica de origen'
            ),
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='bib_volume',
            field=models.CharField(max_length=50, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='bib_issue',
            field=models.CharField(max_length=50, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='bib_pages',
            field=models.CharField(max_length=50, blank=True, null=True),
        ),

        # ── DatasetFile: PRISMA inclusion/exclusion ───────────────────────────
        migrations.AddField(
            model_name='datasetfile',
            name='inclusion_status',
            field=models.CharField(
                max_length=20, default='pending',
                choices=[
                    ('pending', 'Pendiente de revisión'),
                    ('included', 'Incluido'),
                    ('excluded', 'Excluido'),
                ],
                help_text='Estado de inclusión en el corpus según criterios PRISMA'
            ),
        ),
        migrations.AddField(
            model_name='datasetfile',
            name='exclusion_reason',
            field=models.TextField(
                blank=True, null=True,
                help_text='Motivo de exclusión (si aplica)'
            ),
        ),

        # ── Indexes ───────────────────────────────────────────────────────────
        migrations.AddIndex(
            model_name='datasetfile',
            index=models.Index(fields=['bib_source_db'], name='dataset_fil_bib_sou_idx'),
        ),
        migrations.AddIndex(
            model_name='datasetfile',
            index=models.Index(fields=['bib_year'], name='dataset_fil_bib_yea_idx'),
        ),
        migrations.AddIndex(
            model_name='datasetfile',
            index=models.Index(fields=['inclusion_status'], name='dataset_fil_inclusi_idx'),
        ),
    ]
