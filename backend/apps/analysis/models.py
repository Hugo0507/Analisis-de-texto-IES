"""
Models for Analysis app.

Contains models for:
- Vocabulary: Términos únicos del corpus
- BowMatrix: Matriz Bag of Words (frecuencias)
- TfidfMatrix: Matriz TF-IDF (pesos)
- MatrixStorage: Referencias a matrices grandes en Google Drive
- Topic: Temas descubiertos (LDA, NMF, LSA, pLSA)
- DocumentTopic: Relación documento-tema
- Factor: Factores de transformación digital (8 categorías)
- DocumentFactor: Relación documento-factor
"""

from django.db import models
from apps.documents.models import Document
from apps.datasets.models import DatasetFile


class Vocabulary(models.Model):
    """
    Modelo de vocabulario del corpus.
    Almacena términos únicos extraídos del análisis.
    """
    term = models.CharField(max_length=255, unique=True, db_index=True)
    global_frequency = models.IntegerField(default=0)
    document_frequency = models.IntegerField(default=0)
    idf_score = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vocabulary'
        ordering = ['-global_frequency']
        indexes = [
            models.Index(fields=['-global_frequency']),
            models.Index(fields=['term']),
        ]

    def __str__(self):
        return f"{self.term} (freq: {self.global_frequency})"


class BowMatrix(models.Model):
    """
    Matriz Bag of Words (BoW).
    Relación documento-término con frecuencias.
    """
    document = models.ForeignKey(
        DatasetFile,
        on_delete=models.CASCADE,
        related_name='bow_entries'
    )
    term = models.ForeignKey(
        Vocabulary,
        on_delete=models.CASCADE,
        related_name='bow_entries'
    )
    frequency = models.IntegerField(default=0)

    class Meta:
        db_table = 'bow_matrix'
        unique_together = [['document', 'term']]
        indexes = [
            models.Index(fields=['-frequency']),
            models.Index(fields=['document', 'term']),
        ]

    def __str__(self):
        return f"{self.document.filename} - {self.term.term}: {self.frequency}"


class TfidfMatrix(models.Model):
    """
    Matriz TF-IDF.
    Relación documento-término con pesos TF-IDF.
    """
    document = models.ForeignKey(
        DatasetFile,
        on_delete=models.CASCADE,
        related_name='tfidf_entries'
    )
    term = models.ForeignKey(
        Vocabulary,
        on_delete=models.CASCADE,
        related_name='tfidf_entries'
    )
    tfidf_score = models.FloatField()

    class Meta:
        db_table = 'tfidf_matrix'
        unique_together = [['document', 'term']]
        indexes = [
            models.Index(fields=['-tfidf_score']),
            models.Index(fields=['document', 'term']),
        ]

    def __str__(self):
        return f"{self.document.filename} - {self.term.term}: {self.tfidf_score:.4f}"


class MatrixStorage(models.Model):
    """
    Almacenamiento de referencias a matrices grandes.
    Las matrices grandes (BoW, TF-IDF, PCA, etc.) se guardan en Google Drive como pickle.
    Este modelo almacena solo los metadatos y la referencia.
    """
    MATRIX_TYPE_CHOICES = [
        ('bow', 'Bag of Words'),
        ('tfidf', 'TF-IDF'),
        ('pca', 'PCA'),
        ('tsne', 't-SNE'),
        ('umap', 'UMAP'),
    ]

    matrix_type = models.CharField(max_length=20, choices=MATRIX_TYPE_CHOICES)
    drive_file_id = models.CharField(max_length=255)
    shape_rows = models.IntegerField()
    shape_cols = models.IntegerField()
    sparsity = models.FloatField(null=True, blank=True)
    file_size_bytes = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'matrix_storage'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['matrix_type']),
        ]

    def __str__(self):
        return f"{self.get_matrix_type_display()} - {self.shape_rows}x{self.shape_cols}"


