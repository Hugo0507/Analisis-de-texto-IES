"""
Claude (Anthropic) AI Analysis Service.

Uses the anthropic SDK to call Claude API for corpus analysis.
"""

import logging
import time
from typing import Any, Dict

from django.conf import settings

from .base_service import BaseAIService

logger = logging.getLogger(__name__)


class ClaudeService(BaseAIService):
    """Service for analyzing corpus using Claude (Anthropic)."""

    def __init__(self, model_name: str = 'claude-sonnet-4-6'):
        self.model_name = model_name
        self.api_key = getattr(settings, 'ANTHROPIC_API_KEY', '')

    def _call_api(self, prompt: str) -> Dict[str, Any]:
        """Call Claude API via anthropic SDK."""
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY no configurada en settings")

        try:
            import anthropic
        except ImportError:
            raise ImportError(
                "El paquete 'anthropic' no esta instalado. "
                "Ejecuta: pip install anthropic"
            )

        client = anthropic.Anthropic(api_key=self.api_key)

        start_time = time.time()

        message = client.messages.create(
            model=self.model_name,
            max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt}
            ],
        )

        elapsed = time.time() - start_time
        logger.info(f"Claude API call completed in {elapsed:.2f}s")

        raw_response = ''
        for block in message.content:
            if hasattr(block, 'text'):
                raw_response += block.text

        tokens_used = (
            (message.usage.input_tokens or 0)
            + (message.usage.output_tokens or 0)
        )

        return {
            'raw_response': raw_response,
            'tokens_used': tokens_used,
            'processing_time': elapsed,
        }
