"""
Views for Documents app.

Exposes Use Cases as REST API endpoints.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Document
from .serializers import DocumentSerializer, DocumentListSerializer
from .use_cases.upload_documents import UploadDocumentsUseCase
from .use_cases.detect_language import DetectLanguageUseCase
from .use_cases.convert_documents import ConvertDocumentsUseCase
from .use_cases.preprocess_text import PreprocessTextUseCase


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Document model.

    Provides CRUD operations and custom actions for document processing pipeline.
    """
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer

    def get_serializer_class(self):
        """Use lightweight serializer for list action."""
        if self.action == 'list':
            return DocumentListSerializer
        return DocumentSerializer

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_documents(self, request):
        """
        Upload documents from Google Drive.

        POST /api/documents/upload/
        Body: {
            "folder_id": "abc123",
            "mime_type": "application/pdf",
            "max_files": 100
        }
        """
        use_case = UploadDocumentsUseCase()

        folder_id = request.data.get('folder_id')
        if not folder_id:
            return Response(
                {'error': 'folder_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = use_case.execute(
            folder_id=folder_id,
            mime_type=request.data.get('mime_type', 'application/pdf'),
            max_files=request.data.get('max_files', 100)
        )

        if result['success']:
            return Response(result, status=status.HTTP_201_CREATED)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='detect-language')
    def detect_language(self, request, pk=None):
        """
        Detect language for a document.

        POST /api/documents/{id}/detect-language/
        """
        use_case = DetectLanguageUseCase()
        result = use_case.execute(document_id=int(pk))

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='detect-language-batch')
    def detect_language_batch(self, request):
        """
        Detect language for multiple documents.

        POST /api/documents/detect-language-batch/
        Body: {
            "document_ids": [1, 2, 3]  # Optional, None = all pending
        }
        """
        use_case = DetectLanguageUseCase()

        document_ids = request.data.get('document_ids', None)
        result = use_case.execute_batch(document_ids=document_ids)

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='convert')
    def convert_document(self, request, pk=None):
        """
        Convert PDF to TXT for a document.

        POST /api/documents/{id}/convert/
        Body: {
            "download_from_drive": true
        }
        """
        use_case = ConvertDocumentsUseCase()
        result = use_case.execute(
            document_id=int(pk),
            download_from_drive=request.data.get('download_from_drive', True)
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='convert-batch')
    def convert_batch(self, request):
        """
        Convert multiple PDFs to TXT.

        POST /api/documents/convert-batch/
        Body: {
            "document_ids": [1, 2, 3],  # Optional
            "download_from_drive": true
        }
        """
        use_case = ConvertDocumentsUseCase()

        result = use_case.execute_batch(
            document_ids=request.data.get('document_ids', None),
            download_from_drive=request.data.get('download_from_drive', True)
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='preprocess')
    def preprocess_text(self, request, pk=None):
        """
        Preprocess text for a document.

        POST /api/documents/{id}/preprocess/
        Body: {
            "remove_stopwords": true,
            "remove_punctuation": true,
            "remove_numbers": true,
            "apply_stemming": false,
            "min_word_length": 3,
            "max_word_length": 30
        }
        """
        use_case = PreprocessTextUseCase()
        result = use_case.execute(
            document_id=int(pk),
            remove_stopwords=request.data.get('remove_stopwords', True),
            remove_punctuation=request.data.get('remove_punctuation', True),
            remove_numbers=request.data.get('remove_numbers', True),
            apply_stemming=request.data.get('apply_stemming', False),
            min_word_length=request.data.get('min_word_length', 3),
            max_word_length=request.data.get('max_word_length', 30)
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='preprocess-batch')
    def preprocess_batch(self, request):
        """
        Preprocess text for multiple documents.

        POST /api/documents/preprocess-batch/
        Body: {
            "document_ids": [1, 2, 3],  # Optional
            "remove_stopwords": true,
            "remove_punctuation": true,
            ...
        }
        """
        use_case = PreprocessTextUseCase()

        result = use_case.execute_batch(
            document_ids=request.data.get('document_ids', None),
            remove_stopwords=request.data.get('remove_stopwords', True),
            remove_punctuation=request.data.get('remove_punctuation', True),
            remove_numbers=request.data.get('remove_numbers', True),
            apply_stemming=request.data.get('apply_stemming', False),
            min_word_length=request.data.get('min_word_length', 3),
            max_word_length=request.data.get('max_word_length', 30)
        )

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='statistics')
    def get_statistics(self, request, pk=None):
        """
        Get text statistics for a document.

        GET /api/documents/{id}/statistics/
        """
        use_case = PreprocessTextUseCase()
        result = use_case.get_statistics(document_id=int(pk))

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
