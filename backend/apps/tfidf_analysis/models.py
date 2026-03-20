"""
TF-IDF Analysis Models

Análisis TF-IDF con múltiples fuentes de origen.
"""

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class TfIdfAnalysis(models.Model):
    """
    Análisis TF-IDF con múltiples opciones de origen.

    Puede crearse desde:
    - Preparación de datos directamente
    - Bolsa de Palabras existente
    - Configuración específica de N-gramas
    - Todas las configuraciones de un análisis de N-gramas
    - Vocabulario completo de un análisis de N-gramas
    """

    # Tipos de origen
    SOURCE_DATA_PREPARATION = 'data_preparation'
    SOURCE_BAG_OF_WORDS = 'bag_of_words'
    SOURCE_NGRAM_CONFIG = 'ngram_config'
    SOURCE_NGRAM_ALL = 'ngram_all'
    SOURCE_NGRAM_VOCABULARY = 'ngram_vocabulary'

    SOURCE_CHOICES = [
        (SOURCE_DATA_PREPARATION, 'Preparación de Datos'),
        (SOURCE_BAG_OF_WORDS, 'Bolsa de Palabras'),
        (SOURCE_NGRAM_CONFIG, 'Configuración N-grama específica'),
        (SOURCE_NGRAM_ALL, 'Todas las configuraciones N-grama'),
        (SOURCE_NGRAM_VOCABULARY, 'Vocabulario completo N-grama'),
    ]

    # Estados
    STATUS_PENDING = 'pending'
    STATUS_PROCESSING = 'processing'
    STATUS_COMPLETED = 'completed'
    STATUS_ERROR = 'error'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pendiente'),
        (STATUS_PROCESSING, 'Procesando'),
        (STATUS_COMPLETED, 'Completado'),
        (STATUS_ERROR, 'Error'),
    ]

    # Etapas
    STAGE_PENDING = 'pending'
    STAGE_LOADING_DATA = 'loading_data'
    STAGE_CALCULATING_TF = 'calculating_tf'
    STAGE_CALCULATING_IDF = 'calculating_idf'
    STAGE_CALCULATING_TFIDF = 'calculating_tfidf'
    STAGE_SAVING_RESULTS = 'saving_results'
    STAGE_COMPLETED = 'completed'

    STAGE_CHOICES = [
        (STAGE_PENDING, 'Pendiente'),
        (STAGE_LOADING_DATA, 'Cargando datos'),
        (STAGE_CALCULATING_TF, 'Calculando matriz TF'),
        (STAGE_CALCULATING_IDF, 'Calculando vector IDF'),
        (STAGE_CALCULATING_TFIDF, 'Calculando matriz TF-IDF'),
        (STAGE_SAVING_RESULTS, 'Guardando resultados'),
        (STAGE_COMPLETED, 'Completado'),
    ]

    # Información básica
    name = models.CharField(max_length=255, verbose_name='Nombre del análisis')
    description = models.TextField(blank=True, verbose_name='Descripción')

    # Tipo de origen
    source_type = models.CharField(
        max_length=50,
        choices=SOURCE_CHOICES,
        verbose_name='Tipo de origen'
    )

    # Relaciones opcionales según el tipo de origen
    data_preparation = models.ForeignKey(
        'data_preparation.DataPreparation',
        on_delete=models.CASCADE,
        related_name='tfidf_analyses',
        null=True,
        blank=True,
        verbose_name='Preparación de datos'
    )
    bag_of_words = models.ForeignKey(
        'bag_of_words.BagOfWords',
        on_delete=models.CASCADE,
        related_name='tfidf_analyses',
        null=True,
        blank=True,
        verbose_name='Bolsa de Palabras'
    )
    ngram_analysis = models.ForeignKey(
        'ngram_analysis.NgramAnalysis',
        on_delete=models.CASCADE,
        related_name='tfidf_analyses',
        null=True,
        blank=True,
        verbose_name='Análisis de N-gramas'
    )

    # Para SOURCE_NGRAM_CONFIG: configuración específica (ej: "2_2" para bigramas)
    ngram_config = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Configuración N-grama'
    )

    # Usuario creador
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='tfidf_analyses',
        verbose_name='Creado por'
    )

    # Parámetros TF-IDF
    max_features = models.IntegerField(
        default=100000,
        verbose_name='Máximo de features'
    )
    min_df = models.IntegerField(
        default=1,
        verbose_name='Frecuencia mínima de documento'
    )
    max_df = models.FloatField(
        default=1.0,
        verbose_name='Frecuencia máxima de documento'
    )
    ngram_min = models.IntegerField(
        default=1,
        verbose_name='N-grama mínimo'
    )
    ngram_max = models.IntegerField(
        default=1,
        verbose_name='N-grama máximo'
    )
    use_idf = models.BooleanField(
        default=True,
        verbose_name='Usar IDF'
    )
    smooth_idf = models.BooleanField(
        default=True,
        verbose_name='Suavizar IDF'
    )
    sublinear_tf = models.BooleanField(
        default=False,
        verbose_name='TF sublineal'
    )

    # Contadores
    document_count = models.IntegerField(default=0, verbose_name='Número de documentos')
    vocabulary_size = models.IntegerField(default=0, verbose_name='Tamaño del vocabulario')

    # Resultado - Matriz TF (Term Frequency)
    # Formato: {
    #   "matrix_shape": {"rows": 254, "cols": 1000},
    #   "matrix_sparsity": 0.4655,
    #   "top_terms_by_tf": [...],  # Términos con mayor TF promedio
    #   "avg_tf_per_document": 45.2
    # }
    tf_matrix = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Matriz TF'
    )

    # Resultado - Vector IDF (Inverse Document Frequency)
    # Formato: {
    #   "idf_values": {"término1": 2.5, "término2": 1.8, ...},
    #   "top_terms_by_idf": [...],  # Términos con mayor IDF (más raros)
    #   "bottom_terms_by_idf": [...],  # Términos con menor IDF (más comunes)
    #   "avg_idf": 3.2
    # }
    idf_vector = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Vector IDF'
    )

    # Resultado - Matriz TF-IDF final
    # Formato: {
    #   "matrix_shape": {"rows": 254, "cols": 1000},
    #   "matrix_sparsity": 0.4655,
    #   "top_terms": [...],  # Top 50 términos por TF-IDF
    #   "avg_tfidf_per_document": 0.023,
    #   "total_score": 1234.5
    # }
    tfidf_matrix = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Matriz TF-IDF'
    )

    # Estado y progreso
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name='Estado'
    )
    current_stage = models.CharField(
        max_length=50,
        choices=STAGE_CHOICES,
        default=STAGE_PENDING,
        verbose_name='Etapa actual'
    )
    progress_percentage = models.IntegerField(
        default=0,
        verbose_name='Porcentaje de progreso'
    )
    error_message = models.TextField(
        blank=True,
        verbose_name='Mensaje de error'
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de creación'
    )
    processing_started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Inicio de procesamiento'
    )
    processing_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fin de procesamiento'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Última actualización'
    )

    # Artefacto de vectorizador (serializado para inferencia)
    vectorizer_artifact = models.FileField(
        upload_to='artifacts/tfidf/',
        null=True,
        blank=True,
        verbose_name='Artefacto del vectorizador',
        help_text="TfidfVectorizer serializado (joblib) con IDF del corpus para inferencia"
    )

    class Meta:
        verbose_name = 'Análisis TF-IDF'
        verbose_name_plural = 'Análisis TF-IDF'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['source_type']),
        ]

    def __str__(self):
        return f"{self.name} (TF-IDF desde {self.get_source_type_display()})"

    @property
    def current_stage_label(self):
        """Obtener etiqueta de la etapa actual."""
        return dict(self.STAGE_CHOICES).get(self.current_stage, '')

    @property
    def status_label(self):
        """Obtener etiqueta del estado."""
        return dict(self.STATUS_CHOICES).get(self.status, '')

    @property
    def source_name(self):
        """Nombre de la fuente de origen."""
        if self.source_type == self.SOURCE_DATA_PREPARATION and self.data_preparation:
            return self.data_preparation.name
        elif self.source_type == self.SOURCE_BAG_OF_WORDS and self.bag_of_words:
            return self.bag_of_words.name
        elif self.source_type in [self.SOURCE_NGRAM_CONFIG, self.SOURCE_NGRAM_ALL, self.SOURCE_NGRAM_VOCABULARY] and self.ngram_analysis:
            if self.source_type == self.SOURCE_NGRAM_CONFIG:
                return f"{self.ngram_analysis.name} ({self.ngram_config})"
            return self.ngram_analysis.name
        return ''

    @property
    def dataset_name(self):
        """Nombre del dataset."""
        if self.source_type == self.SOURCE_DATA_PREPARATION and self.data_preparation:
            return self.data_preparation.dataset.name if self.data_preparation.dataset else ''
        elif self.source_type == self.SOURCE_BAG_OF_WORDS and self.bag_of_words:
            return self.bag_of_words.data_preparation.dataset.name if self.bag_of_words.data_preparation and self.bag_of_words.data_preparation.dataset else ''
        elif self.ngram_analysis:
            return self.ngram_analysis.data_preparation.dataset.name if self.ngram_analysis.data_preparation and self.ngram_analysis.data_preparation.dataset else ''
        return ''

    @property
    def created_by_email(self):
        """Email del creador."""
        return self.created_by.email if self.created_by else ''
