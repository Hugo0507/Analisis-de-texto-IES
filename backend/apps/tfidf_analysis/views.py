"""
TF-IDF Analysis Views

ViewSet para gestión de análisis TF-IDF.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import TfIdfAnalysis
from .serializers import (
    TfIdfAnalysisListSerializer,
    TfIdfAnalysisDetailSerializer,
    TfIdfAnalysisCreateSerializer,
    TfIdfAnalysisProgressSerializer,
)

logger = logging.getLogger(__name__)


class TfIdfAnalysisViewSet(viewsets.ModelViewSet):
    """
    ViewSet para operaciones CRUD de análisis TF-IDF.

    list: Listar todos los análisis TF-IDF del usuario
    create: Crear nuevo análisis e iniciar procesamiento
    retrieve: Ver detalle completo con 3 matrices (TF, IDF, TF-IDF)
    destroy: Eliminar un análisis
    progress: Obtener progreso en tiempo real
    """

    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination - return plain array
    queryset = TfIdfAnalysis.objects.all().select_related(
        'data_preparation',
        'bag_of_words',
        'ngram_analysis',
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
            return TfIdfAnalysisListSerializer
        elif self.action == 'create':
            return TfIdfAnalysisCreateSerializer
        elif self.action == 'progress':
            return TfIdfAnalysisProgressSerializer
        else:
            return TfIdfAnalysisDetailSerializer

    def create(self, request, *args, **kwargs):
        """
        Crear nuevo análisis TF-IDF e iniciar procesamiento en background.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Agregar created_by
        serializer.validated_data['created_by'] = request.user

        # Crear análisis en estado pending
        tfidf_analysis = serializer.save()

        # Iniciar procesamiento en background thread
        from .processor import start_processing_thread
        start_processing_thread(tfidf_analysis.id)

        # Retornar análisis creado
        response_serializer = TfIdfAnalysisDetailSerializer(tfidf_analysis)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        """
        Eliminar análisis TF-IDF.
        """
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """
        Obtener progreso en tiempo real de un análisis.

        Endpoint: GET /api/v1/tfidf-analysis/{id}/progress/

        Usado por el frontend para polling cada 2-3 segundos.
        """
        tfidf_analysis = self.get_object()

        data = {
            'status': tfidf_analysis.status,
            'progress_percentage': tfidf_analysis.progress_percentage,
            'current_stage': tfidf_analysis.current_stage,
            'current_stage_label': tfidf_analysis.current_stage_label,
            'error_message': tfidf_analysis.error_message,
        }

        serializer = TfIdfAnalysisProgressSerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def matrices(self, request, pk=None):
        """
        Obtener las 3 matrices por separado.

        Endpoint: GET /api/v1/tfidf-analysis/{id}/matrices/

        Retorna las tres matrices: TF, IDF y TF-IDF.
        """
        tfidf_analysis = self.get_object()

        if tfidf_analysis.status != TfIdfAnalysis.STATUS_COMPLETED:
            return Response(
                {'error': 'El análisis debe estar completado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = {
            'tf_matrix': tfidf_analysis.tf_matrix,
            'idf_vector': tfidf_analysis.idf_vector,
            'tfidf_matrix': tfidf_analysis.tfidf_matrix,
        }

        return Response(data)
