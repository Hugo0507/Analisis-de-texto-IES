"""
Bag of Words Views

ViewSet para gestión de análisis de Bolsa de Palabras.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import BagOfWords
from .serializers import (
    BagOfWordsListSerializer,
    BagOfWordsDetailSerializer,
    BagOfWordsCreateSerializer,
    BagOfWordsUpdateSerializer,
    ProgressSerializer,
    StatsSerializer,
)

logger = logging.getLogger(__name__)


class BagOfWordsViewSet(viewsets.ModelViewSet):
    """
    ViewSet para operaciones CRUD de Bolsa de Palabras.

    list: Listar todos los análisis BoW del usuario
    create: Crear nuevo análisis e iniciar procesamiento
    retrieve: Ver detalle completo de un análisis
    update: Actualizar nombre/descripción
    destroy: Eliminar un análisis
    progress: Obtener progreso en tiempo real
    stats: Obtener estadísticas generales
    """

    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination - return plain array
    queryset = BagOfWords.objects.all().select_related(
        'data_preparation',
        'data_preparation__dataset',
        'created_by'
    )

    def get_queryset(self):
        """
        Filtrar análisis por usuario actual.

        Los usuarios solo pueden ver sus propios análisis.
        """
        return self.queryset.filter(created_by=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        """
        Usar serializer apropiado según la acción.
        """
        if self.action == 'list':
            return BagOfWordsListSerializer
        elif self.action == 'create':
            return BagOfWordsCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return BagOfWordsUpdateSerializer
        elif self.action == 'progress':
            return ProgressSerializer
        elif self.action == 'stats':
            return StatsSerializer
        else:
            return BagOfWordsDetailSerializer

    def create(self, request, *args, **kwargs):
        """
        Crear nuevo análisis BoW e iniciar procesamiento en background.

        El procesamiento se ejecuta en un thread separado para no bloquear la respuesta.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Crear análisis en estado pending
        bow = serializer.save()

        # Iniciar procesamiento en background thread
        from .processor import start_processing_thread
        start_processing_thread(bow.id)

        # Retornar análisis creado
        response_serializer = BagOfWordsDetailSerializer(bow)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """
        Actualizar análisis BoW (solo nombre y descripción).
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        response_serializer = BagOfWordsDetailSerializer(instance)
        return Response(response_serializer.data)

    def destroy(self, request, *args, **kwargs):
        """
        Eliminar análisis BoW.

        Se puede eliminar incluso si está en proceso.
        El thread continuará ejecutándose pero sin acceso a la base de datos.
        """
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """
        Obtener progreso en tiempo real de un análisis.

        Endpoint: GET /api/v1/bag-of-words/{id}/progress/

        Usado por el frontend para polling cada 2-3 segundos.
        """
        bow = self.get_object()

        # Obtener etiqueta de la etapa
        stage_labels = dict(BagOfWords.STAGE_CHOICES)
        current_stage_label = stage_labels.get(bow.current_stage, bow.current_stage)

        data = {
            'status': bow.status,
            'progress_percentage': bow.progress_percentage,
            'current_stage': bow.current_stage,
            'current_stage_label': current_stage_label,
            'error_message': bow.error_message,
        }

        serializer = ProgressSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Obtener estadísticas generales de análisis BoW.

        Endpoint: GET /api/v1/bag-of-words/stats/

        Retorna conteo de análisis por estado.
        """
        queryset = self.get_queryset()

        data = {
            'total_analyses': queryset.count(),
            'processing': queryset.filter(status=BagOfWords.STATUS_PROCESSING).count(),
            'completed': queryset.filter(status=BagOfWords.STATUS_COMPLETED).count(),
            'failed': queryset.filter(status=BagOfWords.STATUS_ERROR).count(),
        }

        serializer = StatsSerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def vocabulary(self, request, pk=None):
        """
        Obtener vocabulario completo del análisis.

        Endpoint: GET /api/v1/bag-of-words/{id}/vocabulary/

        Retorna el vocabulario con paginación opcional.
        """
        bow = self.get_object()

        if bow.status != BagOfWords.STATUS_COMPLETED:
            return Response(
                {'error': 'El análisis debe estar completado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parámetros de paginación
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 100))

        # Obtener vocabulario ordenado por score
        vocab_items = sorted(
            bow.vocabulary.items(),
            key=lambda x: x[1],
            reverse=True
        )

        # Paginar
        start = (page - 1) * page_size
        end = start + page_size
        paginated_items = vocab_items[start:end]

        data = {
            'total': len(vocab_items),
            'page': page,
            'page_size': page_size,
            'vocabulary': [
                {'term': term, 'index': idx}
                for term, idx in paginated_items
            ]
        }

        return Response(data)

    @action(detail=True, methods=['get'])
    def top_terms(self, request, pk=None):
        """
        Obtener top términos con sus scores.

        Endpoint: GET /api/v1/bag-of-words/{id}/top_terms/

        Query params:
        - limit: Número de términos a retornar (default: 50)
        """
        bow = self.get_object()

        if bow.status != BagOfWords.STATUS_COMPLETED:
            return Response(
                {'error': 'El análisis debe estar completado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        limit = int(request.query_params.get('limit', 50))

        # Obtener top términos (ya están ordenados)
        top_terms = bow.top_terms[:limit]

        data = {
            'total_vocabulary': bow.vocabulary_size,
            'returned': len(top_terms),
            'top_terms': top_terms
        }

        return Response(data)
