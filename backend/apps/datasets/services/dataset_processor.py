"""
Dataset Processor Service.

Handles file uploads and processing for datasets.
"""

import logging
import os
import hashlib
from pathlib import Path
from typing import List, Dict
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile

from apps.documents.services.document_converter import DocumentConverterService
from apps.documents.services.language_detector import LanguageDetectorService
from apps.documents.services.text_preprocessor import TextPreprocessorService
from ..models import Dataset, DatasetFile

logger = logging.getLogger(__name__)


class DatasetProcessorService:
    """
    Service for processing dataset files.

    Handles:
    - File uploads and storage
    - Text extraction from PDFs
    - Language detection
    - Text preprocessing
    """

    def __init__(self):
        """Initialize the dataset processor service."""
        self.document_converter = DocumentConverterService()
        self.language_detector = LanguageDetectorService()
        self.text_preprocessor = TextPreprocessorService()

        # Create media directory for datasets
        self.media_root = Path(settings.MEDIA_ROOT) if hasattr(settings, 'MEDIA_ROOT') else Path('media')
        self.datasets_dir = self.media_root / 'datasets'
        self.datasets_dir.mkdir(parents=True, exist_ok=True)

    def process_uploaded_files(
        self,
        dataset: Dataset,
        files: List[UploadedFile]
    ) -> Dict[str, any]:
        """
        Process uploaded files for a dataset.

        Args:
            dataset: Dataset instance
            files: List of uploaded files

        Returns:
            Dictionary with processing results
        """
        results = {
            'success': True,
            'processed': 0,
            'failed': 0,
            'errors': []
        }

        total_size = 0

        for uploaded_file in files:
            try:
                # Save file to disk
                file_path = self._save_file(dataset, uploaded_file)
                file_size = uploaded_file.size
                total_size += file_size

                # Create DatasetFile record
                dataset_file = DatasetFile.objects.create(
                    dataset=dataset,
                    filename=os.path.basename(file_path),
                    original_filename=uploaded_file.name,
                    file_path=str(file_path),
                    file_size_bytes=file_size,
                    mime_type=uploaded_file.content_type or self._guess_mime_type(uploaded_file.name),
                    status='pending'
                )

                # Process file asynchronously (for now, synchronously)
                self._process_file(dataset_file)
                results['processed'] += 1

            except Exception as e:
                logger.error(f"Error processing file {uploaded_file.name}: {str(e)}")
                results['failed'] += 1
                results['errors'].append(f"{uploaded_file.name}: {str(e)}")
                results['success'] = False

        # Update dataset totals
        dataset.total_files = dataset.files.count()
        dataset.total_size_bytes = total_size
        dataset.status = 'completed' if results['failed'] == 0 else 'error'
        dataset.save()

        return results

    def _save_file(self, dataset: Dataset, uploaded_file: UploadedFile) -> str:
        """
        Save uploaded file to disk.

        Args:
            dataset: Dataset instance
            uploaded_file: Uploaded file

        Returns:
            Path to saved file
        """
        # Create dataset directory
        dataset_dir = self.datasets_dir / f"dataset_{dataset.id}"
        dataset_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename
        original_name = uploaded_file.name
        name, ext = os.path.splitext(original_name)

        # Use hash to ensure uniqueness
        hash_obj = hashlib.md5(original_name.encode())
        hash_suffix = hash_obj.hexdigest()[:8]

        unique_filename = f"{name}_{hash_suffix}{ext}"
        file_path = dataset_dir / unique_filename

        # Save file
        with open(file_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        logger.info(f"File saved: {file_path}")
        return str(file_path)

    def _process_file(self, dataset_file: DatasetFile) -> None:
        """
        Process a single dataset file.

        Args:
            dataset_file: DatasetFile instance
        """
        try:
            dataset_file.status = 'processing'
            dataset_file.save()

            # Extract text from PDF
            if dataset_file.mime_type and 'pdf' in dataset_file.mime_type.lower():
                result = self.document_converter.convert_pdf_to_text(
                    dataset_file.file_path
                )

                if result['success']:
                    dataset_file.txt_content = result['text']
                else:
                    raise Exception(f"PDF conversion failed: {result.get('error', 'Unknown error')}")

            # For TXT files, read directly
            elif dataset_file.original_filename.endswith('.txt'):
                with open(dataset_file.file_path, 'r', encoding='utf-8') as f:
                    dataset_file.txt_content = f.read()

            else:
                # For other file types, try to read as text
                try:
                    with open(dataset_file.file_path, 'r', encoding='utf-8') as f:
                        dataset_file.txt_content = f.read()
                except Exception as e:
                    logger.warning(f"Could not read file as text: {e}")
                    dataset_file.txt_content = ""

            # Detect language
            if dataset_file.txt_content:
                lang_result = self.language_detector.detect_language(
                    dataset_file.txt_content
                )
                dataset_file.language_code = lang_result.get('language')
                dataset_file.language_confidence = lang_result.get('confidence')

                # Preprocess text
                preprocessed = self.text_preprocessor.preprocess(
                    dataset_file.txt_content,
                    language=dataset_file.language_code
                )
                dataset_file.preprocessed_text = preprocessed

            dataset_file.status = 'completed'
            dataset_file.save()

            logger.info(f"File processed successfully: {dataset_file.filename}")

        except Exception as e:
            logger.error(f"Error processing file {dataset_file.filename}: {str(e)}")
            dataset_file.status = 'error'
            dataset_file.error_message = str(e)
            dataset_file.save()

    def _guess_mime_type(self, filename: str) -> str:
        """
        Guess MIME type from filename extension.

        Args:
            filename: Filename

        Returns:
            MIME type string
        """
        ext = os.path.splitext(filename)[1].lower()
        mime_types = {
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }
        return mime_types.get(ext, 'application/octet-stream')
