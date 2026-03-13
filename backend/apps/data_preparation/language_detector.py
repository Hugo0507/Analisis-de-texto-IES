"""
Language detection for text documents.

Uses langdetect library to identify the language
and confidence level of extracted text.
"""

import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


class LanguageDetector:
    """Detector de idioma usando langdetect."""

    @staticmethod
    def detect_language(text: str) -> Tuple[Optional[str], float]:
        """
        Detectar idioma de un texto.

        Args:
            text: Texto a analizar

        Returns:
            tuple: (language_code, confidence)
        """
        try:
            from langdetect import detect, detect_langs

            lang = detect(text)

            langs = detect_langs(text)
            confidence = 0.0
            for lang_info in langs:
                if lang_info.lang == lang:
                    confidence = lang_info.prob
                    break

            return lang, confidence
        except Exception as e:
            logger.warning(f"Error detecting language: {e}")
            return 'unknown', 0.0
