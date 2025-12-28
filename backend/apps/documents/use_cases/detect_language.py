"""
Detect Language Use Case.

Detects the language of documents using LanguageDetectorService.
"""

import logging
from typing import Dict, List
from pathlib import Path

from apps.documents.services.language_detector import LanguageDetectorService
from apps.documents.models import Document

logger = logging.getLogger(__name__)


class DetectLanguageUseCase:
    """
    Use case for detecting document language.

    Orchestrates:
    - LanguageDetectorService (language detection)
    - Document model (update language fields)
    """

    def __init__(self, language_detector: LanguageDetectorService = None):
        """
        Initialize use case.

        Args:
            language_detector: Language detector service instance
        """
        self.language_detector = language_detector or LanguageDetectorService()

    def execute(
        self,
        document_id: int
    ) -> Dict[str, any]:
        """
        Detect language for a single document.

        Args:
            document_id: Document ID

        Returns:
            Dictionary with detection results

        Example:
            >>> use_case = DetectLanguageUseCase()
            >>> result = use_case.execute(document_id=1)
            >>> print(f"Language: {result['language']}")
        """
        logger.info(f"Detecting language for document {document_id}")

        try:
            # Get document from database
            document = Document.objects.get(id=document_id)

            # Check if document has text content
            if not document.txt_content:
                return {
                    'success': False,
                    'error': 'Document has no text content. Convert to TXT first.',
                    'document_id': document_id
                }

            # Detect language
            detection_result = self.language_detector.detect_from_text(
                document.txt_content,
                return_confidence=True
            )

            # Update document
            document.language_code = detection_result['language']
            document.language_confidence = detection_result['confidence']
            document.save()

            logger.info(
                f"Detected language {detection_result['language']} "
                f"(confidence: {detection_result['confidence']:.4f}) "
                f"for document {document_id}"
            )

            return {
                'success': True,
                'document_id': document_id,
                'filename': document.filename,
                'language': detection_result['language'],
                'confidence': detection_result['confidence']
            }

        except Document.DoesNotExist:
            logger.error(f"Document {document_id} not found")
            return {
                'success': False,
                'error': f'Document {document_id} not found',
                'document_id': document_id
            }

        except Exception as e:
            logger.exception(f"Error detecting language for document {document_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'document_id': document_id
            }

    def execute_batch(
        self,
        document_ids: List[int] = None
    ) -> Dict[str, any]:
        """
        Detect language for multiple documents.

        Args:
            document_ids: List of document IDs (None = all pending documents)

        Returns:
            Dictionary with batch detection results

        Example:
            >>> use_case = DetectLanguageUseCase()
            >>> result = use_case.execute_batch([1, 2, 3])
            >>> print(f"Detected {result['success_count']} documents")
        """
        logger.info("Starting batch language detection")

        # Get documents
        if document_ids:
            documents = Document.objects.filter(id__in=document_ids)
        else:
            # Get all documents with text but no language
            documents = Document.objects.filter(
                txt_content__isnull=False,
                language_code__isnull=True
            )

        if not documents.exists():
            return {
                'success': True,
                'success_count': 0,
                'failed_count': 0,
                'message': 'No documents to process'
            }

        logger.info(f"Processing {documents.count()} documents")

        success_count = 0
        failed_count = 0
        results = []
        errors = []

        for document in documents:
            try:
                # Detect language
                detection_result = self.language_detector.detect_from_text(
                    document.txt_content,
                    return_confidence=True
                )

                # Update document
                document.language_code = detection_result['language']
                document.language_confidence = detection_result['confidence']
                document.save()

                results.append({
                    'document_id': document.id,
                    'filename': document.filename,
                    'language': detection_result['language'],
                    'confidence': detection_result['confidence']
                })

                success_count += 1

            except Exception as e:
                logger.exception(f"Error detecting language for document {document.id}: {e}")
                failed_count += 1
                errors.append({
                    'document_id': document.id,
                    'filename': document.filename,
                    'error': str(e)
                })

        logger.info(f"Batch detection complete: {success_count} succeeded, {failed_count} failed")

        return {
            'success': True,
            'success_count': success_count,
            'failed_count': failed_count,
            'total_documents': documents.count(),
            'results': results,
            'errors': errors if errors else None
        }

    def execute_from_pdf(
        self,
        document_id: int,
        pdf_path: str,
        max_pages: int = 5
    ) -> Dict[str, any]:
        """
        Detect language directly from PDF file.

        Args:
            document_id: Document ID
            pdf_path: Path to PDF file
            max_pages: Maximum pages to analyze

        Returns:
            Dictionary with detection results
        """
        logger.info(f"Detecting language from PDF for document {document_id}")

        try:
            # Get document from database
            document = Document.objects.get(id=document_id)

            # Detect language from PDF
            detection_result = self.language_detector.detect_from_pdf(
                pdf_path,
                max_pages=max_pages
            )

            # Update document
            document.language_code = detection_result['language']
            document.language_confidence = detection_result['confidence']
            document.save()

            logger.info(
                f"Detected language {detection_result['language']} "
                f"from PDF for document {document_id}"
            )

            return {
                'success': True,
                'document_id': document_id,
                'filename': document.filename,
                'language': detection_result['language'],
                'confidence': detection_result['confidence']
            }

        except Document.DoesNotExist:
            logger.error(f"Document {document_id} not found")
            return {
                'success': False,
                'error': f'Document {document_id} not found',
                'document_id': document_id
            }

        except Exception as e:
            logger.exception(f"Error detecting language from PDF for document {document_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'document_id': document_id
            }
