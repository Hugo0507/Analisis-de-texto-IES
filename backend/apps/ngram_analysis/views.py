"""
Ngram Analysis Views

ViewSet para gestión de análisis de N-gramas.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import NgramAnalysis
from .serializers import (
    NgramAnalysisListSerializer,
    NgramAnalysisDetailSerializer,
    NgramAnalysisCreateSerializer,
    NgramAnalysisProgressSerializer,
)

logger = logging.getLogger(__name__)


class NgramAnalysisViewSet(viewsets.ModelViewSet):
    """
    ViewSet para operaciones CRUD de análisis de N-gramas.

    list: Listar todos los análisis de N-gramas del usuario
    create: Crear nuevo análisis e iniciar procesamiento
    retrieve: Ver detalle completo con resultados y comparaciones
    destroy: Eliminar un análisis
    progress: Obtener progreso en tiempo real
    """

    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination - return plain array
    queryset = NgramAnalysis.objects.all().select_related(
        'data_preparation',
        'data_preparation__dataset',
        'created_by'
    )

    def get_queryset(self):
        """
        Filtrar análisis por usuario actual.
        """
        return self.queryset.filter(created_by=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        """
        Usar serializer apropiado según la acción.
        """
        if self.action == 'list':
            return NgramAnalysisListSerializer
        elif self.action == 'create':
            return NgramAnalysisCreateSerializer
        elif self.action == 'progress':
            return NgramAnalysisProgressSerializer
        else:
            return NgramAnalysisDetailSerializer

    def create(self, request, *args, **kwargs):
        """
        Crear nuevo análisis de N-gramas e iniciar procesamiento en background.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Agregar created_by
        serializer.validated_data['created_by'] = request.user

        # Crear análisis en estado pending
        ngram_analysis = serializer.save()

        # Iniciar procesamiento en background thread
        from .processor import start_processing_thread
        start_processing_thread(ngram_analysis.id)

        # Retornar análisis creado
        response_serializer = NgramAnalysisDetailSerializer(ngram_analysis)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        """
        Eliminar análisis de N-gramas.
        """
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """
        Obtener progreso en tiempo real de un análisis.

        Endpoint: GET /api/v1/ngram-analysis/{id}/progress/

        Usado por el frontend para polling cada 2-3 segundos.
        """
        ngram_analysis = self.get_object()

        data = {
            'status': ngram_analysis.status,
            'progress_percentage': ngram_analysis.progress_percentage,
            'current_stage': ngram_analysis.current_stage,
            'current_stage_label': ngram_analysis.current_stage_label,
            'error_message': ngram_analysis.error_message,
        }

        serializer = NgramAnalysisProgressSerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def comparison(self, request, pk=None):
        """
        Obtener comparación detallada entre configuraciones.

        Endpoint: GET /api/v1/ngram-analysis/{id}/comparison/

        Retorna análisis comparativo de todas las configuraciones.
        """
        ngram_analysis = self.get_object()

        if ngram_analysis.status != NgramAnalysis.STATUS_COMPLETED:
            return Response(
                {'error': 'El análisis debe estar completado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = {
            'configurations': ngram_analysis.ngram_configurations,
            'results': ngram_analysis.results,
            'comparisons': ngram_analysis.comparisons,
        }

        return Response(data)

    @action(detail=True, methods=['get'])
    def configuration_detail(self, request, pk=None):
        """
        Obtener detalle de una configuración específica.

        Endpoint: GET /api/v1/ngram-analysis/{id}/configuration_detail/?config=1_2

        Query params:
        - config: Clave de configuración (ej: "1_2" para (1,2))
        """
        ngram_analysis = self.get_object()

        if ngram_analysis.status != NgramAnalysis.STATUS_COMPLETED:
            return Response(
                {'error': 'El análisis debe estar completado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        config_key = request.query_params.get('config')
        if not config_key:
            return Response(
                {'error': 'Parámetro "config" requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if config_key not in ngram_analysis.results:
            return Response(
                {'error': f'Configuración "{config_key}" no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        data = {
            'configuration': config_key,
            'result': ngram_analysis.results[config_key]
        }

        return Response(data)
