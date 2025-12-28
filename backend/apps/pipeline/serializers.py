"""
Serializers for Pipeline app.

Contains serializers for:
- PipelineExecution: Metadata de ejecuciones del pipeline
"""

from rest_framework import serializers
from .models import PipelineExecution


class PipelineExecutionSerializer(serializers.ModelSerializer):
    """
    Serializer para el modelo PipelineExecution.
    """
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    is_running = serializers.BooleanField(read_only=True)
    is_completed = serializers.BooleanField(read_only=True)
    has_failed = serializers.BooleanField(read_only=True)

    class Meta:
        model = PipelineExecution
        fields = [
            'id',
            'execution_id',
            'stage_name',
            'status',
            'status_display',
            'started_at',
            'completed_at',
            'duration_seconds',
            'cache_hit',
            'config_hash',
            'error_message',
            'created_at',
            'updated_at',
            'is_running',
            'is_completed',
            'has_failed',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PipelineExecutionListSerializer(serializers.ModelSerializer):
    """
    Serializer ligero para listado de ejecuciones.
    No incluye error_message.
    """
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )

    class Meta:
        model = PipelineExecution
        fields = [
            'id',
            'execution_id',
            'stage_name',
            'status',
            'status_display',
            'started_at',
            'completed_at',
            'duration_seconds',
            'cache_hit',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class PipelineStageProgressSerializer(serializers.Serializer):
    """
    Serializer para progreso de una etapa (WebSocket).
    No este ligado a un modelo especefico.
    """
    execution_id = serializers.UUIDField()
    stage_name = serializers.CharField()
    status = serializers.CharField()
    progress_percent = serializers.IntegerField(min_value=0, max_value=100)
    message = serializers.CharField(required=False)
    started_at = serializers.DateTimeField(required=False)
    estimated_completion = serializers.DateTimeField(required=False)


class PipelineExecutionSummarySerializer(serializers.Serializer):
    """
    Serializer para resumen agregado de una ejecucien completa.
    """
    execution_id = serializers.UUIDField()
    total_stages = serializers.IntegerField()
    completed_stages = serializers.IntegerField()
    running_stages = serializers.IntegerField()
    failed_stages = serializers.IntegerField()
    skipped_stages = serializers.IntegerField()
    total_duration_seconds = serializers.IntegerField()
    cache_hits = serializers.IntegerField()
    cache_hit_rate = serializers.FloatField()
    started_at = serializers.DateTimeField()
    completed_at = serializers.DateTimeField(required=False)
    status = serializers.CharField()


class PipelineStartRequestSerializer(serializers.Serializer):
    """
    Serializer para validar request de inicio de pipeline.
    """
    drive_folder_id = serializers.CharField(
        max_length=255,
        required=False,
        help_text="ID de carpeta de Google Drive (opcional si ya hay documentos)"
    )
    force_refresh = serializers.BooleanField(
        default=False,
        help_text="Ignorar cache y recalcular todo"
    )
    stages_to_run = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Lista de etapas a ejecutar (opcional, por defecto todas)"
    )
