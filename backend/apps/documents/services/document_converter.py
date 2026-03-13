"""
Document Converter Service.

Converts PDF documents to plain text using multiple fallback strategies.
"""

import logging
from typing import Dict, Optional
from pathlib import Path

# PDF extraction libraries
import PyPDF2
from pdfminer.high_level import extract_text
from PyPDF2 import PdfReader
import pdfplumber

logger = logging.getLogger(__name__)


class DocumentConverterService:
    """
    Service for converting documents (mainly PDF) to plain text.

    Uses multiple fallback strategies:
    1. pdfplumber (best for tables and complex layouts)
    2. pdfminer.six (good for general text)
    3. PyPDF2 (fast but less accurate)
    """

    def __init__(self):
        """Initialize the document converter service."""
        self.min_text_length = 100  # Minimum chars to consider valid extraction
        self.logger = logger

    def convert_from_pdf(self, pdf_path: str) -> Dict[str, any]:
        """
        Convert a PDF to plain text. Uses pdfminer as primary method and
        falls back to PyPDF2. Does not require the file to exist before
        calling the extraction libraries (allows easy mocking in tests).

        Args:
            pdf_path: Path to PDF file

        Returns:
            Dictionary with 'success', 'text', 'method', and 'error' keys.
        """
        # Try pdfminer first
        try:
            text_content = extract_text(str(pdf_path))
            return {
                'success': True,
                'text': text_content,
                'method': 'pdfminer',
                'error': None,
            }
        except Exception as pdfminer_err:
            self.logger.warning(f"pdfminer failed for {pdf_path}: {pdfminer_err}")

        # Fallback: PyPDF2 (accessed via module so tests can patch `PyPDF2`)
        try:
            reader = PyPDF2.PdfReader(str(pdf_path))
            text_parts = [
                page.extract_text() or ''
                for page in reader.pages
            ]
            return {
                'success': True,
                'text': '\n'.join(text_parts),
                'method': 'pypdf2',
                'error': None,
            }
        except Exception as pypdf2_err:
            self.logger.warning(f"PyPDF2 failed for {pdf_path}: {pypdf2_err}")

        return {
            'success': False,
            'text': None,
            'method': None,
            'error': 'All extraction methods failed',
        }

    def convert_pdf_to_text(
        self,
        pdf_path: str,
        strategy: str = 'auto'
    ) -> Dict[str, any]:
        """
        Convert PDF to plain text.

        Args:
            pdf_path: Path to PDF file
            strategy: Extraction strategy ('auto', 'pdfplumber', 'pdfminer', 'pypdf2')

        Returns:
            Dictionary with:
                - 'text': Extracted text content
                - 'method': Method used for extraction
                - 'success': Boolean indicating success
                - 'error': Error message if failed
                - 'page_count': Number of pages
                - 'char_count': Character count

        Example:
            >>> converter = DocumentConverterService()
            >>> result = converter.convert_pdf_to_text("/path/to/doc.pdf")
            >>> print(result['text'][:100])
            "This is the extracted text..."
        """
        pdf_path = Path(pdf_path)

        if not pdf_path.exists():
            return {
                'text': None,
                'method': None,
                'success': False,
                'error': f"File not found: {pdf_path}",
                'page_count': 0,
                'char_count': 0
            }

        if strategy == 'auto':
            # Try methods in order of quality
            result = self._try_pdfplumber(pdf_path)
            if result['success'] and len(result['text']) >= self.min_text_length:
                return result

            result = self._try_pdfminer(pdf_path)
            if result['success'] and len(result['text']) >= self.min_text_length:
                return result

            result = self._try_pypdf2(pdf_path)
            if result['success']:
                return result

            # All methods failed
            return {
                'text': None,
                'method': 'none',
                'success': False,
                'error': 'All extraction methods failed',
                'page_count': 0,
                'char_count': 0
            }

        elif strategy == 'pdfplumber':
            return self._try_pdfplumber(pdf_path)

        elif strategy == 'pdfminer':
            return self._try_pdfminer(pdf_path)

        elif strategy == 'pypdf2':
            return self._try_pypdf2(pdf_path)

        else:
            return {
                'text': None,
                'method': None,
                'success': False,
                'error': f"Unknown strategy: {strategy}",
                'page_count': 0,
                'char_count': 0
            }

    def _try_pdfplumber(self, pdf_path: Path) -> Dict[str, any]:
        """
        Extract text using pdfplumber.

        Best for:
        - Tables and structured data
        - Complex layouts
        - Accurate text positioning
        """
        try:
            logger.info(f"Trying pdfplumber on {pdf_path.name}")

            with pdfplumber.open(pdf_path) as pdf:
                text_parts = []
                page_count = len(pdf.pages)

                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)

                text = '\n\n'.join(text_parts)
                char_count = len(text)

                logger.info(
                    f"pdfplumber extracted {char_count} chars "
                    f"from {page_count} pages"
                )

                return {
                    'text': text,
                    'method': 'pdfplumber',
                    'success': True,
                    'error': None,
                    'page_count': page_count,
                    'char_count': char_count
                }

        except Exception as e:
            logger.warning(f"pdfplumber failed: {e}")
            return {
                'text': None,
                'method': 'pdfplumber',
                'success': False,
                'error': str(e),
                'page_count': 0,
                'char_count': 0
            }

    def _try_pdfminer(self, pdf_path: Path) -> Dict[str, any]:
        """
        Extract text using pdfminer.six.

        Best for:
        - General text extraction
        - Good balance of speed and accuracy
        - Handles most PDFs well
        """
        try:
            logger.info(f"Trying pdfminer on {pdf_path.name}")

            text = extract_text(str(pdf_path))
            char_count = len(text)

            # Get page count using PyPDF2 (pdfminer doesn't expose it easily)
            try:
                with open(pdf_path, 'rb') as f:
                    reader = PdfReader(f)
                    page_count = len(reader.pages)
            except:
                page_count = -1  # Unknown

            logger.info(
                f"pdfminer extracted {char_count} chars "
                f"from {page_count} pages"
            )

            return {
                'text': text,
                'method': 'pdfminer',
                'success': True,
                'error': None,
                'page_count': page_count,
                'char_count': char_count
            }

        except Exception as e:
            logger.warning(f"pdfminer failed: {e}")
            return {
                'text': None,
                'method': 'pdfminer',
                'success': False,
                'error': str(e),
                'page_count': 0,
                'char_count': 0
            }

    def _try_pypdf2(self, pdf_path: Path) -> Dict[str, any]:
        """
        Extract text using PyPDF2.

        Best for:
        - Fast extraction
        - Simple PDFs
        - Last resort fallback
        """
        try:
            logger.info(f"Trying PyPDF2 on {pdf_path.name}")

            with open(pdf_path, 'rb') as f:
                reader = PdfReader(f)
                page_count = len(reader.pages)

                text_parts = []
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)

                text = '\n\n'.join(text_parts)
                char_count = len(text)

                logger.info(
                    f"PyPDF2 extracted {char_count} chars "
                    f"from {page_count} pages"
                )

                return {
                    'text': text,
                    'method': 'pypdf2',
                    'success': True,
                    'error': None,
                    'page_count': page_count,
                    'char_count': char_count
                }

        except Exception as e:
            logger.warning(f"PyPDF2 failed: {e}")
            return {
                'text': None,
                'method': 'pypdf2',
                'success': False,
                'error': str(e),
                'page_count': 0,
                'char_count': 0
            }

    def convert_batch(
        self,
        pdf_paths: list,
        strategy: str = 'auto'
    ) -> list:
        """
        Convert multiple PDFs in batch.

        Args:
            pdf_paths: List of PDF file paths
            strategy: Extraction strategy

        Returns:
            List of conversion results (same order as input)

        Example:
            >>> converter = DocumentConverterService()
            >>> paths = ["doc1.pdf", "doc2.pdf", "doc3.pdf"]
            >>> results = converter.convert_batch(paths)
            >>> success_count = sum(1 for r in results if r['success'])
            >>> print(f"Converted {success_count}/{len(paths)} documents")
        """
        results = []

        for pdf_path in pdf_paths:
            result = self.convert_pdf_to_text(pdf_path, strategy=strategy)
            results.append(result)

        success_count = sum(1 for r in results if r['success'])
        logger.info(
            f"Batch conversion: {success_count}/{len(pdf_paths)} successful"
        )

        return results

    def validate_pdf(self, pdf_path: str) -> Dict[str, any]:
        """
        Validate PDF file without full extraction.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Dictionary with validation info:
                - 'valid': Boolean
                - 'page_count': Number of pages
                - 'error': Error message if invalid

        Example:
            >>> converter = DocumentConverterService()
            >>> info = converter.validate_pdf("/path/to/doc.pdf")
            >>> if info['valid']:
            >>>     print(f"Valid PDF with {info['page_count']} pages")
        """
        pdf_path = Path(pdf_path)

        if not pdf_path.exists():
            return {
                'valid': False,
                'page_count': 0,
                'error': f"File not found: {pdf_path}"
            }

        if not pdf_path.suffix.lower() == '.pdf':
            return {
                'valid': False,
                'page_count': 0,
                'error': f"Not a PDF file: {pdf_path}"
            }

        try:
            with open(pdf_path, 'rb') as f:
                reader = PdfReader(f)
                page_count = len(reader.pages)

                return {
                    'valid': True,
                    'page_count': page_count,
                    'error': None
                }

        except Exception as e:
            return {
                'valid': False,
                'page_count': 0,
                'error': str(e)
            }

    def get_pdf_metadata(self, pdf_path: str) -> Dict[str, any]:
        """
        Extract metadata from PDF.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Dictionary with metadata (title, author, subject, etc.)

        Example:
            >>> converter = DocumentConverterService()
            >>> metadata = converter.get_pdf_metadata("/path/to/doc.pdf")
            >>> print(metadata['title'])
        """
        pdf_path = Path(pdf_path)

        try:
            with open(pdf_path, 'rb') as f:
                reader = PdfReader(f)
                metadata = reader.metadata

                return {
                    'title': metadata.get('/Title', ''),
                    'author': metadata.get('/Author', ''),
                    'subject': metadata.get('/Subject', ''),
                    'creator': metadata.get('/Creator', ''),
                    'producer': metadata.get('/Producer', ''),
                    'creation_date': metadata.get('/CreationDate', ''),
                    'page_count': len(reader.pages)
                }

        except Exception as e:
            logger.exception(f"Error extracting metadata: {e}")
            return {}
