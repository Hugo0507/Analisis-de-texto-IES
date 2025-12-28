"""
Language Detection Service.

Uses langdetect and pdfminer to detect language from documents.
"""

import logging
from typing import Dict, Optional
from langdetect import detect, detect_langs, LangDetectException
from pdfminer.high_level import extract_text as pdfminer_extract_text

logger = logging.getLogger(__name__)


class LanguageDetectorService:
    """
    Service for detecting language from text and PDF documents.

    Uses langdetect library which supports 55+ languages.
    Returns ISO 639-1 language codes (e.g., 'es', 'en', 'fr').
    """

    def __init__(self):
        """Initialize the language detector service."""
        self.supported_languages = [
            'es', 'en', 'pt', 'fr', 'de', 'it', 'ca', 'gl', 'eu'
        ]
        self.min_text_length = 50  # Minimum characters for reliable detection

    def detect_from_text(
        self,
        text: str,
        return_confidence: bool = True
    ) -> Dict[str, Optional[float]]:
        """
        Detect language from plain text.

        Args:
            text: Text content to analyze
            return_confidence: Whether to return confidence score

        Returns:
            Dictionary with 'language' and optional 'confidence' keys

        Example:
            >>> service = LanguageDetectorService()
            >>> result = service.detect_from_text("Este es un texto en espanol")
            >>> print(result)
            {'language': 'es', 'confidence': 0.9999}
        """
        if not text or len(text.strip()) < self.min_text_length:
            logger.warning(
                f"Text too short for language detection: {len(text)} chars"
            )
            return {'language': None, 'confidence': 0.0}

        try:
            # Clean text
            cleaned_text = self._clean_text(text)

            if return_confidence:
                # Detect with probabilities
                detections = detect_langs(cleaned_text)

                if detections:
                    best_detection = detections[0]
                    language = best_detection.lang
                    confidence = best_detection.prob

                    logger.info(
                        f"Detected language: {language} "
                        f"(confidence: {confidence:.4f})"
                    )

                    return {
                        'language': language,
                        'confidence': round(confidence, 4)
                    }
            else:
                # Simple detection
                language = detect(cleaned_text)

                logger.info(f"Detected language: {language}")

                return {
                    'language': language,
                    'confidence': None
                }

        except LangDetectException as e:
            logger.error(f"Language detection failed: {e}")
            return {'language': None, 'confidence': 0.0}

        except Exception as e:
            logger.exception(f"Unexpected error in language detection: {e}")
            return {'language': None, 'confidence': 0.0}

    def detect_from_pdf(
        self,
        pdf_path: str,
        max_pages: int = 5
    ) -> Dict[str, Optional[float]]:
        """
        Detect language from PDF file.

        Args:
            pdf_path: Path to PDF file
            max_pages: Maximum pages to extract (for performance)

        Returns:
            Dictionary with 'language' and 'confidence' keys

        Example:
            >>> service = LanguageDetectorService()
            >>> result = service.detect_from_pdf("/path/to/document.pdf")
            >>> print(result)
            {'language': 'es', 'confidence': 0.9856}
        """
        try:
            # Extract text from PDF (first N pages)
            text = pdfminer_extract_text(
                pdf_path,
                maxpages=max_pages
            )

            logger.info(
                f"Extracted {len(text)} chars from PDF: {pdf_path}"
            )

            # Detect language from extracted text
            return self.detect_from_text(text)

        except Exception as e:
            logger.exception(f"Error extracting text from PDF: {e}")
            return {'language': None, 'confidence': 0.0}

    def detect_from_file(
        self,
        file_path: str
    ) -> Dict[str, Optional[float]]:
        """
        Detect language from file (auto-detects PDF or TXT).

        Args:
            file_path: Path to file

        Returns:
            Dictionary with 'language' and 'confidence' keys
        """
        if file_path.lower().endswith('.pdf'):
            return self.detect_from_pdf(file_path)
        else:
            # Assume text file
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read()
                return self.detect_from_text(text)
            except Exception as e:
                logger.exception(f"Error reading text file: {e}")
                return {'language': None, 'confidence': 0.0}

    def is_supported_language(self, language_code: str) -> bool:
        """
        Check if language is supported for further analysis.

        Args:
            language_code: ISO 639-1 language code

        Returns:
            True if language is supported
        """
        return language_code in self.supported_languages

    def get_all_probabilities(self, text: str) -> list:
        """
        Get probabilities for all detected languages.

        Args:
            text: Text content to analyze

        Returns:
            List of dicts with 'language' and 'probability' keys,
            sorted by probability descending

        Example:
            >>> service = LanguageDetectorService()
            >>> probs = service.get_all_probabilities("Este es un texto")
            >>> print(probs)
            [
                {'language': 'es', 'probability': 0.9999},
                {'language': 'ca', 'probability': 0.0001}
            ]
        """
        if not text or len(text.strip()) < self.min_text_length:
            return []

        try:
            cleaned_text = self._clean_text(text)
            detections = detect_langs(cleaned_text)

            result = [
                {
                    'language': detection.lang,
                    'probability': round(detection.prob, 4)
                }
                for detection in detections
            ]

            return sorted(result, key=lambda x: x['probability'], reverse=True)

        except Exception as e:
            logger.exception(f"Error getting all probabilities: {e}")
            return []

    def _clean_text(self, text: str) -> str:
        """
        Clean text for language detection.

        Args:
            text: Raw text

        Returns:
            Cleaned text
        """
        # Remove excessive whitespace
        cleaned = ' '.join(text.split())

        # Remove URLs
        import re
        cleaned = re.sub(r'http\S+|www\.\S+', '', cleaned)

        # Remove email addresses
        cleaned = re.sub(r'\S+@\S+', '', cleaned)

        # Remove numbers-only sequences
        cleaned = re.sub(r'\b\d+\b', '', cleaned)

        return cleaned.strip()

    def detect_batch(
        self,
        texts: list
    ) -> list:
        """
        Detect language for multiple texts in batch.

        Args:
            texts: List of text strings

        Returns:
            List of detection results (same order as input)

        Example:
            >>> service = LanguageDetectorService()
            >>> texts = ["Texto en espanol", "English text", "Texte francais"]
            >>> results = service.detect_batch(texts)
            >>> print(results)
            [
                {'language': 'es', 'confidence': 0.9999},
                {'language': 'en', 'confidence': 0.9999},
                {'language': 'fr', 'confidence': 0.9999}
            ]
        """
        results = []

        for text in texts:
            result = self.detect_from_text(text)
            results.append(result)

        logger.info(f"Batch detection completed for {len(texts)} texts")

        return results
