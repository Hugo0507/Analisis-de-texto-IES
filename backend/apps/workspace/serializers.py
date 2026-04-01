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
            'bow_id', 'tfidf_id', 'topic_model_id', 'ner_id', 'bertopic_id',
            'custom_stopwords', 'inference_params',
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
        fields = [
            'dataset',
            'bow_id', 'tfidf_id', 'topic_model_id', 'ner_id', 'bertopic_id',
            'custom_stopwords', 'inference_params',
        ]

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class WorkspaceUploadSerializer(serializers.Serializer):
    """Serializer para subida de un PDF al workspace."""
    file = serializers.FileField()

    def validate_file(self, value):
        import os

        # Verificar extensión .pdf (case-insensitive)
        ext = os.path.splitext(value.name)[1].lower()
        if ext != '.pdf':
            raise serializers.ValidationError(
                f"Solo se permiten archivos PDF (.pdf). "
                f"El archivo '{value.name}' no tiene extensión .pdf."
            )

        # Verificar content_type: aceptar 'application/pdf' directamente,
        # o tipos genéricos (application/octet-stream, binary/octet-stream, etc.)
        # cuando la extensión ya confirmó que es un PDF.
        # Algunos browsers/OS envían PDFs con content_type genérico.
        pdf_content_types = {'application/pdf'}
        generic_content_types = {
            'application/octet-stream',
            'binary/octet-stream',
            'application/force-download',
            'application/download',
        }
        if value.content_type not in pdf_content_types and value.content_type not in generic_content_types:
            raise serializers.ValidationError(
                f"Solo se permiten archivos PDF. "
                f"Tipo recibido: '{value.content_type}'. "
                "Selecciona un archivo .pdf e inténtalo de nuevo."
            )

        max_size = 50 * 1024 * 1024  # 50 MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"El archivo excede el tamaño máximo permitido de 50 MB. "
                f"Tamaño recibido: {value.size // (1024 * 1024):.1f} MB."
            )
        return value
