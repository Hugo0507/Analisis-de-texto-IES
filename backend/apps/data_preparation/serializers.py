"""
Data Preparation Serializers

Serializers para la preparación de datos NLP.
"""

from rest_framework import serializers
from .models import DataPreparation
from apps.datasets.models import Dataset, DatasetFile


class DatasetBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para Dataset (solo para referencia)."""

    class Meta:
        model = Dataset
        fields = ['id', 'name']


class DataPreparationListSerializer(serializers.ModelSerializer):
    """
    Serializer para listar preparaciones (tabla).

    Incluye solo campos necesarios para la vista de lista.
    """

    dataset_name = serializers.CharField(source='dataset.name', read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    current_stage_label = serializers.SerializerMethodField()

    class Meta:
        model = DataPreparation
        fields = [
            'id',
            'name',
            'dataset_name',
            'created_by_email',
            'predominant_language',
            'status',
            'progress_percentage',
            'current_stage_label',
            'created_at',
        ]
        read_only_fields = fields

    def get_current_stage_label(self, obj):
        """Obtener etiqueta legible de la etapa actual."""
        if not obj.current_stage:
            return None

        stage_labels = dict(DataPreparation.STAGE_CHOICES)
        return stage_labels.get(obj.current_stage, obj.current_stage)


class DataPreparationDetailSerializer(serializers.ModelSerializer):
    """
    Serializer para detalle completo de preparación.

    Incluye todos los campos y configuraciones aplicadas.
    """

    dataset = DatasetBasicSerializer(read_only=True)
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    current_stage_label = serializers.SerializerMethodField()
    total_tokens = serializers.SerializerMethodField()
    avg_tokens_per_doc = serializers.SerializerMethodField()

    class Meta:
        model = DataPreparation
        fields = [
            # Identificación
            'id',
            'name',
            'dataset',

            # Configuración - Limpieza
            'custom_stopwords',
            'filter_by_predominant_language',

            # Configuración - Transformación
            'enable_tokenization',
            'enable_lemmatization',
            'enable_special_chars_removal',

            # Configuración - Validación
            'enable_integrity_check',
            'enable_duplicate_removal',

            # Estado y Progreso
            'status',
            'current_stage',
            'current_stage_label',
            'progress_percentage',
            'error_message',

            # Resultados - Idiomas
            'detected_languages',
            'predominant_language',
            'predominant_language_percentage',

            # Resultados - Estadísticas
            'total_files_analyzed',
            'files_processed',
            'files_omitted',
            'duplicates_removed',
            'total_tokens',
            'avg_tokens_per_doc',

            # Metadatos
            'processing_started_at',
            'processing_completed_at',
            'created_at',
            'updated_at',
            'created_by_email',
        ]
        read_only_fields = [
            'id',
            'dataset',
            'status',
            'current_stage',
            'current_stage_label',
            'progress_percentage',
            'error_message',
            'detected_languages',
            'predominant_language',
            'predominant_language_percentage',
            'total_files_analyzed',
            'files_processed',
            'files_omitted',
            'duplicates_removed',
            'processing_started_at',
            'processing_completed_at',
            'created_at',
            'updated_at',
            'created_by_email',
        ]

    def get_current_stage_label(self, obj):
        """Obtener etiqueta legible de la etapa actual."""
        if not obj.current_stage:
            return None

        stage_labels = dict(DataPreparation.STAGE_CHOICES)
        return stage_labels.get(obj.current_stage, obj.current_stage)

    def _get_token_counts(self, obj):
        """Calcular total y promedio de tokens desde los archivos procesados."""
        file_ids = obj.processed_file_ids or []
        if not file_ids:
            return 0, 0
        files = DatasetFile.objects.filter(id__in=file_ids).only('preprocessed_text')
        total = 0
        count = 0
        for f in files:
            text = f.preprocessed_text or ''
            if text.strip():
                total += len(text.split())
                count += 1
        avg = round(total / count) if count > 0 else 0
        return total, avg

    def get_total_tokens(self, obj):
        total, _ = self._get_token_counts(obj)
        return total

    def get_avg_tokens_per_doc(self, obj):
        _, avg = self._get_token_counts(obj)
        return avg


class DataPreparationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear nueva preparación.

    Solo acepta campos editables por el usuario.
    """

    dataset_id = serializers.PrimaryKeyRelatedField(
        queryset=Dataset.objects.all(),
        source='dataset',
        write_only=True
    )

    class Meta:
        model = DataPreparation
        fields = [
            'name',
            'dataset_id',
            'custom_stopwords',
            'filter_by_predominant_language',
            'enable_tokenization',
            'enable_lemmatization',
            'enable_special_chars_removal',
            'enable_integrity_check',
            'enable_duplicate_removal',
        ]

    def create(self, validated_data):
        """
        Crear preparación y asignar usuario actual.
        """
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ProgressSerializer(serializers.Serializer):
    """
    Serializer para progreso en tiempo real.

    Usado por el endpoint de progress polling.
    """

    status = serializers.CharField()
    progress_percentage = serializers.IntegerField()
    current_stage = serializers.CharField(allow_null=True)
    current_stage_label = serializers.CharField(allow_null=True)
    error_message = serializers.CharField(allow_null=True)


class StatsSerializer(serializers.Serializer):
    """
    Serializer para estadísticas generales.

    Usado por el endpoint de stats.
    """

    total_preparations = serializers.IntegerField()
    processing = serializers.IntegerField()
    completed = serializers.IntegerField()
    failed = serializers.IntegerField()
