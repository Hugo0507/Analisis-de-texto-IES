"""
BERTopic Models

Modelo para análisis de Topic Modeling con BERTopic.
"""

from django.db import models
from django.contrib.auth import get_user_model
from apps.data_preparation.models import DataPreparation
from apps.datasets.models import Dataset

User = get_user_model()


class BERTopicAnalysis(models.Model):
    """
    Modelo para análisis de BERTopic.

    BERTopic combina:
    - BERT embeddings (sentence-transformers)
    - UMAP (reducción dimensional)
    - HDBSCAN (clustering)
    - c-TF-IDF (representación de tópicos)
    """

    # ============================================================
    # CHOICES
    # ============================================================

    # Source types
    SOURCE_DATA_PREPARATION = 'data_preparation'
    SOURCE_DATASET = 'dataset'
    SOURCE_TYPE_CHOICES = [
        (SOURCE_DATA_PREPARATION, 'Data Preparation'),
        (SOURCE_DATASET, 'Dataset'),
    ]

    # Status
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

    # Processing stages
    STAGE_PENDING = 'pending'
    STAGE_LOADING_DATA = 'loading_data'
    STAGE_LOADING_MODEL = 'loading_model'
    STAGE_GENERATING_EMBEDDINGS = 'generating_embeddings'
    STAGE_REDUCING_DIMENSIONS = 'reducing_dimensions'
    STAGE_CLUSTERING = 'clustering'
    STAGE_EXTRACTING_TOPICS = 'extracting_topics'
    STAGE_CALCULATING_COHERENCE = 'calculating_coherence'
    STAGE_COMPUTING_PROJECTIONS = 'computing_projections'
    STAGE_SAVING_RESULTS = 'saving_results'
    STAGE_COMPLETED = 'completed'
    STAGE_CHOICES = [
        (STAGE_PENDING, 'Pendiente'),
        (STAGE_LOADING_DATA, 'Cargando datos'),
        (STAGE_LOADING_MODEL, 'Cargando modelo BERT'),
        (STAGE_GENERATING_EMBEDDINGS, 'Generando embeddings'),
        (STAGE_REDUCING_DIMENSIONS, 'Reduciendo dimensionalidad (UMAP)'),
        (STAGE_CLUSTERING, 'Clustering (HDBSCAN)'),
        (STAGE_EXTRACTING_TOPICS, 'Extrayendo temas'),
        (STAGE_CALCULATING_COHERENCE, 'Calculando coherencia'),
        (STAGE_COMPUTING_PROJECTIONS, 'Calculando proyecciones 2D'),
        (STAGE_SAVING_RESULTS, 'Guardando resultados'),
        (STAGE_COMPLETED, 'Completado'),
    ]

    # Embedding models
    EMBEDDING_MINILM = 'all-MiniLM-L6-v2'
    EMBEDDING_MPNET = 'all-mpnet-base-v2'
    EMBEDDING_MULTILINGUAL = 'paraphrase-multilingual-MiniLM-L12-v2'
    EMBEDDING_CHOICES = [
        (EMBEDDING_MINILM, 'MiniLM-L6-v2 (Rápido, Inglés)'),
        (EMBEDDING_MPNET, 'MPNet (Mejor calidad, Inglés)'),
        (EMBEDDING_MULTILINGUAL, 'Multilingual (Español/Inglés)'),
    ]

    # ============================================================
    # BASIC INFORMATION
    # ============================================================

    name = models.CharField(max_length=255, verbose_name='Nombre')
    description = models.TextField(blank=True, null=True, verbose_name='Descripción')
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='bertopic_analyses',
        verbose_name='Creado por'
    )

    # ============================================================
    # DATA SOURCE
    # ============================================================

    source_type = models.CharField(
        max_length=50,
        choices=SOURCE_TYPE_CHOICES,
        verbose_name='Tipo de fuente'
    )
    data_preparation = models.ForeignKey(
        DataPreparation,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='bertopic_analyses',
        verbose_name='Preparación de datos'
    )
    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='bertopic_analyses',
        verbose_name='Dataset'
    )

    # ============================================================
    # CONFIGURATION
    # ============================================================

    embedding_model = models.CharField(
        max_length=100,
        choices=EMBEDDING_CHOICES,
        default=EMBEDDING_MINILM,
        verbose_name='Modelo de embeddings'
    )

    # UMAP parameters
    n_neighbors = models.IntegerField(
        default=15,
        verbose_name='N Neighbors (UMAP)'
    )
    n_components = models.IntegerField(
        default=5,
        verbose_name='N Components (UMAP)'
    )

    # HDBSCAN parameters
    min_cluster_size = models.IntegerField(
        default=10,
        verbose_name='Min Cluster Size (HDBSCAN)'
    )
    min_samples = models.IntegerField(
        default=5,
        verbose_name='Min Samples (HDBSCAN)'
    )

    # Topic reduction
    nr_topics = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Número de tópicos (auto si es null)'
    )

    # Words per topic
    num_words = models.IntegerField(
        default=10,
        verbose_name='Palabras por tópico'
    )

    # Random seed
    random_seed = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Semilla aleatoria'
    )

    # ============================================================
    # STATUS & PROGRESS
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
        verbose_name='Etapa actual'
    )
    progress_percentage = models.IntegerField(
        default=0,
        verbose_name='Progreso (%)'
    )
    error_message = models.TextField(
        blank=True,
        null=True,
        verbose_name='Mensaje de error'
    )

    # ============================================================
    # RESULTS - GENERAL STATISTICS
    # ============================================================

    documents_processed = models.IntegerField(
        default=0,
        verbose_name='Documentos procesados'
    )
    vocabulary_size = models.IntegerField(
        default=0,
        verbose_name='Tamaño del vocabulario'
    )
    num_topics_found = models.IntegerField(
        default=0,
        verbose_name='Número de tópicos encontrados'
    )
    coherence_score = models.FloatField(
        null=True,
        blank=True,
        verbose_name='Coherencia (C_V)'
    )
    num_outliers = models.IntegerField(
        default=0,
        verbose_name='Documentos outliers (tópico -1)'
    )

    # ============================================================
    # RESULTS - DETAILED DATA (JSON)
    # ============================================================

    topics = models.JSONField(
        default=list,
        verbose_name='Tópicos extraídos',
        help_text='Lista de tópicos con palabras y pesos'
    )
    document_topics = models.JSONField(
        default=list,
        verbose_name='Documentos por tópico',
        help_text='Asignación de documentos a tópicos'
    )
    topic_distribution = models.JSONField(
        default=list,
        verbose_name='Distribución de tópicos',
        help_text='Cantidad de documentos por tópico'
    )
    topic_sizes = models.JSONField(
        default=dict,
        verbose_name='Tamaños de tópicos',
        help_text='Número de documentos por tópico (incluyendo outliers)'
    )
    projections_2d = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Proyecciones 2D',
        help_text='Coordenadas PCA, t-SNE y UMAP por documento para visualización'
    )

    # ============================================================
    # TIMESTAMPS
    # ============================================================

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado')
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

    class Meta:
        verbose_name = 'Análisis BERTopic'
        verbose_name_plural = 'Análisis BERTopic'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_by', '-created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"

    @property
    def status_display(self):
        return self.get_status_display()

    @property
    def current_stage_display(self):
        return self.get_current_stage_display()

    @property
    def embedding_model_display(self):
        return self.get_embedding_model_display()

    @property
    def source_name(self):
        """Retorna el nombre de la fuente de datos"""
        if self.source_type == self.SOURCE_DATA_PREPARATION and self.data_preparation:
            return self.data_preparation.name
        elif self.source_type == self.SOURCE_DATASET and self.dataset:
            return self.dataset.name
        return 'N/A'
