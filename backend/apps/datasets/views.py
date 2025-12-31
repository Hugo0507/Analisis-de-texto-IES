"""
Views for Dataset management API.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from .models import Dataset, DatasetFile
from .serializers import (
    DatasetSerializer,
    DatasetListSerializer,
    DatasetCreateSerializer,
    DatasetFileSerializer
)
from .services import DatasetProcessorService

logger = logging.getLogger(__name__)


class IsAdminUser(IsAuthenticated):
    """
    Permission class that only allows admin users.
    """
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.is_admin


class DatasetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Dataset management.

    Only accessible by admin users.
    """
    queryset = Dataset.objects.all().prefetch_related('files')
    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return DatasetListSerializer
        elif self.action == 'create':
            return DatasetCreateSerializer
        return DatasetSerializer

    def create(self, request, *args, **kwargs):
        """
        Create a new dataset with file uploads.

        Expects:
        - name: str
        - description: str (optional)
        - source: 'upload' or 'drive'
        - files: List[File] (for upload source)
        - source_url: str (for drive source)
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        source = serializer.validated_data['source']
        name = serializer.validated_data['name']
        description = serializer.validated_data.get('description', '')

        try:
            with transaction.atomic():
                # Create dataset
                dataset = Dataset.objects.create(
                    name=name,
                    description=description,
                    source=source,
                    source_url=serializer.validated_data.get('source_url'),
                    created_by=request.user,
                    status='processing'
                )

                # Process files if upload source
                if source == 'upload':
                    files = request.FILES.getlist('files')
                    if not files:
                        return Response(
                            {'error': 'No files provided'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    processor = DatasetProcessorService()
                    results = processor.process_uploaded_files(dataset, files)

                    if not results['success']:
                        return Response(
                            {
                                'error': 'Some files failed to process',
                                'details': results
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )

                # For drive source, mark as pending (processing will be done separately)
                elif source == 'drive':
                    dataset.status = 'pending'
                    dataset.save()

                # Return created dataset
                output_serializer = DatasetSerializer(dataset)
                return Response(
                    output_serializer.data,
                    status=status.HTTP_201_CREATED
                )

        except Exception as e:
            logger.error(f"Error creating dataset: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """
        Delete a dataset and all its files.
        """
        instance = self.get_object()

        try:
            # TODO: Delete files from disk
            instance.delete()
            return Response(
                {'message': 'Dataset deleted successfully'},
                status=status.HTTP_204_NO_CONTENT
            )
        except Exception as e:
            logger.error(f"Error deleting dataset: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """
        Get all files for a specific dataset.
        """
        dataset = self.get_object()
        files = dataset.files.all()
        serializer = DatasetFileSerializer(files, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get dataset statistics.
        """
        total_datasets = Dataset.objects.count()
        total_files = DatasetFile.objects.count()
        total_size = sum(d.total_size_bytes for d in Dataset.objects.all())

        return Response({
            'total_datasets': total_datasets,
            'total_files': total_files,
            'total_size_bytes': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
        })
