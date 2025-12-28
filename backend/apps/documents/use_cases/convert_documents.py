"""
Convert Documents Use Case.

Converts PDF documents to text using DocumentConverterService.
"""

import logging
from typing import Dict, List
from pathlib import Path

from apps.documents.services.document_converter import DocumentConverterService
from apps.documents.models import Document
from apps.infrastructure.storage.drive_gateway import DriveGateway

logger = logging.getLogger(__name__)


class ConvertDocumentsUseCase:
    """
    Use case for converting PDF documents to text.

    Orchestrates:
    - DriveGateway (download PDF from Drive)
    - DocumentConverterService (PDF to TXT conversion)
    - Document model (save text content)
    """

    def __init__(
        self,
        converter: DocumentConverterService = None,
        drive_gateway: DriveGateway = None
    ):
        """
        Initialize use case.

        Args:
            converter: Document converter service instance
            drive_gateway: Google Drive gateway instance
        """
        self.converter = converter or DocumentConverterService()
        self.drive_gateway = drive_gateway or DriveGateway()

    def execute(
        self,
        document_id: int,
        pdf_path: str = None,
        download_from_drive: bool = True
    ) -> Dict[str, any]:
        """
        Convert a single PDF document to text.

        Args:
            document_id: Document ID
            pdf_path: Local PDF path (if not downloading from Drive)
            download_from_drive: Download PDF from Google Drive

        Returns:
            Dictionary with conversion results

        Example:
            >>> use_case = ConvertDocumentsUseCase()
            >>> result = use_case.execute(document_id=1)
            >>> print(f"Extracted {result['character_count']} characters")
        """
        logger.info(f"Converting document {document_id} to text")

        try:
            # Get document from database
            document = Document.objects.get(id=document_id)

            # Download PDF from Drive if needed
            if download_from_drive:
                # Authenticate with Drive
                if not self.drive_gateway.service:
                    auth_success = self.drive_gateway.authenticate()
                    if not auth_success:
                        return {
                            'success': False,
                            'error': 'Failed to authenticate with Google Drive',
                            'document_id': document_id
                        }

                # Download PDF
                temp_dir = Path('./temp_conversions')
                temp_dir.mkdir(exist_ok=True)

                pdf_path = str(temp_dir / document.filename)

                download_success = self.drive_gateway.download_file(
                    document.drive_file_id,
                    pdf_path
                )

                if not download_success:
                    return {
                        'success': False,
                        'error': f'Failed to download PDF from Drive',
                        'document_id': document_id
                    }

            elif not pdf_path:
                return {
                    'success': False,
                    'error': 'pdf_path is required when download_from_drive=False',
                    'document_id': document_id
                }

            # Convert PDF to text
            conversion_result = self.converter.convert_pdf_to_text(pdf_path)

            if not conversion_result['success']:
                return {
                    'success': False,
                    'error': f"Conversion failed: {conversion_result.get('error', 'Unknown error')}",
                    'document_id': document_id
                }

            # Update document with text content
            document.txt_content = conversion_result['text']
            document.status = 'processing'
            document.save()

            logger.info(
                f"Converted document {document_id} using {conversion_result['method']} "
                f"({conversion_result['character_count']} characters)"
            )

            # Clean up temp file
            if download_from_drive and Path(pdf_path).exists():
                Path(pdf_path).unlink()

            return {
                'success': True,
                'document_id': document_id,
                'filename': document.filename,
                'method': conversion_result['method'],
                'page_count': conversion_result['page_count'],
                'character_count': conversion_result['character_count']
            }

        except Document.DoesNotExist:
            logger.error(f"Document {document_id} not found")
            return {
                'success': False,
                'error': f'Document {document_id} not found',
                'document_id': document_id
            }

        except Exception as e:
            logger.exception(f"Error converting document {document_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'document_id': document_id
            }

    def execute_batch(
        self,
        document_ids: List[int] = None,
        download_from_drive: bool = True
    ) -> Dict[str, any]:
        """
        Convert multiple PDF documents to text.

        Args:
            document_ids: List of document IDs (None = all pending documents)
            download_from_drive: Download PDFs from Google Drive

        Returns:
            Dictionary with batch conversion results

        Example:
            >>> use_case = ConvertDocumentsUseCase()
            >>> result = use_case.execute_batch([1, 2, 3])
            >>> print(f"Converted {result['success_count']} documents")
        """
        logger.info("Starting batch document conversion")

        # Authenticate with Drive if needed
        if download_from_drive:
            if not self.drive_gateway.service:
                auth_success = self.drive_gateway.authenticate()
                if not auth_success:
                    return {
                        'success': False,
                        'error': 'Failed to authenticate with Google Drive',
                        'success_count': 0,
                        'failed_count': 0
                    }

        # Get documents
        if document_ids:
            documents = Document.objects.filter(id__in=document_ids)
        else:
            # Get all documents without text content
            documents = Document.objects.filter(
                txt_content__isnull=True
            )

        if not documents.exists():
            return {
                'success': True,
                'success_count': 0,
                'failed_count': 0,
                'message': 'No documents to process'
            }

        logger.info(f"Processing {documents.count()} documents")

        # Create temp directory
        temp_dir = Path('./temp_conversions')
        temp_dir.mkdir(exist_ok=True)

        success_count = 0
        failed_count = 0
        results = []
        errors = []

        for document in documents:
            try:
                # Download PDF from Drive if needed
                if download_from_drive:
                    pdf_path = str(temp_dir / document.filename)

                    download_success = self.drive_gateway.download_file(
                        document.drive_file_id,
                        pdf_path
                    )

                    if not download_success:
                        failed_count += 1
                        errors.append({
                            'document_id': document.id,
                            'filename': document.filename,
                            'error': 'Failed to download from Drive'
                        })
                        continue

                else:
                    # Skip if no local path available
                    logger.warning(f"Skipping document {document.id} (no local path)")
                    continue

                # Convert PDF to text
                conversion_result = self.converter.convert_pdf_to_text(pdf_path)

                if not conversion_result['success']:
                    failed_count += 1
                    errors.append({
                        'document_id': document.id,
                        'filename': document.filename,
                        'error': conversion_result.get('error', 'Conversion failed')
                    })
                    continue

                # Update document
                document.txt_content = conversion_result['text']
                document.status = 'processing'
                document.save()

                results.append({
                    'document_id': document.id,
                    'filename': document.filename,
                    'method': conversion_result['method'],
                    'page_count': conversion_result['page_count'],
                    'character_count': conversion_result['character_count']
                })

                success_count += 1

                # Clean up temp file
                if download_from_drive and Path(pdf_path).exists():
                    Path(pdf_path).unlink()

            except Exception as e:
                logger.exception(f"Error converting document {document.id}: {e}")
                failed_count += 1
                errors.append({
                    'document_id': document.id,
                    'filename': document.filename,
                    'error': str(e)
                })

        logger.info(f"Batch conversion complete: {success_count} succeeded, {failed_count} failed")

        return {
            'success': True,
            'success_count': success_count,
            'failed_count': failed_count,
            'total_documents': documents.count(),
            'results': results,
            'errors': errors if errors else None
        }
