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
    pagination_class = None  # Disable pagination - return plain array
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

        Se puede eliminar incluso si está en proceso.
        El thread continuará ejecutándose pero sin acceso a la base de datos.
        """
        instance = self.get_object()
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

    @action(detail=True, methods=['get'])
    def file_details(self, request, pk=None):
        """
        Obtener detalles de archivos procesados, omitidos y duplicados.

        Endpoint: GET /api/v1/data-preparation/{id}/file_details/

        Retorna nombres de archivos para cada categoría.
        """
        from apps.datasets.models import DatasetFile

        preparation = self.get_object()

        # Obtener nombres de archivos procesados
        processed_files = DatasetFile.objects.filter(
            id__in=preparation.processed_file_ids
        ).values('id', 'original_filename')

        # Obtener nombres de archivos omitidos
        omitted_files = DatasetFile.objects.filter(
            id__in=preparation.omitted_file_ids
        ).values('id', 'original_filename')

        # Para duplicados, necesitaríamos guardar los IDs en el processor
        # Por ahora retornamos lista vacía
        duplicate_files = []

        data = {
            'processed': list(processed_files),
            'omitted': list(omitted_files),
            'duplicates': duplicate_files,
        }

        return Response(data)

    @action(detail=True, methods=['get'])
    def detect_changes(self, request, pk=None):
        """
        Detectar cambios en el dataset original.

        Endpoint: GET /api/v1/data-preparation/{id}/detect_changes/

        Compara archivos actuales del dataset con los procesados originalmente.
        """
        from apps.datasets.models import DatasetFile

        preparation = self.get_object()

        # Obtener archivos PDF actuales del dataset
        current_pdf_files = DatasetFile.objects.filter(
            dataset=preparation.dataset,
            mime_type='application/pdf'
        ).values_list('id', flat=True)

        current_file_ids = set(current_pdf_files)

        # IDs procesados y omitidos originalmente
        processed_ids = set(preparation.processed_file_ids)
        omitted_ids = set(preparation.omitted_file_ids)
        all_original_ids = processed_ids | omitted_ids

        # Detectar cambios
        added_ids = current_file_ids - all_original_ids
        deleted_ids = all_original_ids - current_file_ids

        # Obtener nombres de archivos agregados
        added_files = DatasetFile.objects.filter(
            id__in=added_ids
        ).values('id', 'original_filename')

        # Obtener nombres de archivos eliminados desde los IDs guardados
        # (ya no existen en BD, así que usamos los nombres que teníamos)
        deleted_files = DatasetFile.objects.filter(
            id__in=deleted_ids
        ).values('id', 'original_filename')

        data = {
            'has_changes': len(added_ids) > 0 or len(deleted_ids) > 0,
            'added_count': len(added_ids),
            'deleted_count': len(deleted_ids),
            'added_files': list(added_files),
            'deleted_files': list(deleted_files),
            'current_total': len(current_file_ids),
            'original_total': len(all_original_ids),
        }

        return Response(data)

    @action(detail=True, methods=['post'])
    def update_preparation(self, request, pk=None):
        """
        Actualizar preparación con cambios detectados en el dataset.

        Endpoint: POST /api/v1/data-preparation/{id}/update_preparation/

        - Si archivos fueron eliminados: Remueve su información
        - Si archivos fueron agregados: Procesa solo los archivos nuevos
        """
        preparation = self.get_object()

        # Solo permitir actualizar si está completada
        if preparation.status != DataPreparation.STATUS_COMPLETED:
            return Response(
                {'error': 'Solo se pueden actualizar preparaciones completadas'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Iniciar actualización en background thread
        from .processor import start_update_thread
        start_update_thread(preparation.id)

        # Retornar preparación actualizada
        response_serializer = DataPreparationDetailSerializer(preparation)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