class Topic(models.Model):
    """
    Temas descubiertos por Topic Modeling.
    Soporta múltiples algoritmos: LDA, NMF, LSA, pLSA.
    """
    MODEL_TYPE_CHOICES = [
        ('lda', 'LDA (Latent Dirichlet Allocation)'),
        ('nmf', 'NMF (Non-negative Matrix Factorization)'),
        ('lsa', 'LSA (Latent Semantic Analysis)'),
        ('plsa', 'pLSA (Probabilistic LSA)'),
    ]

    model_type = models.CharField(max_length=10, choices=MODEL_TYPE_CHOICES)
    topic_number = models.IntegerField()
    top_words = models.JSONField(help_text="Lista de palabras principales del tema con sus pesos")
    coherence_score = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'topics'
        unique_together = [['model_type', 'topic_number']]
        ordering = ['model_type', 'topic_number']
        indexes = [
            models.Index(fields=['model_type']),
        ]

    def __str__(self):
        return f"{self.get_model_type_display()} - Tema {self.topic_number}"


class DocumentTopic(models.Model):
    """
    Relación documento-tema.
    Almacena la probabilidad de que un documento pertenezca a un tema.
    """
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='topic_assignments'
    )
    topic = models.ForeignKey(
        Topic,
        on_delete=models.CASCADE,
        related_name='document_assignments'
    )
    probability = models.FloatField(
        help_text="Probabilidad de que el documento pertenezca a este tema (0-1)"
    )

    class Meta:
        db_table = 'document_topics'
        ordering = ['-probability']
        indexes = [
            models.Index(fields=['-probability']),
            models.Index(fields=['document', 'topic']),
        ]

    def __str__(self):
        return f"{self.document.filename} - {self.topic}: {self.probability:.4f}"


class Factor(models.Model):
    """
    Factores de Transformación Digital.
    8 categorías principales identificadas en el análisis.
    """
    CATEGORY_CHOICES = [
        ('tecnologico', 'Tecnológico'),
        ('organizacional', 'Organizacional'),
        ('humano', 'Humano'),
        ('estrategico', 'Estratégico'),
        ('financiero', 'Financiero'),
        ('pedagogico', 'Pedagógico'),
        ('infraestructura', 'Infraestructura'),
        ('seguridad', 'Seguridad'),
    ]

    name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    keywords = models.JSONField(
        help_text="Lista de palabras clave asociadas a este factor"
    )
    global_frequency = models.IntegerField(default=0)
    relevance_score = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'factors'
        ordering = ['-relevance_score', 'category']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['-relevance_score']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class DocumentFactor(models.Model):
    """
    Relación documento-factor.
    Almacena cuántas menciones de cada factor aparecen en cada documento.
    """
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='factor_mentions'
    )
    factor = models.ForeignKey(
        Factor,
        on_delete=models.CASCADE,
        related_name='document_mentions'
    )
    mention_count = models.IntegerField(default=0)
    relevance_score = models.FloatField(
        null=True,
        blank=True,
        help_text="Score de relevancia normalizado"
    )

    class Meta:
        db_table = 'document_factors'
        ordering = ['-relevance_score']
        indexes = [
            models.Index(fields=['-relevance_score']),
            models.Index(fields=['document', 'factor']),
        ]

    def __str__(self):
        return f"{self.document.filename} - {self.factor.name}: {self.mention_count} menciones"


class FactorAnalysisRun(models.Model):
    """
    Registro de cada ejecución del análisis de factores.
    Permite guardar múltiples análisis con distintos preprocesamientos.
    """
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('running', 'Ejecutando'),
        ('completed', 'Completado'),
        ('error', 'Error'),
    ]

    name = models.CharField(max_length=255, verbose_name='Nombre')
    data_preparation = models.ForeignKey(
        'data_preparation.DataPreparation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='factor_runs',
        verbose_name='Preparación de datos'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Estado'
    )
    document_count = models.IntegerField(default=0)
    factor_count = models.IntegerField(default=0)
    results = models.JSONField(null=True, blank=True, help_text='Resultados completos del análisis')
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'factor_analysis_runs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"
