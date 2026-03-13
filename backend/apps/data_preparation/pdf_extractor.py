"""
PDF Text Extraction with cascade strategy.

Tries multiple PDF libraries in order of speed:
1. pdfminer.six (fastest, simplest)
2. PyPDF2 (intermediate)
3. pdfplumber (most robust)
"""

import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class PDFExtractor:
    """
    Extractor de texto desde PDFs con sistema de cascada.

    Intenta extraer con pdfminer.six (mas simple y rapido).
    Si falla, intenta con PyPDF2 (intermedio).
    Si falla, intenta con pdfplumber (mas complejo pero robusto).
    """

    @staticmethod
    def extract_with_pdfminer(pdf_path: str) -> Optional[str]:
        """Extraer texto usando pdfminer.six (Nivel 1 - Simple)."""
        try:
            from pdfminer.high_level import extract_text
            text = extract_text(pdf_path)
            if text and text.strip():
                return text.strip()
            return None
        except Exception as e:
            logger.debug(f"pdfminer failed for {pdf_path}: {e}")
            return None

    @staticmethod
    def extract_with_pypdf2(pdf_path: str) -> Optional[str]:
        """Extraer texto usando PyPDF2 (Nivel 2 - Intermedio)."""
        try:
            import PyPDF2
            text_parts = []

            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        text_parts.append(text)

            full_text = '\n'.join(text_parts).strip()
            return full_text or None
        except Exception as e:
            logger.debug(f"PyPDF2 failed for {pdf_path}: {e}")
            return None

    @staticmethod
    def extract_with_pdfplumber(pdf_path: str) -> Optional[str]:
        """Extraer texto usando pdfplumber (Nivel 3 - Robusto)."""
        try:
            import pdfplumber
            text_parts = []

            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        text_parts.append(text)

            full_text = '\n'.join(text_parts).strip()
            return full_text or None
        except Exception as e:
            logger.debug(f"pdfplumber failed for {pdf_path}: {e}")
            return None

    @classmethod
    def extract_text(cls, pdf_path: str) -> Tuple[Optional[str], str]:
        """
        Extraer texto con sistema de cascada.

        Returns:
            tuple: (text, method_used)
        """
        extractors = [
            (cls.extract_with_pdfminer, 'pdfminer'),
            (cls.extract_with_pypdf2, 'pypdf2'),
            (cls.extract_with_pdfplumber, 'pdfplumber'),
        ]

        for extractor, method_name in extractors:
            text = extractor(pdf_path)
            if text:
                return text, method_name

        return None, 'failed'
