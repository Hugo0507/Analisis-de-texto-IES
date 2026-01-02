"""
Data Preparation Views

ViewSet para gestión de preparación de datos NLP.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import DataPreparation
from .serializers import (
    DataPreparationListSerializer,
    DataPreparationDetailSerializer,
    DataPreparationCreateSerializer,
    ProgressSerializer,
    StatsSerializer,
)


class DataPreparationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para operaciones CRUD de Preparación de Datos.

    list: Listar todas las preparaciones del usuario
    create: Crear nueva preparación e iniciar procesamiento
    retrieve: Ver detalle completo de una preparación
    destroy: Eliminar una preparación
    progress: Obtener progreso en tiempo real
    stats: Obtener estadísticas generales
    """

    permission_classes = [IsAuthenticated]
    queryset = DataPreparation.objects.all().select_related('dataset', 'created_by')

    def get_queryset(self):
        """
        Filtrar preparaciones por usuario actual.

        Los usuarios solo pueden ver sus propias preparaciones.
        """
        return self.queryset.filter(created_by=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        """
        Usar serializer apropiado según la acción.
        """
        if self.action == 'list':
            return DataPreparationListSerializer
        elif self.action == 'create':
            return DataPreparationCreateSerializer
        elif self.action == 'progress':
            return ProgressSerializer
        elif self.action == 'stats':
            return StatsSerializer
        else:
            return DataPreparationDetailSerializer

    def create(self, request, *args, **kwargs):
        """
        Crear nueva preparación e iniciar procesamiento en background.

        El procesamiento se ejecuta en un thread separado para no bloquear la respuesta.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Crear preparación en estado pending
        preparation = serializer.save()

        # Iniciar procesamiento en background thread
        from .processor import start_processing_thread
        start_processing_thread(preparation.id)

        # Retornar preparación creada
        response_serializer = DataPreparationDetailSerializer(preparation)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        """
        Eliminar preparación.

        Solo se puede eliminar si no está en proceso.
        """
        instance = self.get_object()

        if instance.is_processing:
            return Response(
                {'error': 'No se puede eliminar una preparación en proceso'},
                status=status.HTTP_400_BAD_REQUEST
            )

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """
        Obtener progreso en tiempo real de una preparación.

        Endpoint: GET /api/v1/data-preparation/{id}/progress/

        Usado por el frontend para polling cada 2-3 segundos.
        """
        preparation = self.get_object()

        # Obtener etiqueta de la etapa
        stage_labels = dict(DataPreparation.STAGE_CHOICES)
        current_stage_label = stage_labels.get(preparation.current_stage, preparation.current_stage)

        data = {
            'status': preparation.status,
            'progress_percentage': preparation.progress_percentage,
            'current_stage': preparation.current_stage,
            'current_stage_label': current_stage_label,
            'error_message': preparation.error_message,
        }

        serializer = ProgressSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Obtener estadísticas generales de preparaciones.

        Endpoint: GET /api/v1/data-preparation/stats/

        Retorna conteo de preparaciones por estado.
        """
        queryset = self.get_queryset()

        data = {
            'total_preparations': queryset.count(),
            'processing': queryset.filter(status=DataPreparation.STATUS_PROCESSING).count(),
            'completed': queryset.filter(status=DataPreparation.STATUS_COMPLETED).count(),
            'failed': queryset.filter(status=DataPreparation.STATUS_ERROR).count(),
        }

        serializer = StatsSerializer(data)
        return Response(serializer.data)
