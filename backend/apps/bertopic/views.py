"""
BERTopic Views

ViewSet para gestionar análisis de BERTopic.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count

from .models import BERTopicAnalysis
from .serializers import (
    BERTopicListSerializer,
    BERTopicDetailSerializer,
    BERTopicCreateSerializer,
    BERTopicUpdateSerializer,
    ProgressSerializer,
    StatsSerializer
)

logger = logging.getLogger(__name__)


class BERTopicViewSet(viewsets.ModelViewSet):
    """
    ViewSet para BERTopic.

    Endpoints:
    - GET /bertopic/ - Listar análisis BERTopic
    - POST /bertopic/ - Crear análisis BERTopic
    - GET /bertopic/{id}/ - Detalle de análisis BERTopic
    - PATCH /bertopic/{id}/ - Actualizar análisis BERTopic
    - DELETE /bertopic/{id}/ - Eliminar análisis BERTopic
    - GET /bertopic/{id}/progress/ - Obtener progreso
    - GET /bertopic/stats/ - Estadísticas generales
    - GET /bertopic/embedding_models/ - Lista de modelos de embeddings
    """

    permission_classes = [IsAuthenticated]
    queryset = BERTopicAnalysis.objects.all()

    def get_queryset(self):
        """Filtrar por usuario actual"""
        return BERTopicAnalysis.objects.filter(created_by=self.request.user)

    def get_serializer_class(self):
        """Retornar serializer según acción"""
        if self.action == 'list':
            return BERTopicListSerializer
        elif self.action == 'create':
            return BERTopicCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return BERTopicUpdateSerializer
        elif self.action == 'progress':
            return ProgressSerializer
        elif self.action == 'stats':
            return StatsSerializer
        else:
            return BERTopicDetailSerializer

    def create(self, request, *args, **kwargs):
        """
        Crear nuevo análisis BERTopic e iniciar procesamiento en background.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Crear análisis BERTopic en estado pending
        bertopic = serializer.save()

        # Iniciar procesamiento en background thread
        from .processor import start_processing_thread
        start_processing_thread(bertopic.id)

        # Retornar análisis BERTopic creado
        response_serializer = BERTopicDetailSerializer(bertopic)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Actualizar análisis BERTopic (solo nombre y descripción)."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        response_serializer = BERTopicDetailSerializer(instance)
        return Response(response_serializer.data)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """
        Obtener progreso de procesamiento en tiempo real.

        GET /bertopic/{id}/progress/
        """
        bertopic = self.get_object()
        serializer = ProgressSerializer(bertopic)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Obtener estadísticas generales de análisis BERTopic del usuario.

        GET /bertopic/stats/
        """
        analyses = self.get_queryset()

        # Total
        total = analyses.count()

        # Por estado
        by_status = dict(
            analyses.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )

        # Por modelo de embeddings
        by_embedding_model = dict(
            analyses.values('embedding_model')
            .annotate(count=Count('id'))
            .values_list('embedding_model', 'count')
        )

        data = {
            'total': total,
            'by_status': by_status,
            'by_embedding_model': by_embedding_model,
        }

        serializer = StatsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def embedding_models(self, request):
        """
        Obtener información sobre los modelos de embeddings disponibles.

        GET /bertopic/embedding_models/
        """
        models = [
            {
                'id': 'all-MiniLM-L6-v2',
                'name': 'MiniLM-L6-v2',
                'full_name': 'all-MiniLM-L6-v2',
                'language': 'English',
                'size_mb': 80,
                'speed': 'very_fast',
                'quality': 'good',
                'description': 'Modelo pequeño y rápido, ideal para la mayoría de casos. Mejor balance velocidad/calidad.',
                'pros': [
                    'Muy rápido (hasta 14,000 oraciones/segundo)',
                    'Bajo consumo de memoria (80 MB)',
                    'Excelente para datasets grandes',
                    'Buena calidad de embeddings'
                ],
                'cons': [
                    'Solo inglés',
                    'Calidad inferior a modelos grandes'
                ],
                'use_cases': 'Ideal para análisis generales, datasets grandes, entornos con recursos limitados',
                'recommended': True
            },
            {
                'id': 'all-mpnet-base-v2',
                'name': 'MPNet',
                'full_name': 'all-mpnet-base-v2',
                'language': 'English',
                'size_mb': 420,
                'speed': 'fast',
                'quality': 'excellent',
                'description': 'Modelo de alta calidad basado en MPNet. Mejor rendimiento general que MiniLM.',
                'pros': [
                    'Mejor calidad de embeddings',
                    'Excelente comprensión semántica',
                    'Estado del arte en varios benchmarks',
                    'Velocidad razonable (2,800 oraciones/segundo)'
                ],
                'cons': [
                    'Solo inglés',
                    'Mayor tamaño (420 MB)',
                    'Más lento que MiniLM'
                ],
                'use_cases': 'Cuando necesitas máxima calidad, datasets medianos, análisis críticos',
                'recommended': False
            },
            {
                'id': 'paraphrase-multilingual-MiniLM-L12-v2',
                'name': 'Multilingual',
                'full_name': 'paraphrase-multilingual-MiniLM-L12-v2',
                'language': 'Multilingual (50+ idiomas)',
                'size_mb': 470,
                'speed': 'moderate',
                'quality': 'good',
                'description': 'Modelo multilingüe que soporta 50+ idiomas incluyendo español e inglés.',
                'pros': [
                    'Soporta 50+ idiomas (español, inglés, etc.)',
                    'Ideal para corpus multilingües',
                    'Buena calidad en múltiples idiomas',
                    'Puede comparar textos entre idiomas'
                ],
                'cons': [
                    'Más lento que modelos monolingües',
                    'Mayor tamaño (470 MB)',
                    'Calidad ligeramente inferior a modelos especializados'
                ],
                'use_cases': 'Textos en español, corpus multilingües, comparaciones entre idiomas',
                'recommended': False
            }
        ]

        return Response({'embedding_models': models})
