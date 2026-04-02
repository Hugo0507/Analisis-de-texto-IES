"""
LSTM Analysis Serializers
"""

from rest_framework import serializers
from .models import LstmAnalysis
from apps.data_preparation.models import DataPreparation
from apps.topic_modeling.models import TopicModeling


class LstmListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    data_preparation_name = serializers.CharField(
        source='data_preparation.name', read_only=True
    )
    topic_modeling_name = serializers.CharField(
        source='topic_modeling.name', read_only=True
    )

    class Meta:
        model = LstmAnalysis
        fields = [
            'id', 'name', 'description',
            'data_preparation', 'data_preparation_name',
            'topic_modeling', 'topic_modeling_name',
            'num_epochs', 'accuracy',
            'status', 'status_display', 'progress_percentage',
            'documents_used', 'num_classes',
            'created_by_username', 'created_at',
        ]


class LstmDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    current_stage_display = serializers.CharField(
        source='get_current_stage_display', read_only=True
    )
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    data_preparation_name = serializers.CharField(
        source='data_preparation.name', read_only=True
    )
    topic_modeling_name = serializers.CharField(
        source='topic_modeling.name', read_only=True
    )

    class Meta:
        model = LstmAnalysis
        fields = [
            'id', 'name', 'description', 'created_by', 'created_by_username',
            'data_preparation', 'data_preparation_name',
            'topic_modeling', 'topic_modeling_name',
            'embedding_dim', 'hidden_dim', 'num_layers',
            'num_epochs', 'learning_rate', 'batch_size',
            'train_split', 'max_vocab_size', 'max_seq_length',
            'status', 'status_display', 'current_stage', 'current_stage_display',
            'progress_percentage', 'error_message',
            'accuracy', 'training_time_seconds',
            'documents_used', 'num_classes', 'vocab_size_actual',
            'loss_history', 'confusion_matrix', 'classification_report', 'class_labels',
            'created_at', 'updated_at', 'processing_started_at', 'processing_completed_at',
        ]


class LstmCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LstmAnalysis
        fields = [
            'name', 'description',
            'data_preparation', 'topic_modeling',
            'embedding_dim', 'hidden_dim', 'num_layers',
            'num_epochs', 'learning_rate', 'batch_size',
            'train_split', 'max_vocab_size', 'max_seq_length',
        ]

    def validate(self, data):
        dp = data.get('data_preparation')
        tm = data.get('topic_modeling')

        if dp and dp.status != 'completed':
            raise serializers.ValidationError({
                'data_preparation': 'La preparación de datos debe estar completada.'
            })

        if tm and tm.status != 'completed':
            raise serializers.ValidationError({
                'topic_modeling': 'El modelo de temas debe estar completado.'
            })

        train_split = data.get('train_split', 0.8)
        if not (0.5 <= train_split <= 0.95):
            raise serializers.ValidationError({
                'train_split': 'La proporción de entrenamiento debe estar entre 0.5 y 0.95.'
            })

        num_epochs = data.get('num_epochs', 20)
        if not (1 <= num_epochs <= 200):
            raise serializers.ValidationError({
                'num_epochs': 'Las épocas deben estar entre 1 y 200.'
            })

        return data

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class LstmProgressSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    current_stage_display = serializers.CharField(
        source='get_current_stage_display', read_only=True
    )

    class Meta:
        model = LstmAnalysis
        fields = [
            'status', 'status_display',
            'current_stage', 'current_stage_display',
            'progress_percentage', 'error_message',
        ]
