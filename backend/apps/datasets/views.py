"""
Views for Dataset management API.
"""

import logging
import threading
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
from .services import DatasetProcessorService, SimpleDriveService

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
                    file_paths = request.POST.getlist('file_paths')

                    if not files:
                        return Response(
                            {'error': 'No files provided'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    # Create a list of (file, path) tuples
                    files_with_paths = []
                    for i, uploaded_file in enumerate(files):
                        # Get corresponding path if available, otherwise use filename
                        file_path = file_paths[i] if i < len(file_paths) else uploaded_file.name
                        files_with_paths.append((uploaded_file, file_path))

                    # Process files in background thread to avoid timeout
                    def process_files_in_background():
                        """Background task to process uploaded files."""
                        try:
                            processor = DatasetProcessorService()
                            results = processor.process_uploaded_files_with_paths(dataset, files_with_paths)
                            logger.info(f"Background file processing completed for dataset {dataset.id}: {results}")
                        except Exception as e:
                            logger.exception(f"Error in background file processing: {e}")
                            dataset.status = 'error'
                            dataset.save()

                    # Launch background thread
                    thread = threading.Thread(target=process_files_in_background, daemon=True)
                    thread.start()

                    logger.info(f"Started background processing for uploaded files in dataset {dataset.id}")

                # For drive source, download and process files from Google Drive
                elif source == 'drive':
                    source_url = serializer.validated_data.get('source_url')
                    if not source_url:
                        return Response(
                            {'error': 'source_url is required for drive source'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    # Verify user has connected Google Drive
                    if not request.user.google_drive_connected:
                        return Response(
                            {'error': 'You must connect your Google Drive account first. Go to your profile to connect.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    # Process Drive dataset asynchronously in background
                    def process_drive_in_background():
                        """Background task to process Google Drive dataset."""
                        try:
                            # Usar el servicio simple (más parecido a Colab)
                            drive_service = SimpleDriveService(user=request.user)

                            # Extraer folder ID de la URL usando regex
                            import re
                            match = re.search(r'/folders/([a-zA-Z0-9_-]+)', source_url)
                            folder_id = match.group(1) if match else None

                            if not folder_id:
                                raise ValueError(f"No se pudo extraer folder_id de la URL: {source_url}")

                            # Procesar de forma simple y rápida
                            results = drive_service.quick_process_drive_folder(dataset, folder_id)
                            logger.info(f"Drive processing completed for dataset {dataset.id}: {results}")
                        except Exception as e:
                            logger.exception(f"Error in background Drive processing: {e}")
                            dataset.status = 'error'
                            dataset.save()

                    # Launch background thread
                    thread = threading.Thread(target=process_drive_in_background, daemon=True)
                    thread.start()

                    logger.info(f"Started background processing for Drive dataset {dataset.id}")

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

    @action(detail=True, methods=['get'])
    def directory_stats(self, request, pk=None):
        """
        Get directory distribution statistics for a dataset.

        Returns a cross-tabulation of directories × file extensions with:
        - Matrix of counts (directories × extensions)
        - Row totals (total files per directory)
        - Column totals (total files per extension)
        - Grand total (total files in dataset)
        - Pie chart data (directory distribution)
        """
        dataset = self.get_object()
        files = dataset.files.all()

        # Initialize data structures
        directory_stats = {}  # {directory_name: {extension: count}}
        extension_totals = {}  # {extension: total_count}
        directory_totals = {}  # {directory_name: total_count}
        root_files_count = 0

        # Process each file
        for file in files:
            # Get directory name (use "Root" for files without directory)
            directory = file.directory_name or "Root"

            # Get file extension
            filename = file.original_filename
            extension = filename.split('.')[-1].upper() if '.' in filename else 'UNKNOWN'

            # Initialize directory if not exists
            if directory not in directory_stats:
                directory_stats[directory] = {}
                directory_totals[directory] = 0

            # Initialize extension in directory if not exists
            if extension not in directory_stats[directory]:
                directory_stats[directory][extension] = 0

            # Increment counts
            directory_stats[directory][extension] += 1
            directory_totals[directory] += 1

            # Track extension totals
            if extension not in extension_totals:
                extension_totals[extension] = 0
            extension_totals[extension] += 1

        # Get all unique extensions (for consistent column ordering)
        all_extensions = sorted(extension_totals.keys())

        # Build the matrix (table data)
        table_data = []
        for directory in sorted(directory_stats.keys()):
            row = {
                'directory': directory,
                'extensions': {},
                'total': directory_totals[directory]
            }

            # Add count for each extension
            for ext in all_extensions:
                row['extensions'][ext] = directory_stats[directory].get(ext, 0)

            table_data.append(row)

        # Prepare pie chart data
        pie_chart_data = [
            {
                'name': directory,
                'value': directory_totals[directory],
                'percentage': round((directory_totals[directory] / files.count() * 100), 2) if files.count() > 0 else 0
            }
            for directory in sorted(directory_stats.keys())
        ]

        # Calculate grand total
        grand_total = files.count()

        return Response({
            'table_data': table_data,
            'extension_totals': extension_totals,
            'directory_totals': directory_totals,
            'all_extensions': all_extensions,
            'grand_total': grand_total,
            'pie_chart_data': pie_chart_data
        })

    @action(detail=True, methods=['post'])
    def add_files(self, request, pk=None):
        """
        Add more files to an existing dataset (incremental feeding).

        Expects:
        - files: List[File] - Files to add to the dataset
        - file_paths: List[str] - Relative paths for each file (preserves directory structure)

        This endpoint allows adding files to an existing dataset without
        creating a new one, enabling incremental data collection.

        Files are saved immediately and processed asynchronously in the background
        to avoid timeout issues with large batches.
        """
        dataset = self.get_object()
        files = request.FILES.getlist('files')
        file_paths = request.POST.getlist('file_paths')

        if not files:
            return Response(
                {'error': 'No files provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Update dataset status to processing
            dataset.status = 'processing'
            dataset.save()

            # Create a list of (file, path) tuples
            files_with_paths = []
            for i, uploaded_file in enumerate(files):
                # Get corresponding path if available, otherwise use filename
                file_path = file_paths[i] if i < len(file_paths) else uploaded_file.name
                files_with_paths.append((uploaded_file, file_path))

            # Process files in background thread to avoid timeout
            def process_files_in_background():
                """Background task to process uploaded files."""
                try:
                    processor = DatasetProcessorService()
                    results = processor.process_uploaded_files_with_paths(dataset, files_with_paths)
                    logger.info(f"Background file processing completed for dataset {dataset.id}: {results}")
                except Exception as e:
                    logger.exception(f"Error in background file processing: {e}")
                    dataset.status = 'error'
                    dataset.save()

            # Launch background thread
            thread = threading.Thread(target=process_files_in_background, daemon=True)
            thread.start()

            # Return immediately with success
            output_serializer = DatasetSerializer(dataset)
            return Response(
                {
                    'message': f'{len(files)} files received. Processing in background...',
                    'dataset': output_serializer.data,
                    'results': {
                        'success': True,
                        'received': len(files),
                        'processing': True
                    }
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.error(f"Error adding files to dataset: {str(e)}")
            dataset.status = 'error'
            dataset.save()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
