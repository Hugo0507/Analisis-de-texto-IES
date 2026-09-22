"""
Clasificación LSTM para el dashboard público.

Solo análisis completados y sin el binario del modelo: el dashboard muestra
métricas, la comparación con la línea base, la matriz de confusión y la curva
de pérdida.
"""

from rest_framework import serializers, viewsets
from rest_framework.permissions import AllowAny

from apps.lstm_analysis.models import LstmAnalysis

from .base import PublicAPIPagination

CAMPOS_LISTA = [
    'id', 'name', 'label_mode', 'fragment_words',
    'data_preparation', 'data_preparation_name', 'dataset_id',
    'topic_modeling', 'topic_modeling_name', 'topic_modeling_algorithm',
    'documents_used', 'samples_used', 'num_classes',
    'accuracy', 'macro_f1', 'baseline_accuracy', 'baseline_macro_f1',
    'fragment_accuracy', 'fragment_macro_f1',
    'num_epochs', 'training_time_seconds', 'created_at', 'processing_completed_at',
]

CAMPOS_DETALLE = CAMPOS_LISTA + [
    'description', 'label_mode_display',
    'embedding_dim', 'hidden_dim', 'num_layers', 'learning_rate', 'batch_size',
    'train_split', 'max_vocab_size', 'max_seq_length', 'vocab_size_actual',
    'loss_history', 'confusion_matrix', 'classification_report', 'class_labels',
]


class PublicLstmListSerializer(serializers.ModelSerializer):
    data_preparation_name = serializers.CharField(source='data_preparation.name', read_only=True)
    dataset_id = serializers.IntegerField(source='data_preparation.dataset_id', read_only=True)
    topic_modeling_name = serializers.CharField(source='topic_modeling.name', read_only=True)
    topic_modeling_algorithm = serializers.CharField(source='topic_modeling.algorithm', read_only=True)

    class Meta:
        model = LstmAnalysis
        fields = CAMPOS_LISTA


class PublicLstmDetailSerializer(PublicLstmListSerializer):
    label_mode_display = serializers.CharField(source='get_label_mode_display', read_only=True)

    class Meta:
        model = LstmAnalysis
        fields = CAMPOS_DETALLE


class PublicLstmAnalysisViewSet(viewsets.ReadOnlyModelViewSet):
    """Análisis LSTM completados, de solo lectura."""

    permission_classes = [AllowAny]
    pagination_class = PublicAPIPagination

    def get_queryset(self):
        qs = LstmAnalysis.objects.filter(status='completed').select_related(
            'data_preparation', 'topic_modeling',
        ).defer('model_artifact_bin').order_by('-created_at')
        dataset_id = self.request.query_params.get('dataset_id')
        if dataset_id:
            qs = qs.filter(data_preparation__dataset_id=dataset_id)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return PublicLstmListSerializer
        return PublicLstmDetailSerializer
