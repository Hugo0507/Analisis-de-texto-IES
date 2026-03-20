"""
Base service for AI analysis providers.

Defines the common interface and shared logic for all LLM providers.
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

DEFAULT_PROMPT_TEMPLATE = """You are an expert researcher in digital transformation in Higher Education Institutions (HEI).

Analyze the following corpus of {n} academic documents about digital transformation in HEI.

Your task is to:
1. Identify specific SUCCESS CASES of digital transformation in HEI mentioned in the documents
2. For each success case, identify:
   - Institution name (if mentioned)
   - Type of transformation (technological, organizational, pedagogical, etc.)
   - Key factors that contributed to success
   - Outcomes and results achieved
3. Identify the most relevant FACTORS for digital transformation in HEI based on the corpus
4. Categorize factors into: Technological, Organizational, Human, Strategic, Financial, Pedagogical, Infrastructure, Security

Corpus documents:
{documents}

Respond in JSON format with this structure:
{{
  "success_cases": [
    {{"institution": "...", "transformation_type": "...", "key_factors": [...], "outcomes": "..."}}
  ],
  "identified_factors": [
    {{"factor_name": "...", "category": "...", "frequency_estimate": "high/medium/low", "evidence": "..."}}
  ],
  "summary": "..."
}}"""


class BaseAIService(ABC):
    """Base class for AI provider services."""

    # Approximate token limit per call (conservative estimate)
    MAX_TOKENS_PER_CALL = 90000
    # Average chars per token (rough estimate)
    CHARS_PER_TOKEN = 4

    def analyze_corpus(
        self,
        documents: List[Dict[str, Any]],
        prompt_template: str = ''
    ) -> Dict[str, Any]:
        """
        Analyze a corpus of documents using the AI provider.

        Args:
            documents: List of {'id': int, 'title': str, 'text': str}
            prompt_template: Custom prompt template (uses default if empty)

        Returns:
            {
                'success_cases': [...],
                'identified_factors': [...],
                'raw_response': str,
                'tokens_used': int
            }
        """
        if not prompt_template:
            prompt_template = DEFAULT_PROMPT_TEMPLATE

        chunks = self._chunk_documents(documents)
        logger.info(f"Corpus split into {len(chunks)} chunk(s) for processing")

        all_success_cases = []
        all_factors = []
        all_raw_responses = []
        total_tokens = 0

        for i, chunk in enumerate(chunks):
            logger.info(f"Processing chunk {i + 1}/{len(chunks)} ({len(chunk)} docs)")

            docs_text = self._format_documents(chunk)
            prompt = prompt_template.format(
                n=len(chunk),
                documents=docs_text,
            )

            try:
                result = self._call_api(prompt)

                all_raw_responses.append(result.get('raw_response', ''))
                total_tokens += result.get('tokens_used', 0)

                parsed = self._parse_response(result.get('raw_response', ''))
                all_success_cases.extend(parsed.get('success_cases', []))
                all_factors.extend(parsed.get('identified_factors', []))

            except Exception as e:
                logger.error(f"Error processing chunk {i + 1}: {e}")
                raise

        # Deduplicate factors by name
        unique_factors = self._deduplicate_factors(all_factors)

        return {
            'success_cases': all_success_cases,
            'identified_factors': unique_factors,
            'raw_response': '\n---\n'.join(all_raw_responses),
            'tokens_used': total_tokens,
        }

    def _chunk_documents(self, documents: List[Dict]) -> List[List[Dict]]:
        """Split documents into chunks that fit within token limits."""
        max_chars = self.MAX_TOKENS_PER_CALL * self.CHARS_PER_TOKEN
        # Reserve ~20% for prompt template and response
        max_content_chars = int(max_chars * 0.8)

        chunks = []
        current_chunk = []
        current_chars = 0

        for doc in documents:
            doc_text = f"Title: {doc.get('title', 'N/A')}\n{doc.get('text', '')}"
            doc_chars = len(doc_text)

            if current_chars + doc_chars > max_content_chars and current_chunk:
                chunks.append(current_chunk)
                current_chunk = []
                current_chars = 0

            current_chunk.append(doc)
            current_chars += doc_chars

        if current_chunk:
            chunks.append(current_chunk)

        return chunks if chunks else [[]]

    def _format_documents(self, documents: List[Dict]) -> str:
        """Format documents for inclusion in the prompt."""
        parts = []
        for doc in documents:
            doc_id = doc.get('id', 'N/A')
            title = doc.get('title', 'N/A')
            text = doc.get('text', '')
            # Truncate very long texts to avoid excessive token usage
            if len(text) > 5000:
                text = text[:5000] + '... [truncated]'
            parts.append(f"[Document {doc_id}] {title}\n{text}")
        return '\n\n'.join(parts)

    def _parse_response(self, raw_response: str) -> Dict[str, Any]:
        """Parse the JSON response from the LLM."""
        try:
            # Try to find JSON in the response
            response_text = raw_response.strip()

            # Handle markdown code blocks
            if '```json' in response_text:
                start = response_text.index('```json') + 7
                end = response_text.index('```', start)
                response_text = response_text[start:end].strip()
            elif '```' in response_text:
                start = response_text.index('```') + 3
                end = response_text.index('```', start)
                response_text = response_text[start:end].strip()

            # Try direct JSON parse
            parsed = json.loads(response_text)
            return {
                'success_cases': parsed.get('success_cases', []),
                'identified_factors': parsed.get('identified_factors', []),
                'summary': parsed.get('summary', ''),
            }

        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Could not parse JSON response: {e}")
            return {
                'success_cases': [],
                'identified_factors': [],
                'summary': raw_response[:500],
            }

    def _deduplicate_factors(self, factors: List[Dict]) -> List[Dict]:
        """Deduplicate factors by normalized name."""
        seen = {}
        for factor in factors:
            key = factor.get('factor_name', '').strip().lower()
            if key and key not in seen:
                seen[key] = factor
        return list(seen.values())

    @abstractmethod
    def _call_api(self, prompt: str) -> Dict[str, Any]:
        """
        Call the specific AI provider API.

        Args:
            prompt: The formatted prompt to send

        Returns:
            {'raw_response': str, 'tokens_used': int}
        """
        raise NotImplementedError
