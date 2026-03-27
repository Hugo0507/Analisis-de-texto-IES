"""
Workspace Serializers
"""

from rest_framework import serializers
from .models import Workspace, WorkspaceDocument


class WorkspaceDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceDocument
        fields = [
            'id', 'original_filename', 'file_size', 'status',
            'error_message', 'detected_language', 'language_confidence',
            'created_at',
        ]
        read_only_fields = fields


class WorkspaceSerializer(serializers.ModelSerializer):
    documents = WorkspaceDocumentSerializer(many=True, read_only=True)
    dataset_name = serializers.CharField(source='dataset.name', read_only=True)
    document_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id', 'dataset', 'dataset_name',
            'bow_id', 'tfidf_id', 'topic_model_id',
            'status', 'progress_percentage', 'error_message',
            'results', 'documents', 'document_count',
            'created_at', 'updated_at', 'expires_at',
        ]
        read_only_fields = [
            'id', 'status', 'progress_percentage', 'error_message',
            'results', 'documents', 'document_count',
            'created_at', 'updated_at',
        ]

    def get_document_count(self, obj):
        return obj.documents.count()


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ['dataset', 'bow_id', 'tfidf_id', 'topic_model_id']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class WorkspaceUploadSerializer(serializers.Serializer):
    """Serializer para subida de un PDF al workspace."""
    file = serializers.FileField()

    def validate_file(self, value):
        allowed_types = ['application/pdf']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                f"Solo se permiten archivos PDF. "
                f"Recibido: {value.content_type}. "
                "Selecciona un archivo con extensión .pdf e inténtalo de nuevo."
            )
        max_size = 50 * 1024 * 1024  # 50 MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"El archivo excede el tamaño máximo permitido de 50 MB."
            )
        return value
