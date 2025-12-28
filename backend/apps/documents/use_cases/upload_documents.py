"""
Upload Documents Use Case.

Downloads documents from Google Drive and saves them to the local database.
"""

import logging
from typing import Dict, List, Optional
from pathlib import Path

from apps.infrastructure.storage.drive_gateway import DriveGateway
from apps.documents.models import Document

logger = logging.getLogger(__name__)


class UploadDocumentsUseCase:
    """
    Use case for uploading documents from Google Drive.

    Orchestrates:
    - DriveGateway (download files)
    - Document model (save to database)
    """

    def __init__(self, drive_gateway: DriveGateway = None):
        """
        Initialize use case.

        Args:
            drive_gateway: Google Drive gateway instance
        """
        self.drive_gateway = drive_gateway or DriveGateway()

    def execute(
        self,
        folder_id: str,
        mime_type: str = 'application/pdf',
        max_files: int = 100
    ) -> Dict[str, any]:
        """
        Upload documents from Google Drive folder.

        Args:
            folder_id: Google Drive folder ID
            mime_type: MIME type filter (default: PDF)
            max_files: Maximum number of files to upload

        Returns:
            Dictionary with upload results

        Example:
            >>> use_case = UploadDocumentsUseCase()
            >>> result = use_case.execute('folder_id_123')
            >>> print(f"Uploaded {result['uploaded_count']} documents")
        """
        logger.info(f"Starting document upload from folder: {folder_id}")

        # Authenticate with Drive
        if not self.drive_gateway.service:
            auth_success = self.drive_gateway.authenticate()
            if not auth_success:
                return {
                    'success': False,
                    'error': 'Failed to authenticate with Google Drive',
                    'uploaded_count': 0,
                    'failed_count': 0
                }

        # List files from Drive
        files = self.drive_gateway.list_files(
            folder_id=folder_id,
            mime_type=mime_type,
            max_results=max_files
        )

        if not files:
            logger.warning(f"No files found in folder {folder_id}")
            return {
                'success': True,
                'uploaded_count': 0,
                'failed_count': 0,
                'message': 'No files found in folder'
            }

        logger.info(f"Found {len(files)} files to upload")

        uploaded_count = 0
        failed_count = 0
        uploaded_documents = []
        errors = []

        # Download and save each file
        for file_metadata in files:
            try:
                file_id = file_metadata['id']
                filename = file_metadata['name']

                # Check if document already exists
                existing_doc = Document.objects.filter(
                    drive_file_id=file_id
                ).first()

                if existing_doc:
                    logger.info(f"Document {filename} already exists, skipping")
                    continue

                # Download file to temp location
                temp_dir = Path('./temp_uploads')
                temp_dir.mkdir(exist_ok=True)

                temp_path = temp_dir / filename

                download_success = self.drive_gateway.download_file(
                    file_id,
                    str(temp_path)
                )

                if not download_success:
                    logger.error(f"Failed to download {filename}")
                    failed_count += 1
                    errors.append(f"Failed to download {filename}")
                    continue

                # Create document record
                document = Document.objects.create(
                    drive_file_id=file_id,
                    filename=filename,
                    status='pending'
                )

                uploaded_documents.append({
                    'id': document.id,
                    'filename': filename,
                    'drive_file_id': file_id
                })

                uploaded_count += 1
                logger.info(f"Successfully uploaded {filename}")

                # Delete temp file
                if temp_path.exists():
                    temp_path.unlink()

            except Exception as e:
                logger.exception(f"Error uploading file {file_metadata.get('name', 'unknown')}: {e}")
                failed_count += 1
                errors.append(str(e))

        logger.info(f"Upload complete: {uploaded_count} succeeded, {failed_count} failed")

        return {
            'success': True,
            'uploaded_count': uploaded_count,
            'failed_count': failed_count,
            'total_files': len(files),
            'documents': uploaded_documents,
            'errors': errors if errors else None
        }

    def execute_single(
        self,
        file_id: str,
        filename: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Upload a single document from Google Drive.

        Args:
            file_id: Google Drive file ID
            filename: Optional filename (will fetch from metadata if None)

        Returns:
            Dictionary with upload result
        """
        logger.info(f"Uploading single document: {file_id}")

        # Authenticate with Drive
        if not self.drive_gateway.service:
            auth_success = self.drive_gateway.authenticate()
            if not auth_success:
                return {
                    'success': False,
                    'error': 'Failed to authenticate with Google Drive'
                }

        # Get file metadata if filename not provided
        if not filename:
            metadata = self.drive_gateway.get_file_metadata(file_id)
            if not metadata:
                return {
                    'success': False,
                    'error': 'Failed to get file metadata'
                }
            filename = metadata['name']

        # Check if document already exists
        existing_doc = Document.objects.filter(
            drive_file_id=file_id
        ).first()

        if existing_doc:
            logger.info(f"Document {filename} already exists")
            return {
                'success': True,
                'document_id': existing_doc.id,
                'filename': filename,
                'message': 'Document already exists'
            }

        try:
            # Download file to temp location
            temp_dir = Path('./temp_uploads')
            temp_dir.mkdir(exist_ok=True)

            temp_path = temp_dir / filename

            download_success = self.drive_gateway.download_file(
                file_id,
                str(temp_path)
            )

            if not download_success:
                return {
                    'success': False,
                    'error': f'Failed to download {filename}'
                }

            # Create document record
            document = Document.objects.create(
                drive_file_id=file_id,
                filename=filename,
                status='pending'
            )

            logger.info(f"Successfully uploaded {filename}")

            # Delete temp file
            if temp_path.exists():
                temp_path.unlink()

            return {
                'success': True,
                'document_id': document.id,
                'filename': filename,
                'drive_file_id': file_id
            }

        except Exception as e:
            logger.exception(f"Error uploading file {filename}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
