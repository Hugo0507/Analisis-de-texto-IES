"""
Dataset Processor Service.

Handles file uploads, storage, and automatic bibliographic metadata extraction.
"""

import logging
import os
import re
import hashlib
from pathlib import Path
from typing import List, Dict
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile

from ..models import Dataset, DatasetFile
from .bib_extractor import BibExtractorService

logger = logging.getLogger(__name__)


class DatasetProcessorService:
    """
    Service for processing dataset files.

    Handles:
    - File uploads and storage
    - Metadata registration (name, size, extension, directory)

    DOES NOT handle (deferred to Pipeline NLP):
    - Text extraction from PDFs
    - Language detection
    - Text preprocessing
    """

    def __init__(self):
        """Initialize the dataset processor service."""
        self.media_root = Path(settings.MEDIA_ROOT) if hasattr(settings, 'MEDIA_ROOT') else Path('media')
        self.datasets_dir = self.media_root / 'datasets'
        self.datasets_dir.mkdir(parents=True, exist_ok=True)
        self.bib_extractor = BibExtractorService()

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
                # Extract directory information from filename
                directory_info = self._extract_directory_info(uploaded_file.name)

                # Save file to disk
                file_path = self._save_file(dataset, uploaded_file, directory_info['directory_path'])
                file_size = uploaded_file.size
                total_size += file_size

                # Create DatasetFile record (NO PROCESSING - only metadata)
                dataset_file = DatasetFile.objects.create(
                    dataset=dataset,
                    filename=os.path.basename(file_path),
                    original_filename=uploaded_file.name,
                    file_path=str(file_path),
                    file_size_bytes=file_size,
                    mime_type=uploaded_file.content_type or self._guess_mime_type(uploaded_file.name),
                    directory_path=directory_info['directory_path'],
                    directory_name=directory_info['directory_name'],
                    status='completed'  # Mark as completed (no processing needed)
                )

                # NO PROCESSING HERE - Dataset section only stores file metadata
                # Processing (PDF conversion, language detection) happens in Pipeline NLP section
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

    def process_uploaded_files_with_paths(
        self,
        dataset: Dataset,
        files_with_paths: List[tuple]
    ) -> Dict[str, any]:
        """
        Process uploaded files with explicit paths for a dataset.

        Args:
            dataset: Dataset instance
            files_with_paths: List of (UploadedFile, path_string) tuples

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

        # Separate bib/ris files from document files so we can match them later
        bib_entries = {}   # filename_stem -> list of metadata dicts (from .bib/.ris)
        doc_files = []     # (uploaded_file, file_path_str) for PDFs etc.

        for uploaded_file, file_path_str in files_with_paths:
            ext = Path(file_path_str).suffix.lower()
            if ext == '.bib':
                try:
                    content = uploaded_file.read().decode('utf-8', errors='replace')
                    entries = self.bib_extractor.parse_bibtex(content)
                    # Index by title for later matching
                    for entry in entries:
                        title_key = self._normalize_title(entry.get('bib_title', ''))
                        if title_key:
                            bib_entries[title_key] = entry
                    logger.info(f"Parsed {len(entries)} entries from {file_path_str}")
                except Exception as e:
                    logger.warning(f"BibTeX parse failed for {file_path_str}: {e}")
                # Don't create a DatasetFile for the .bib control file itself
                continue
            elif ext == '.ris':
                try:
                    content = uploaded_file.read().decode('utf-8', errors='replace')
                    entries = self.bib_extractor.parse_ris(content)
                    for entry in entries:
                        title_key = self._normalize_title(entry.get('bib_title', ''))
                        if title_key:
                            bib_entries[title_key] = entry
                    logger.info(f"Parsed {len(entries)} entries from {file_path_str}")
                except Exception as e:
                    logger.warning(f"RIS parse failed for {file_path_str}: {e}")
                continue
            else:
                doc_files.append((uploaded_file, file_path_str))

        for uploaded_file, file_path_str in doc_files:
            try:
                # Extract directory information from the provided path
                directory_info = self._extract_directory_info(file_path_str)

                # Read content BEFORE _save_file consumes the file pointer
                file_bytes = uploaded_file.read()
                uploaded_file.seek(0)

                # Save file to disk (best-effort; content is persisted in DB below)
                saved_path = self._save_file(dataset, uploaded_file, directory_info['directory_path'])
                file_size = uploaded_file.size or len(file_bytes)
                total_size += file_size

                ext = Path(file_path_str).suffix.lower()
                original_name = os.path.basename(file_path_str)

                # Create DatasetFile record — file_content stored in DB for persistent downloads
                dataset_file = DatasetFile.objects.create(
                    dataset=dataset,
                    filename=os.path.basename(saved_path),
                    original_filename=original_name,
                    file_path=str(saved_path),
                    file_size_bytes=file_size,
                    mime_type=uploaded_file.content_type or self._guess_mime_type(file_path_str),
                    directory_path=directory_info['directory_path'],
                    directory_name=directory_info['directory_name'],
                    file_content=file_bytes,
                    status='completed',
                )

                # ── Automatic bibliographic metadata extraction ──────────────
                bib_meta = {}

                # Priority 1: match against parsed .bib/.ris entries (most accurate)
                # (title not known yet, so we do PDF extraction first)

                # Priority 2: extract metadata from the file
                if ext == '.pdf':
                    try:
                        bib_meta = self.bib_extractor.extract_from_pdf(
                            str(saved_path), original_filename=original_name
                        )
                        logger.info(
                            f"[Processor] {original_name}: extracted fields={list(bib_meta.keys())}"
                        )
                    except Exception as e:
                        logger.warning(f"[Processor] Bib extraction failed for {original_name}: {e}")
                elif ext == '.txt':
                    try:
                        bib_meta = self.bib_extractor.extract_from_text_file(
                            str(saved_path), original_filename=original_name
                        )
                        logger.info(
                            f"[Processor] {original_name}: extracted fields={list(bib_meta.keys())}"
                        )
                    except Exception as e:
                        logger.warning(f"[Processor] Bib extraction failed for {original_name}: {e}")

                # Priority 1 (deferred): if a .bib/.ris was uploaded, try to match by title
                if bib_entries:
                    pdf_title_key = self._normalize_title(bib_meta.get('bib_title', ''))
                    matched = bib_entries.get(pdf_title_key)
                    if matched:
                        # BibTeX/RIS match takes precedence (user-verified data)
                        bib_meta.update(matched)

                # Apply extracted metadata to the DatasetFile
                if bib_meta:
                    self._apply_bib_metadata(dataset_file, bib_meta)

                # Auto-detect source DB from directory name if not found
                if not dataset_file.bib_source_db:
                    detected = dataset_file.auto_detect_source_db()
                    if detected:
                        dataset_file.bib_source_db = detected
                        dataset_file.save(update_fields=['bib_source_db'])

                results['processed'] += 1

            except Exception as e:
                logger.error(f"Error processing file {file_path_str}: {str(e)}")
                results['failed'] += 1
                results['errors'].append(f"{file_path_str}: {str(e)}")
                results['success'] = False

        # Update dataset totals
        dataset.total_files = dataset.files.count()
        dataset.total_size_bytes = sum(f.file_size_bytes for f in dataset.files.all())
        dataset.status = 'completed' if results['failed'] == 0 else 'error'
        dataset.save()

        logger.info(f"Processed {results['processed']} files for dataset {dataset.id}")

        return results

    def _apply_bib_metadata(self, dataset_file: DatasetFile, meta: dict) -> None:
        """Apply a bib_* metadata dict to a DatasetFile and save it."""
        allowed_fields = {
            'bib_title', 'bib_authors', 'bib_year', 'bib_journal', 'bib_doi',
            'bib_abstract', 'bib_keywords', 'bib_source_db',
            'bib_volume', 'bib_issue', 'bib_pages',
        }
        update_fields = []
        for field, value in meta.items():
            if field in allowed_fields and value:
                setattr(dataset_file, field, value)
                update_fields.append(field)
        if update_fields:
            dataset_file.save(update_fields=update_fields)

    def _normalize_title(self, title: str) -> str:
        """Normalize a title string for fuzzy matching (lowercase, no punctuation)."""
        if not title:
            return ''
        normalized = title.lower()
        normalized = re.sub(r'[^\w\s]', '', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()
        return normalized

    def _save_file(self, dataset: Dataset, uploaded_file: UploadedFile, directory_path: str = None) -> str:
        """
        Save uploaded file to disk, preserving directory structure if provided.

        Args:
            dataset: Dataset instance
            uploaded_file: Uploaded file
            directory_path: Optional directory path to preserve structure

        Returns:
            Path to saved file
        """
        # Create dataset directory
        dataset_dir = self.datasets_dir / f"dataset_{dataset.id}"

        # If directory path is provided, create subdirectories
        if directory_path:
            target_dir = dataset_dir / directory_path
            target_dir.mkdir(parents=True, exist_ok=True)
        else:
            target_dir = dataset_dir
            target_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename
        original_name = os.path.basename(uploaded_file.name)
        name, ext = os.path.splitext(original_name)

        # Use hash to ensure uniqueness
        hash_obj = hashlib.md5(uploaded_file.name.encode())
        hash_suffix = hash_obj.hexdigest()[:8]

        unique_filename = f"{name}_{hash_suffix}{ext}"
        file_path = target_dir / unique_filename

        # Save file
        with open(file_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        logger.info(f"File saved: {file_path}")
        return str(file_path)

    def _extract_directory_info(self, filename: str) -> Dict[str, str]:
        """
        Extract directory information from filename.

        When uploading a folder, browsers send the relative path in the filename
        (e.g., "folder1/subfolder2/file.txt").

        Args:
            filename: Filename potentially containing directory path

        Returns:
            Dictionary with 'directory_path' and 'directory_name'
        """
        # Normalize path separators (handle both / and \)
        normalized_path = filename.replace('\\', '/')

        # Split into directory and filename
        parts = normalized_path.split('/')

        # If there's only one part, it's a file in the root
        if len(parts) == 1:
            return {
                'directory_path': None,
                'directory_name': None
            }

        # Extract directory path (everything except the last part)
        directory_parts = parts[:-1]
        directory_path = '/'.join(directory_parts)

        # Extract immediate parent directory name
        directory_name = directory_parts[-1] if directory_parts else None

        return {
            'directory_path': directory_path,
            'directory_name': directory_name
        }

    # _process_file() REMOVED - No NLP processing in Datasets section
    # All processing (PDF conversion, language detection, preprocessing)
    # happens in Pipeline NLP section

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
