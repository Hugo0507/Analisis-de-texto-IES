"""
Gemini (Google) AI Analysis Service.

Uses the google-generativeai SDK to call Gemini API for corpus analysis.
"""

import logging
import time
from typing import Any, Dict

from django.conf import settings

from .base_service import BaseAIService

logger = logging.getLogger(__name__)


class GeminiService(BaseAIService):
    """Service for analyzing corpus using Gemini (Google)."""

    def __init__(self, model_name: str = 'gemini-1.5-pro'):
        self.model_name = model_name
        self.api_key = getattr(settings, 'GOOGLE_GEMINI_API_KEY', '')

    def _call_api(self, prompt: str) -> Dict[str, Any]:
        """Call Gemini API via google-generativeai SDK."""
        if not self.api_key:
            raise ValueError("GOOGLE_GEMINI_API_KEY no configurada en settings")

        try:
            import google.generativeai as genai
        except ImportError:
            raise ImportError(
                "El paquete 'google-generativeai' no esta instalado. "
                "Ejecuta: pip install google-generativeai"
            )

        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel(self.model_name)

        start_time = time.time()

        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=4096,
                temperature=0.2,
            ),
        )

        elapsed = time.time() - start_time
        logger.info(f"Gemini API call completed in {elapsed:.2f}s")

        raw_response = response.text or ''

        # Gemini usage metadata
        tokens_used = 0
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            tokens_used = (
                getattr(response.usage_metadata, 'prompt_token_count', 0)
                + getattr(response.usage_metadata, 'candidates_token_count', 0)
            )

        return {
            'raw_response': raw_response,
            'tokens_used': tokens_used,
            'processing_time': elapsed,
        }
