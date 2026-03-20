"""
Serializers for AI Analysis app.
"""

from rest_framework import serializers
from .models import AIAnalysisConfig, AIAnalysisResult, AIComparisonResult


class AIAnalysisConfigSerializer(serializers.ModelSerializer):
    """Serializer for AIAnalysisConfig model."""
    provider_display = serializers.CharField(
        source='get_provider_display', read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True
    )
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True, default=None
    )

    class Meta:
        model = AIAnalysisConfig
        fields = [
            'id', 'dataset', 'provider', 'provider_display',
            'model_name', 'prompt_template', 'status', 'status_display',
            'created_by', 'created_by_username',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'created_by', 'created_at', 'updated_at']


class AIAnalysisConfigCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating AIAnalysisConfig."""
    providers = serializers.ListField(
        child=serializers.ChoiceField(choices=['claude', 'gemini', 'openai']),
        required=False,
        default=['claude', 'gemini', 'openai'],
        write_only=True,
        help_text='Proveedores a ejecutar (se usa en la accion run)',
    )

    class Meta:
        model = AIAnalysisConfig
        fields = [
            'id', 'dataset', 'provider', 'model_name',
            'prompt_template', 'providers',
        ]

    def validate_prompt_template(self, value):
        if '{documents}' not in value:
            raise serializers.ValidationError(
                "El prompt debe contener el placeholder {documents}"
            )
        if '{n}' not in value:
            raise serializers.ValidationError(
                "El prompt debe contener el placeholder {n}"
            )
        return value


class AIAnalysisResultSerializer(serializers.ModelSerializer):
    """Serializer for AIAnalysisResult model."""
    provider_display = serializers.CharField(
        source='get_provider_display', read_only=True
    )

    class Meta:
        model = AIAnalysisResult
        fields = [
            'id', 'config', 'provider', 'provider_display',
            'raw_response', 'success_cases', 'identified_factors',
            'factor_comparison', 'tokens_used', 'processing_time_seconds',
            'error_message', 'created_at',
        ]
        read_only_fields = fields


class AIAnalysisResultListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing results (without raw_response)."""
    provider_display = serializers.CharField(
        source='get_provider_display', read_only=True
    )
    success_cases_count = serializers.SerializerMethodField()
    factors_count = serializers.SerializerMethodField()

    class Meta:
        model = AIAnalysisResult
        fields = [
            'id', 'config', 'provider', 'provider_display',
            'success_cases_count', 'factors_count',
            'tokens_used', 'processing_time_seconds',
            'error_message', 'created_at',
        ]
        read_only_fields = fields

    def get_success_cases_count(self, obj):
        return len(obj.success_cases) if obj.success_cases else 0

    def get_factors_count(self, obj):
        return len(obj.identified_factors) if obj.identified_factors else 0


class AIComparisonResultSerializer(serializers.ModelSerializer):
    """Serializer for AIComparisonResult model."""

    class Meta:
        model = AIComparisonResult
        fields = [
            'id', 'config', 'claude_result', 'gemini_result', 'openai_result',
            'consensus_factors', 'divergent_factors', 'nlp_agreement',
            'comparison_summary', 'created_at',
        ]
        read_only_fields = fields
