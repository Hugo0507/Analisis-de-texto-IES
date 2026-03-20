"""
OpenAI (ChatGPT) AI Analysis Service.

Uses the openai SDK to call OpenAI API for corpus analysis.
"""

import logging
import time
from typing import Any, Dict

from django.conf import settings

from .base_service import BaseAIService

logger = logging.getLogger(__name__)


class OpenAIService(BaseAIService):
    """Service for analyzing corpus using OpenAI (ChatGPT)."""

    def __init__(self, model_name: str = 'gpt-4o'):
        self.model_name = model_name
        self.api_key = getattr(settings, 'OPENAI_API_KEY', '')

    def _call_api(self, prompt: str) -> Dict[str, Any]:
        """Call OpenAI API via openai SDK."""
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY no configurada en settings")

        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError(
                "El paquete 'openai' no esta instalado. "
                "Ejecuta: pip install openai"
            )

        client = OpenAI(api_key=self.api_key)

        start_time = time.time()

        response = client.chat.completions.create(
            model=self.model_name,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert researcher in digital transformation "
                        "in Higher Education Institutions. Respond only in valid JSON."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=4096,
            temperature=0.2,
        )

        elapsed = time.time() - start_time
        logger.info(f"OpenAI API call completed in {elapsed:.2f}s")

        raw_response = ''
        if response.choices:
            raw_response = response.choices[0].message.content or ''

        tokens_used = 0
        if response.usage:
            tokens_used = response.usage.total_tokens or 0

        return {
            'raw_response': raw_response,
            'tokens_used': tokens_used,
            'processing_time': elapsed,
        }
