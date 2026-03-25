"""
Topic Modeling Models

Modelo para análisis de modelado de temas usando LSA, NMF, PLSA y LDA.
"""

from django.db import models
from django.conf import settings
from apps.data_preparation.models import DataPreparation
from apps.datasets.models import Dataset


class TopicModeling(models.Model):
    """
    Modelo de Topic Modeling.

    Extrae temas/tópicos latentes de textos usando algoritmos de
    descomposición matricial y métodos probabilísticos.
    """

    # === ESTADOS ===
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

    # === ETAPAS DE PROCESAMIENTO ===
    STAGE_PENDING = 'pending'
    STAGE_LOADING_DATA = 'loading_data'
    STAGE_PREPROCESSING = 'preprocessing'
    STAGE_VECTORIZING = 'vectorizing'
    STAGE_TRAINING_MODEL = 'training_model'
    STAGE_EXTRACTING_TOPICS = 'extracting_topics'
    STAGE_CALCULATING_COHERENCE = 'calculating_coherence'
    STAGE_SAVING_RESULTS = 'saving_results'
    STAGE_COMPLETED = 'completed'

    STAGE_CHOICES = [
        (STAGE_PENDING, 'Pendiente'),
        (STAGE_LOADING_DATA, 'Cargando datos'),
        (STAGE_PREPROCESSING, 'Preprocesando textos'),
        (STAGE_VECTORIZING, 'Vectorizando'),
        (STAGE_TRAINING_MODEL, 'Entrenando modelo'),
        (STAGE_EXTRACTING_TOPICS, 'Extrayendo tópicos'),
        (STAGE_CALCULATING_COHERENCE, 'Calculando coherencia'),
        (STAGE_SAVING_RESULTS, 'Guardando resultados'),
        (STAGE_COMPLETED, 'Completado'),
    ]

    # === ALGORITMOS SOPORTADOS ===
    ALGORITHM_LSA = 'lsa'
    ALGORITHM_NMF = 'nmf'
    ALGORITHM_PLSA = 'plsa'
    ALGORITHM_LDA = 'lda'

    ALGORITHM_CHOICES = [
        (ALGORITHM_LSA, 'LSA (Latent Semantic Analysis)'),
        (ALGORITHM_NMF, 'NMF (Non-negative Matrix Factorization)'),
        (ALGORITHM_PLSA, 'PLSA (Probabilistic Latent Semantic Analysis)'),
        (ALGORITHM_LDA, 'LDA (Latent Dirichlet Allocation)'),
    ]

    # === FUENTES DE DATOS ===
    SOURCE_DATA_PREPARATION = 'data_preparation'
    SOURCE_DATASET = 'dataset'

    SOURCE_CHOICES = [
        (SOURCE_DATA_PREPARATION, 'Preparación de Datos (Preprocesado)'),
        (SOURCE_DATASET, 'Dataset Directo (Textos Raw)'),
    ]

    # ============================================================
    # INFORMACIÓN BÁSICA
    # ============================================================
    name = models.CharField(
        max_length=255,
        verbose_name='Nombre del Análisis'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descripción'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='topic_modelings',
        verbose_name='Creado por'
    )

    # ============================================================
    # ORIGEN DE DATOS
    # ============================================================
    source_type = models.CharField(
        max_length=50,
        choices=SOURCE_CHOICES,
        verbose_name='Tipo de Fuente'
    )
    data_preparation = models.ForeignKey(
        DataPreparation,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='topic_modelings',
        verbose_name='Preparación de Datos'
    )
    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='topic_modelings',
        verbose_name='Dataset'
    )

    # ============================================================
    # CONFIGURACIÓN DEL MODELO
    # ============================================================
    algorithm = models.CharField(
        max_length=20,
        choices=ALGORITHM_CHOICES,
        default=ALGORITHM_LDA,
        verbose_name='Algoritmo'
    )
    num_topics = models.IntegerField(
        default=10,
        verbose_name='Número de Tópicos'
    )
    num_words = models.IntegerField(
        default=10,
        verbose_name='Palabras por Tópico'
    )

    # Parámetros adicionales (opcionales)
    max_iterations = models.IntegerField(
        default=100,
        verbose_name='Iteraciones Máximas'
    )
    random_seed = models.IntegerField(
        default=42,
        null=True,
        blank=True,
        verbose_name='Semilla Aleatoria'
    )

    # ============================================================
    # ESTADO Y PROGRESO
    # ============================================================
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
        verbose_name='Etapa Actual'
    )
    progress_percentage = models.IntegerField(
        default=0,
        verbose_name='Progreso (%)'
    )
    error_message = models.TextField(
        null=True,
        blank=True,
        verbose_name='Mensaje de Error'
    )

    # ============================================================
    # RESULTADOS GENERALES
    # ============================================================
    documents_processed = models.IntegerField(
        default=0,
        verbose_name='Documentos Procesados'
    )
    vocabulary_size = models.IntegerField(
        default=0,
        verbose_name='Tamaño del Vocabulario'
    )
    coherence_score = models.FloatField(
        null=True,
        blank=True,
        verbose_name='Score de Coherencia'
    )
    perplexity_score = models.FloatField(
        null=True,
        blank=True,
        verbose_name='Score de Perplejidad'
    )

    # ============================================================
    # RESULTADOS DETALLADOS (JSON)
    # ============================================================
    # Lista de tópicos con sus palabras principales
    topics = models.JSONField(
        default=list,
        verbose_name='Tópicos Extraídos'
    )
    # [{
    #     "topic_id": 0,
    #     "topic_label": "Technology & Innovation",
    #     "words": [
    #         {"word": "technology", "weight": 0.045},
    #         {"word": "innovation", "weight": 0.038},
    #         ...
    #     ]
    # }]

    # Distribución de documentos por tópico
    document_topics = models.JSONField(
        default=list,
        verbose_name='Documentos por Tópico'
    )
    # [{
    #     "document_id": 123,
    #     "document_name": "paper_01.txt",
    #     "dominant_topic": 2,
    #     "topic_distribution": [0.05, 0.10, 0.75, 0.05, 0.05],
    #     "dominant_topic_weight": 0.75
    # }]

    # Distribución global de tópicos
    topic_distribution = models.JSONField(
        default=list,
        verbose_name='Distribución de Tópicos'
    )
    # [{
    #     "topic_id": 0,
    #     "topic_label": "Technology",
    #     "document_count": 45,
    #     "percentage": 22.5
    # }]

    # ============================================================
    # TIMESTAMPS
    # ============================================================
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Creado'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Actualizado'
    )
    processing_started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Inicio de Procesamiento'
    )
    processing_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fin de Procesamiento'
    )

    # Artefactos de modelo (serializados para inferencia)
    model_artifact = models.FileField(
        upload_to='artifacts/topic/',
        null=True,
        blank=True,
        verbose_name='Artefacto del modelo',
        help_text="Modelo de tópicos serializado (joblib) para inferencia sobre nuevos documentos"
    )
    vectorizer_artifact = models.FileField(
        upload_to='artifacts/topic/',
        null=True,
        blank=True,
        verbose_name='Artefacto del vectorizador',
        help_text="Vectorizador serializado (joblib) compatible con el modelo de tópicos"
    )
    model_artifact_bin = models.BinaryField(
        null=True,
        blank=True,
        verbose_name='Artefacto del modelo (DB)',
        help_text="Modelo de tópicos serializado (joblib) almacenado en DB para persistencia"
    )
    vectorizer_artifact_bin = models.BinaryField(
        null=True,
        blank=True,
        verbose_name='Artefacto del vectorizador (DB)',
        help_text="Vectorizador serializado (joblib) almacenado en DB para persistencia"
    )

    class Meta:
        db_table = 'topic_modeling'
        verbose_name = 'Topic Modeling'
        verbose_name_plural = 'Topic Modelings'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_algorithm_display()})"

    @property
    def source_name(self):
        """Retorna el nombre de la fuente de datos"""
        if self.source_type == self.SOURCE_DATA_PREPARATION and self.data_preparation:
            return self.data_preparation.name
        elif self.source_type == self.SOURCE_DATASET and self.dataset:
            return self.dataset.name
        return "N/A"

    @property
    def is_probabilistic(self):
        """Indica si el algoritmo es probabilístico"""
        return self.algorithm in [self.ALGORITHM_PLSA, self.ALGORITHM_LDA]

    @property
    def algorithm_category(self):
        """Retorna la categoría del algoritmo"""
        if self.algorithm in [self.ALGORITHM_LSA, self.ALGORITHM_NMF]:
            return 'Non-Probabilistic'
        elif self.algorithm in [self.ALGORITHM_PLSA, self.ALGORITHM_LDA]:
            return 'Probabilistic'
        return 'Unknown'
