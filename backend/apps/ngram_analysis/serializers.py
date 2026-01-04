"""
Ngram Analysis Serializers
"""

from rest_framework import serializers
from .models import NgramAnalysis


class NgramAnalysisListSerializer(serializers.ModelSerializer):
    """
    Serializer para lista de análisis de N-gramas.
    """
    data_preparation_name = serializers.CharField(read_only=True)
    dataset_name = serializers.CharField(read_only=True)
    created_by_email = serializers.CharField(read_only=True)
    status_label = serializers.CharField(read_only=True)
    current_stage_label = serializers.CharField(read_only=True)

    class Meta:
        model = NgramAnalysis
        fields = [
            'id',
            'name',
            'description',
            'data_preparation',
            'data_preparation_name',
            'dataset_name',
            'created_by_email',
            'total_configurations',
            'document_count',
            'status',
            'status_label',
            'current_stage',
            'current_stage_label',
            'progress_percentage',
            'created_at',
            'updated_at',
        ]


class NgramAnalysisDetailSerializer(serializers.ModelSerializer):
    """
    Serializer detallado para análisis de N-gramas.
    """
    data_preparation_name = serializers.CharField(read_only=True)
    dataset_name = serializers.CharField(read_only=True)
    created_by_email = serializers.CharField(read_only=True)
    status_label = serializers.CharField(read_only=True)
    current_stage_label = serializers.CharField(read_only=True)

    class Meta:
        model = NgramAnalysis
        fields = [
            'id',
            'name',
            'description',
            'data_preparation',
            'data_preparation_name',
            'dataset_name',
            'created_by',
            'created_by_email',
            'ngram_configurations',
            'max_features',
            'min_df',
            'max_df',
            'document_count',
            'total_configurations',
            'results',
            'comparisons',
            'status',
            'status_label',
            'current_stage',
            'current_stage_label',
            'progress_percentage',
            'error_message',
            'created_at',
            'processing_started_at',
            'processing_completed_at',
            'updated_at',
        ]


class NgramAnalysisCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear análisis de N-gramas.
    """

    class Meta:
        model = NgramAnalysis
        fields = [
            'name',
            'description',
            'data_preparation',
            'ngram_configurations',
            'max_features',
            'min_df',
            'max_df',
        ]

    def validate_ngram_configurations(self, value):
        """
        Validar que las configuraciones sean válidas.
        """
        if not value:
            raise serializers.ValidationError(
                "Debes especificar al menos una configuración de n-gramas"
            )

        for config in value:
            if not isinstance(config, list) or len(config) != 2:
                raise serializers.ValidationError(
                    f"Configuración inválida: {config}. Debe ser [min, max]"
                )

            min_n, max_n = config
            if min_n < 1:
                raise serializers.ValidationError(
                    f"El n-grama mínimo debe ser al menos 1 (recibido: {min_n})"
                )
            if max_n < min_n:
                raise serializers.ValidationError(
                    f"El n-grama máximo ({max_n}) debe ser >= al mínimo ({min_n})"
                )

        return value

    def validate_max_features(self, value):
        """Validar max_features."""
        if value <= 0:
            raise serializers.ValidationError(
                "El número máximo de features debe ser mayor a 0"
            )
        return value

    def validate_min_df(self, value):
        """Validar min_df."""
        if value < 1:
            raise serializers.ValidationError(
                "La frecuencia mínima debe ser al menos 1"
            )
        return value

    def validate_max_df(self, value):
        """Validar max_df."""
        if value <= 0 or value > 1:
            raise serializers.ValidationError(
                "La frecuencia máxima debe estar entre 0 y 1"
            )
        return value

    def create(self, validated_data):
        """
        Crear análisis y calcular total_configurations.
        """
        validated_data['total_configurations'] = len(
            validated_data.get('ngram_configurations', [])
        )
        return super().create(validated_data)


class NgramAnalysisProgressSerializer(serializers.ModelSerializer):
    """
    Serializer para actualizar progreso del análisis.
    """
    status_label = serializers.CharField(read_only=True)
    current_stage_label = serializers.CharField(read_only=True)

    class Meta:
        model = NgramAnalysis
        fields = [
            'id',
            'status',
            'status_label',
            'current_stage',
            'current_stage_label',
            'progress_percentage',
            'error_message',
        ]
        read_only_fields = fields
