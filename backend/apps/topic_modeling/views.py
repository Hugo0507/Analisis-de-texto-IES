"""
Topic Modeling Views

ViewSet para gestionar análisis de Topic Modeling.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count

from .models import TopicModeling
from .serializers import (
    TopicModelingListSerializer,
    TopicModelingDetailSerializer,
    TopicModelingCreateSerializer,
    TopicModelingUpdateSerializer,
    ProgressSerializer,
    StatsSerializer
)

logger = logging.getLogger(__name__)


class TopicModelingViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Topic Modeling.

    Endpoints:
    - GET /topic-modeling/ - Listar topic modelings
    - POST /topic-modeling/ - Crear topic modeling
    - GET /topic-modeling/{id}/ - Detalle de topic modeling
    - PATCH /topic-modeling/{id}/ - Actualizar topic modeling
    - DELETE /topic-modeling/{id}/ - Eliminar topic modeling
    - GET /topic-modeling/{id}/progress/ - Obtener progreso
    - GET /topic-modeling/stats/ - Estadísticas generales
    - GET /topic-modeling/algorithms/ - Lista de algoritmos
    """

    permission_classes = [IsAuthenticated]
    queryset = TopicModeling.objects.all()

    def get_queryset(self):
        """Filtrar por usuario actual"""
        return TopicModeling.objects.filter(created_by=self.request.user)

    def get_serializer_class(self):
        """Retornar serializer según acción"""
        if self.action == 'list':
            return TopicModelingListSerializer
        elif self.action == 'create':
            return TopicModelingCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TopicModelingUpdateSerializer
        elif self.action == 'progress':
            return ProgressSerializer
        elif self.action == 'stats':
            return StatsSerializer
        else:
            return TopicModelingDetailSerializer

    def create(self, request, *args, **kwargs):
        """
        Crear nuevo topic modeling e iniciar procesamiento en background.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Crear topic modeling en estado pending
        topic_modeling = serializer.save()

        # Iniciar procesamiento en background thread
        from .processor import start_processing_thread
        start_processing_thread(topic_modeling.id)

        # Retornar topic modeling creado
        response_serializer = TopicModelingDetailSerializer(topic_modeling)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Actualizar topic modeling (solo nombre y descripción)."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        response_serializer = TopicModelingDetailSerializer(instance)
        return Response(response_serializer.data)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """
        Obtener progreso de procesamiento en tiempo real.

        GET /topic-modeling/{id}/progress/
        """
        topic_modeling = self.get_object()
        serializer = ProgressSerializer(topic_modeling)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Obtener estadísticas generales de topic modelings del usuario.

        GET /topic-modeling/stats/
        """
        queryset = self.get_queryset()

        # Contar por estado
        by_status = {}
        for choice in TopicModeling.STATUS_CHOICES:
            status_key = choice[0]
            count = queryset.filter(status=status_key).count()
            by_status[status_key] = count

        # Contar por algoritmo
        by_algorithm = {}
        for choice in TopicModeling.ALGORITHM_CHOICES:
            algorithm_key = choice[0]
            count = queryset.filter(algorithm=algorithm_key).count()
            by_algorithm[algorithm_key] = count

        data = {
            'total': queryset.count(),
            'by_status': by_status,
            'by_algorithm': by_algorithm
        }

        serializer = StatsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def algorithms(self, request):
        """
        Obtener información sobre los algoritmos disponibles.

        GET /topic-modeling/algorithms/
        """
        algorithms = [
            {
                'id': 'lsa',
                'name': 'LSA',
                'full_name': 'Latent Semantic Analysis',
                'category': 'Non-Probabilistic',
                'description': 'Análisis semántico latente mediante SVD (Singular Value Decomposition). '
                             'Rápido y eficiente para datasets grandes.',
                'pros': [
                    'Muy rápido y escalable',
                    'Ideal para datasets grandes',
                    'Robusto con datos ruidosos'
                ],
                'cons': [
                    'No garantiza componentes no-negativos',
                    'Difícil interpretación de valores negativos'
                ],
                'use_cases': 'Búsqueda semántica, reducción de dimensionalidad, exploración inicial'
            },
            {
                'id': 'nmf',
                'name': 'NMF',
                'full_name': 'Non-negative Matrix Factorization',
                'category': 'Non-Probabilistic',
                'description': 'Factorización matricial no-negativa. Produce temas más interpretables '
                             'con componentes solo positivas.',
                'pros': [
                    'Temas altamente interpretables',
                    'Solo componentes no-negativas',
                    'Buen balance velocidad/calidad'
                ],
                'cons': [
                    'Sensible a inicialización',
                    'Puede quedar en mínimos locales'
                ],
                'use_cases': 'Análisis exploratorio, clustering de documentos, recomendación'
            },
            {
                'id': 'plsa',
                'name': 'PLSA',
                'full_name': 'Probabilistic Latent Semantic Analysis',
                'category': 'Probabilistic',
                'description': 'Modelo probabilístico que asume una distribución multinomial. '
                             'Permite calcular probabilidades de temas por documento.',
                'pros': [
                    'Interpretación probabilística clara',
                    'Modela incertidumbre',
                    'Coherencia teórica sólida'
                ],
                'cons': [
                    'Más lento que LSA/NMF',
                    'Propenso a overfitting',
                    'No generaliza a documentos nuevos'
                ],
                'use_cases': 'Análisis de contenido, categorización temática'
            },
            {
                'id': 'lda',
                'name': 'LDA',
                'full_name': 'Latent Dirichlet Allocation',
                'category': 'Probabilistic',
                'description': 'Modelo bayesiano generativo. El estándar de facto para topic modeling. '
                             'Asume distribuciones Dirichlet para temas y palabras.',
                'pros': [
                    'Más usado y estudiado',
                    'Generaliza a documentos nuevos',
                    'Modelado probabilístico robusto',
                    'Evita overfitting con priors Dirichlet'
                ],
                'cons': [
                    'Más lento que LSA/NMF',
                    'Requiere tuning de hiperparámetros',
                    'Sensible al número de temas'
                ],
                'use_cases': 'Análisis de contenido profundo, descubrimiento de temas, investigación'
            }
        ]

        return Response({'algorithms': algorithms})
