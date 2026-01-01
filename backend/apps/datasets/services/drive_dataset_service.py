"""
Drive Dataset Service.

Handles downloading and processing datasets from Google Drive.
"""

import logging
import os
import re
from pathlib import Path
from typing import Dict, Optional, List
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.infrastructure.storage.drive_gateway import DriveGateway
from ..models import Dataset, DatasetFile
from .dataset_processor import DatasetProcessorService

logger = logging.getLogger(__name__)


class DriveDatasetService:
    """
    Service for processing datasets from Google Drive.

    Handles:
    - Extracting folder ID from Drive URL
    - Downloading files from Drive folders
    - Processing downloaded files as dataset
    - Maintaining directory structure
    """

    def __init__(self):
        """Initialize Drive Dataset Service."""
        self.drive_gateway = DriveGateway()
        self.dataset_processor = DatasetProcessorService()

        # Create temp directory for Drive downloads
        self.temp_dir = Path(settings.MEDIA_ROOT) / 'temp_drive' if hasattr(settings, 'MEDIA_ROOT') else Path('media/temp_drive')
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def extract_folder_id(self, drive_url: str) -> Optional[str]:
        """
        Extract folder ID from Google Drive URL.

        Supports various Drive URL formats:
        - https://drive.google.com/drive/folders/FOLDER_ID
        - https://drive.google.com/drive/folders/FOLDER_ID?...
        - https://drive.google.com/drive/u/0/folders/FOLDER_ID

        Args:
            drive_url: Google Drive URL

        Returns:
            Folder ID or None if not found

        Example:
            >>> service = DriveDatasetService()
            >>> folder_id = service.extract_folder_id('https://drive.google.com/drive/folders/abc123')
            >>> print(folder_id)  # 'abc123'
        """
        # Pattern to match folder ID in various URL formats
        patterns = [
            r'/folders/([a-zA-Z0-9_-]+)',  # Standard format
            r'id=([a-zA-Z0-9_-]+)',         # Alternative format
        ]

        for pattern in patterns:
            match = re.search(pattern, drive_url)
            if match:
                folder_id = match.group(1)
                logger.info(f"Extracted folder ID: {folder_id}")
                return folder_id

        logger.warning(f"Could not extract folder ID from URL: {drive_url}")
        return None

    def process_drive_dataset(
        self,
        dataset: Dataset,
        drive_url: str
    ) -> Dict[str, any]:
        """
        Process a dataset from Google Drive.

        Downloads files from Drive folder (recursively) and processes them.

        Args:
            dataset: Dataset instance to populate
            drive_url: Google Drive folder URL

        Returns:
            Dictionary with processing results

        Example:
            >>> service = DriveDatasetService()
            >>> dataset = Dataset.objects.get(id=1)
            >>> results = service.process_drive_dataset(
            ...     dataset,
            ...     'https://drive.google.com/drive/folders/abc123'
            ... )
        """
        results = {
            'success': False,
            'downloaded': 0,
            'processed': 0,
            'failed': 0,
            'errors': []
        }

        try:
            # Extract folder ID
            folder_id = self.extract_folder_id(drive_url)
            if not folder_id:
                results['errors'].append('Invalid Drive URL: Could not extract folder ID')
                return results

            # Authenticate with Drive
            if not self.drive_gateway.authenticate():
                results['errors'].append('Failed to authenticate with Google Drive')
                return results

            # Build folder structure map (folder_id -> folder_name path)
            logger.info("Building folder structure map...")
            folder_paths = self._build_folder_structure(folder_id)

            # List files recursively from Drive folder
            logger.info(f"Listing files from Drive folder: {folder_id}")
            files = self._list_files_with_paths(folder_id, folder_paths)

            if not files:
                results['errors'].append('No files found in Drive folder')
                return results

            logger.info(f"Found {len(files)} files in Drive")

            # Download files preserving directory structure
            downloaded_files = []
            for file_info in files:
                try:
                    # Skip Google Docs native formats
                    if file_info['mimeType'].startswith('application/vnd.google-apps'):
                        logger.debug(f"Skipping Google Docs format: {file_info['name']}")
                        continue

                    # Download file with directory path
                    downloaded_path, relative_path = self._download_drive_file_with_path(
                        file_info,
                        dataset.id
                    )

                    if not downloaded_path:
                        results['failed'] += 1
                        results['errors'].append(f"Failed to download: {file_info['name']}")
                        continue

                    results['downloaded'] += 1
                    downloaded_files.append({
                        'path': downloaded_path,
                        'name': file_info['name'],
                        'relative_path': relative_path,
                        'mime_type': file_info['mimeType'],
                        'size': int(file_info.get('size', 0))
                    })

                except Exception as e:
                    logger.error(f"Error downloading Drive file {file_info.get('name', 'unknown')}: {str(e)}")
                    results['failed'] += 1
                    results['errors'].append(f"{file_info.get('name', 'unknown')}: {str(e)}")

            # Process downloaded files through DatasetProcessor
            if downloaded_files:
                logger.info(f"Processing {len(downloaded_files)} downloaded files...")
                uploaded_files = self._create_uploaded_files(downloaded_files)

                processor_results = self.dataset_processor.process_uploaded_files(
                    dataset,
                    uploaded_files
                )

                results['processed'] = processor_results['processed']
                results['failed'] += processor_results['failed']
                if processor_results['errors']:
                    results['errors'].extend(processor_results['errors'])

            # Cleanup temp files
            self.cleanup_temp_files(dataset.id)

            # Update dataset status
            if results['processed'] > 0:
                results['success'] = True
                dataset.status = 'completed' if results['failed'] == 0 else 'error'
            else:
                results['errors'].append('No files were successfully processed')
                dataset.status = 'error'

            dataset.save()

            logger.info(
                f"Drive processing complete: {results['processed']} processed, "
                f"{results['failed']} failed"
            )

            return results

        except Exception as e:
            logger.exception(f"Error processing Drive dataset: {str(e)}")
            results['errors'].append(str(e))
            dataset.status = 'error'
            dataset.save()
            return results

    def _build_folder_structure(self, root_folder_id: str) -> Dict[str, str]:
        """
        Build a map of folder IDs to their paths from root.

        Args:
            root_folder_id: Root folder ID

        Returns:
            Dictionary mapping folder_id -> path from root
        """
        folder_paths = {root_folder_id: ""}  # Root has empty path
        folders_to_process = [root_folder_id]

        while folders_to_process:
            current_folder_id = folders_to_process.pop(0)
            current_path = folder_paths[current_folder_id]

            try:
                # List all items in current folder
                query = f"'{current_folder_id}' in parents and trashed=false"
                results = self.drive_gateway.service.files().list(
                    q=query,
                    pageSize=1000,
                    fields="files(id, name, mimeType)"
                ).execute()

                items = results.get('files', [])

                for item in items:
                    # Only process folders
                    if item['mimeType'] == 'application/vnd.google-apps.folder':
                        folder_id = item['id']
                        folder_name = item['name']

                        # Build path for this folder
                        if current_path:
                            folder_path = f"{current_path}/{folder_name}"
                        else:
                            folder_path = folder_name

                        folder_paths[folder_id] = folder_path
                        folders_to_process.append(folder_id)

            except Exception as e:
                logger.warning(f"Error processing folder structure: {e}")
                continue

        logger.info(f"Built folder structure with {len(folder_paths)} folders")
        return folder_paths

    def _list_files_with_paths(
        self,
        root_folder_id: str,
        folder_paths: Dict[str, str]
    ) -> List[Dict[str, any]]:
        """
        List all files with their directory paths.

        Args:
            root_folder_id: Root folder ID
            folder_paths: Map of folder_id -> path

        Returns:
            List of file metadata with 'directory_path' field
        """
        files_with_paths = []

        for folder_id, folder_path in folder_paths.items():
            try:
                # List files in this folder
                query = f"'{folder_id}' in parents and trashed=false"
                results = self.drive_gateway.service.files().list(
                    q=query,
                    pageSize=1000,
                    fields="files(id, name, mimeType, size, parents)"
                ).execute()

                items = results.get('files', [])

                for item in items:
                    # Skip folders
                    if item['mimeType'] == 'application/vnd.google-apps.folder':
                        continue

                    # Add directory path to file metadata
                    item['directory_path'] = folder_path
                    files_with_paths.append(item)

            except Exception as e:
                logger.warning(f"Error listing files in folder {folder_id}: {e}")
                continue

        return files_with_paths

    def _download_drive_file_with_path(
        self,
        file_info: Dict[str, any],
        dataset_id: int
    ) -> tuple[Optional[str], Optional[str]]:
        """
        Download a file from Drive preserving directory structure.

        Args:
            file_info: File metadata with directory_path
            dataset_id: Dataset ID

        Returns:
            Tuple of (downloaded_path, relative_path) or (None, None) if failed
        """
        try:
            file_id = file_info['id']
            file_name = file_info['name']
            directory_path = file_info.get('directory_path', '')

            # Create temp directory preserving structure
            dataset_temp_dir = self.temp_dir / f"dataset_{dataset_id}"

            if directory_path:
                target_dir = dataset_temp_dir / directory_path
                target_dir.mkdir(parents=True, exist_ok=True)
                download_path = target_dir / file_name
                relative_path = f"{directory_path}/{file_name}"
            else:
                dataset_temp_dir.mkdir(parents=True, exist_ok=True)
                download_path = dataset_temp_dir / file_name
                relative_path = file_name

            # Download file
            success = self.drive_gateway.download_file(
                file_id=file_id,
                destination_path=str(download_path)
            )

            if success:
                logger.debug(f"Downloaded: {relative_path}")
                return str(download_path), relative_path
            else:
                logger.error(f"Failed to download: {file_name}")
                return None, None

        except Exception as e:
            logger.exception(f"Error downloading file: {str(e)}")
            return None, None

    def _create_uploaded_files(
        self,
        downloaded_files: List[Dict[str, any]]
    ) -> List[SimpleUploadedFile]:
        """
        Create Django UploadedFile objects from downloaded files.

        Args:
            downloaded_files: List of downloaded file info

        Returns:
            List of SimpleUploadedFile objects
        """
        uploaded_files = []

        for file_info in downloaded_files:
            try:
                file_path = Path(file_info['path'])

                # Read file content
                with open(file_path, 'rb') as f:
                    content = f.read()

                # Create UploadedFile with relative path as name (preserves directory structure)
                uploaded_file = SimpleUploadedFile(
                    name=file_info['relative_path'],
                    content=content,
                    content_type=file_info.get('mime_type', 'application/octet-stream')
                )

                # Add size attribute
                uploaded_file.size = file_info.get('size', len(content))

                uploaded_files.append(uploaded_file)

            except Exception as e:
                logger.error(f"Error creating uploaded file for {file_info.get('name')}: {e}")
                continue

        return uploaded_files

    def cleanup_temp_files(self, dataset_id: int) -> bool:
        """
        Clean up temporary files for a dataset.

        Args:
            dataset_id: Dataset ID

        Returns:
            True if cleanup successful
        """
        try:
            dataset_temp_dir = self.temp_dir / f"dataset_{dataset_id}"

            if dataset_temp_dir.exists():
                import shutil
                shutil.rmtree(dataset_temp_dir)
                logger.info(f"Cleaned up temp files for dataset {dataset_id}")
                return True

            return True

        except Exception as e:
            logger.exception(f"Error cleaning temp files: {str(e)}")
            return False
