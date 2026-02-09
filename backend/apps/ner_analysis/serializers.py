"""
NER Analysis Serializers
"""

from rest_framework import serializers
from .models import NerAnalysis
from apps.data_preparation.models import DataPreparation
from apps.datasets.models import Dataset


class NerAnalysisListSerializer(serializers.ModelSerializer):
    """Serializer para lista de análisis NER."""

    source_name = serializers.SerializerMethodField()
    spacy_model_label = serializers.CharField(
        source='get_spacy_model_display',
        read_only=True
    )
    created_by_email = serializers.EmailField(
        source='created_by.email',
        read_only=True
    )
    current_stage_label = serializers.SerializerMethodField()
    entity_types_count = serializers.SerializerMethodField()

    class Meta:
        model = NerAnalysis
        fields = [
            'id',
            'name',
            'source_type',
            'source_name',
            'spacy_model',
            'spacy_model_label',
            'created_by_email',
            'status',
            'progress_percentage',
            'current_stage',
            'current_stage_label',
            'documents_processed',
            'total_entities_found',
            'unique_entities_count',
            'entity_types_count',
            'created_at',
        ]

    def get_source_name(self, obj):
        """Obtener nombre de la fuente."""
        return obj.source_name

    def get_current_stage_label(self, obj):
        """Obtener etiqueta de la etapa actual."""
        if obj.current_stage:
            stage_labels = dict(NerAnalysis.STAGE_CHOICES)
            return stage_labels.get(obj.current_stage, obj.current_stage)
        return None

    def get_entity_types_count(self, obj):
        """Número de tipos de entidades encontradas."""
        if obj.entity_types_found:
            return len(obj.entity_types_found)
        return 0


class NerAnalysisDetailSerializer(serializers.ModelSerializer):
    """Serializer para detalle completo de análisis NER."""

    source_info = serializers.SerializerMethodField()
    spacy_model_label = serializers.CharField(
        source='get_spacy_model_display',
        read_only=True
    )
    current_stage_label = serializers.SerializerMethodField()
    created_by_email = serializers.EmailField(
        source='created_by.email',
        read_only=True
    )

    class Meta:
        model = NerAnalysis
        fields = [
            'id',
            'name',
            'description',

            # Fuente de datos
            'source_type',
            'source_info',
            'created_by_email',

            # Configuración
            'spacy_model',
            'spacy_model_label',
            'selected_entities',

            # Estado
            'status',
            'current_stage',
            'current_stage_label',
            'progress_percentage',
            'error_message',

            # Resultados: Estadísticas
            'documents_processed',
            'total_entities_found',
            'unique_entities_count',
            'entity_types_found',

            # Resultados: Datos
            'entities',
            'top_entities_by_type',
            'cooccurrences',
            'entity_distribution',

            # Timestamps
            'created_at',
            'updated_at',
            'processing_started_at',
            'processing_completed_at',
        ]

    def get_source_info(self, obj):
        """Obtener información de la fuente de datos."""
        if obj.source_type == NerAnalysis.SOURCE_DATA_PREPARATION and obj.data_preparation:
            prep = obj.data_preparation
            return {
                'type': 'data_preparation',
                'id': prep.id,
                'name': prep.name,
                'dataset': {
                    'id': prep.dataset.id,
                    'name': prep.dataset.name,
                } if prep.dataset else None,
                'predominant_language': prep.predominant_language,
                'files_processed': prep.files_processed,
            }
        elif obj.source_type == NerAnalysis.SOURCE_DATASET and obj.dataset:
            dataset = obj.dataset
            return {
                'type': 'dataset',
                'id': dataset.id,
                'name': dataset.name,
                'total_files': dataset.total_files,
            }
        return None

    def get_current_stage_label(self, obj):
        """Obtener etiqueta de la etapa actual."""
        if obj.current_stage:
            stage_labels = dict(NerAnalysis.STAGE_CHOICES)
            return stage_labels.get(obj.current_stage, obj.current_stage)
        return None


class NerAnalysisCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear nuevo análisis NER."""

    class Meta:
        model = NerAnalysis
        fields = [
            'name',
            'description',
            'source_type',
            'data_preparation',
            'dataset',
            'spacy_model',
            'selected_entities',
        ]

    def validate(self, data):
        """Validaciones personalizadas."""
        source_type = data.get('source_type')
        data_preparation = data.get('data_preparation')
        dataset = data.get('dataset')

        # Validar que se proporcione la fuente correcta
        if source_type == NerAnalysis.SOURCE_DATA_PREPARATION:
            if not data_preparation:
                raise serializers.ValidationError({
                    'data_preparation': 'Debe seleccionar una preparación de datos.'
                })
            if data_preparation.status != DataPreparation.STATUS_COMPLETED:
                raise serializers.ValidationError({
                    'data_preparation': 'La preparación de datos debe estar completada.'
                })
            # Limpiar dataset si se seleccionó por error
            data['dataset'] = None

        elif source_type == NerAnalysis.SOURCE_DATASET:
            if not dataset:
                raise serializers.ValidationError({
                    'dataset': 'Debe seleccionar un dataset.'
                })
            if dataset.status != 'completed':
                raise serializers.ValidationError({
                    'dataset': 'El dataset debe estar completado.'
                })
            # Limpiar data_preparation si se seleccionó por error
            data['data_preparation'] = None

        # Validar que se hayan seleccionado entidades
        selected_entities = data.get('selected_entities', [])
        if not selected_entities:
            raise serializers.ValidationError({
                'selected_entities': 'Debe seleccionar al menos un tipo de entidad.'
            })

        return data

    def create(self, validated_data):
        """Crear nueva instancia de NerAnalysis."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        # Estado inicial
        validated_data['status'] = NerAnalysis.STATUS_PENDING
        validated_data['current_stage'] = NerAnalysis.STAGE_PENDING
        validated_data['progress_percentage'] = 0

        return super().create(validated_data)


class NerAnalysisUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar análisis NER."""

    class Meta:
        model = NerAnalysis
        fields = ['name', 'description']


class ProgressSerializer(serializers.Serializer):
    """Serializer para progreso en tiempo real."""

    status = serializers.CharField()
    progress_percentage = serializers.IntegerField()
    current_stage = serializers.CharField(allow_null=True)
    current_stage_label = serializers.CharField(allow_null=True)
    error_message = serializers.CharField(allow_null=True)


class StatsSerializer(serializers.Serializer):
    """Serializer para estadísticas generales."""

    total_analyses = serializers.IntegerField()
    processing = serializers.IntegerField()
    completed = serializers.IntegerField()
    failed = serializers.IntegerField()
