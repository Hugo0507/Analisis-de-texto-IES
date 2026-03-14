"""
Models for Dataset management.
"""

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Dataset(models.Model):
    """
    Model representing a dataset collection used for model training.
    Datasets are managed by admin users to create reference data for analysis.
    """
    SOURCE_CHOICES = [
        ('upload', 'Upload'),
        ('drive', 'Google Drive'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('error', 'Error'),
    ]

    name = models.CharField(max_length=255, help_text='Dataset name')
    description = models.TextField(blank=True, null=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    source_url = models.URLField(blank=True, null=True, help_text='Google Drive URL if applicable')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Metadata
    total_files = models.IntegerField(default=0)
    total_size_bytes = models.BigIntegerField(default=0)

    # ── PRISMA / Search protocol ──────────────────────────────────────────────
    search_strategy = models.TextField(
        blank=True, null=True,
        help_text='Descripción de la estrategia de búsqueda (ecuación, bases de datos, fechas)'
    )
    inclusion_criteria = models.TextField(
        blank=True, null=True,
        help_text='Criterios de inclusión del corpus (uno por línea)'
    )
    exclusion_criteria = models.TextField(
        blank=True, null=True,
        help_text='Criterios de exclusión del corpus (uno por línea)'
    )
    database_sources = models.CharField(
        max_length=500, blank=True, null=True,
        help_text='Bases de datos consultadas separadas por coma (ej: Scopus, WoS, Redalyc)'
    )

    # User who created the dataset
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='datasets'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'datasets'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['source']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.name} ({self.status})"

    @property
    def prisma_stats(self):
        """Returns PRISMA-style counts for the dataset."""
        files = self.files.all()
        return {
            'total': files.count(),
            'included': files.filter(inclusion_status='included').count(),
            'excluded': files.filter(inclusion_status='excluded').count(),
            'pending': files.filter(inclusion_status='pending').count(),
        }


class DatasetFile(models.Model):
    """
    Model representing an individual file (article) within a dataset.
    Stores both technical metadata and bibliographic metadata.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('error', 'Error'),
    ]

    INCLUSION_CHOICES = [
        ('pending', 'Pendiente de revisión'),
        ('included', 'Incluido'),
        ('excluded', 'Excluido'),
    ]

    SOURCE_DB_CHOICES = [
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
    ]

    # ── Relación ──────────────────────────────────────────────────────────────
    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name='files'
    )

    # ── Información técnica del archivo ───────────────────────────────────────
    filename = models.CharField(max_length=500)
    original_filename = models.CharField(max_length=500)
    file_path = models.CharField(max_length=1000, help_text='Path to stored file')
    file_size_bytes = models.BigIntegerField()
    mime_type = models.CharField(max_length=100, blank=True, null=True)

    # Estructura de directorios
    directory_path = models.CharField(
        max_length=1000, blank=True, null=True,
        help_text='Relative directory path from root'
    )
    directory_name = models.CharField(
        max_length=500, blank=True, null=True,
        help_text='Immediate parent directory name'
    )

    # ── Procesamiento ─────────────────────────────────────────────────────────
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True, null=True)

    # Detección de idioma
    language_code = models.CharField(max_length=5, blank=True, null=True)
    language_confidence = models.FloatField(blank=True, null=True)

    # Contenido extraído
    txt_content = models.TextField(blank=True, null=True, help_text='Extracted text content')
    preprocessed_text = models.TextField(blank=True, null=True, help_text='Preprocessed text')

    # ── Metadatos bibliográficos ──────────────────────────────────────────────
    bib_title = models.CharField(
        max_length=1000, blank=True, null=True,
        help_text='Título del artículo/documento'
    )
    bib_authors = models.TextField(
        blank=True, null=True,
        help_text='Autores separados por punto y coma (ej: García, J.; López, M.)'
    )
    bib_year = models.IntegerField(
        blank=True, null=True,
        help_text='Año de publicación'
    )
    bib_journal = models.CharField(
        max_length=500, blank=True, null=True,
        help_text='Nombre de la revista o conferencia'
    )
    bib_doi = models.CharField(
        max_length=300, blank=True, null=True,
        help_text='Digital Object Identifier (DOI)'
    )
    bib_abstract = models.TextField(
        blank=True, null=True,
        help_text='Resumen del artículo'
    )
    bib_keywords = models.TextField(
        blank=True, null=True,
        help_text='Palabras clave del autor separadas por punto y coma'
    )
    bib_source_db = models.CharField(
        max_length=50, choices=SOURCE_DB_CHOICES, blank=True, null=True,
        help_text='Base de datos bibliográfica de origen'
    )
    bib_volume = models.CharField(max_length=50, blank=True, null=True)
    bib_issue = models.CharField(max_length=50, blank=True, null=True)
    bib_pages = models.CharField(max_length=50, blank=True, null=True)

    # ── Protocolo de selección (PRISMA) ───────────────────────────────────────
    inclusion_status = models.CharField(
        max_length=20, choices=INCLUSION_CHOICES, default='pending',
        help_text='Estado de inclusión en el corpus según criterios PRISMA'
    )
    exclusion_reason = models.TextField(
        blank=True, null=True,
        help_text='Motivo de exclusión (si aplica)'
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dataset_files'
        ordering = ['filename']
        indexes = [
            models.Index(fields=['dataset', 'status']),
            models.Index(fields=['language_code']),
            models.Index(fields=['bib_source_db']),
            models.Index(fields=['bib_year']),
            models.Index(fields=['inclusion_status']),
        ]

    def __str__(self):
        return f"{self.filename} ({self.dataset.name})"

    def auto_detect_source_db(self):
        """
        Auto-detect bibliographic source database from directory structure.
        Maps common folder names used when organizing downloads from academic databases.
        """
        DIRECTORY_TO_SOURCE = {
            'scopus': 'scopus',
            'wos': 'wos',
            'webofscience': 'wos',
            'web of science': 'wos',
            'web_of_science': 'wos',
            'redalyc': 'redalyc',
            'eric': 'eric',
            'pubmed': 'pubmed',
            'google scholar': 'google_scholar',
            'google_scholar': 'google_scholar',
            'semantic scholar': 'semantic_scholar',
            'semantic_scholar': 'semantic_scholar',
            'scielo': 'scielo',
            'dialnet': 'dialnet',
        }
        root_dir = ''
        if self.directory_path:
            root_dir = self.directory_path.split('/')[0].lower().strip()
        elif self.directory_name:
            root_dir = self.directory_name.lower().strip()

        return DIRECTORY_TO_SOURCE.get(root_dir)

    @property
    def bib_authors_list(self):
        """Return authors as a list."""
        if not self.bib_authors:
            return []
        return [a.strip() for a in self.bib_authors.split(';') if a.strip()]

    @property
    def bib_keywords_list(self):
        """Return keywords as a list."""
        if not self.bib_keywords:
            return []
        return [k.strip() for k in self.bib_keywords.split(';') if k.strip()]
