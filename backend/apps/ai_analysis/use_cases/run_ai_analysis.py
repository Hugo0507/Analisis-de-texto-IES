"""
Run AI Analysis Use Case.

Orchestrates multi-provider LLM analysis of the document corpus.
"""

import logging
import time
from typing import Any, Dict, List

from apps.ai_analysis.models import AIAnalysisConfig, AIAnalysisResult
from apps.ai_analysis.services.claude_service import ClaudeService
from apps.ai_analysis.services.gemini_service import GeminiService
from apps.ai_analysis.services.openai_service import OpenAIService
from apps.ai_analysis.use_cases.compare_ai_results import CompareAIResultsUseCase
from apps.datasets.models import DatasetFile

logger = logging.getLogger(__name__)

PROVIDER_SERVICES = {
    'claude': ClaudeService,
    'gemini': GeminiService,
    'openai': OpenAIService,
}


class RunAIAnalysisUseCase:
    """
    Use case for running AI analysis across multiple LLM providers.

    Orchestrates:
    - Loading AIAnalysisConfig and dataset documents
    - Calling each provider service
    - Saving AIAnalysisResult per provider
    - Triggering comparison if all providers completed
    """

    def execute(
        self,
        config_id: int,
        providers: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute AI analysis for the given config.

        Args:
            config_id: ID of the AIAnalysisConfig
            providers: List of providers to run (default: all three)

        Returns:
            Dict with success, results, and comparison
        """
        if providers is None:
            providers = ['claude', 'gemini', 'openai']

        # Validate providers
        invalid = [p for p in providers if p not in PROVIDER_SERVICES]
        if invalid:
            return {
                'success': False,
                'error': f"Proveedores invalidos: {invalid}. Opciones: {list(PROVIDER_SERVICES.keys())}",
            }

        try:
            config = AIAnalysisConfig.objects.select_related('dataset').get(id=config_id)
        except AIAnalysisConfig.DoesNotExist:
            return {
                'success': False,
                'error': f'AIAnalysisConfig con id={config_id} no encontrada',
            }

        # Update status
        config.status = 'processing'
        config.save(update_fields=['status', 'updated_at'])

        # Load documents from dataset
        files = DatasetFile.objects.filter(
            dataset=config.dataset,
            preprocessed_text__isnull=False,
        ).exclude(preprocessed_text='')

        if not files.exists():
            config.status = 'error'
            config.save(update_fields=['status', 'updated_at'])
            return {
                'success': False,
                'error': 'No hay documentos preprocesados en el dataset seleccionado',
            }

        documents = [
            {
                'id': f.id,
                'title': f.bib_title or f.filename,
                'text': f.preprocessed_text,
                'year': f.bib_year,
            }
            for f in files
        ]

        logger.info(
            f"Running AI analysis config #{config_id} with {len(documents)} docs, "
            f"providers: {providers}"
        )

        results = {}
        errors = {}

        for provider in providers:
            logger.info(f"Starting analysis with provider: {provider}")
            start_time = time.time()

            try:
                service_class = PROVIDER_SERVICES[provider]
                service = service_class(model_name=config.model_name)
                result = service.analyze_corpus(
                    documents=documents,
                    prompt_template=config.prompt_template,
                )
                elapsed = time.time() - start_time

                # Save result
                ai_result = AIAnalysisResult.objects.create(
                    config=config,
                    provider=provider,
                    raw_response=result.get('raw_response', ''),
                    success_cases=result.get('success_cases', []),
                    identified_factors=result.get('identified_factors', []),
                    tokens_used=result.get('tokens_used', 0),
                    processing_time_seconds=elapsed,
                )

                results[provider] = {
                    'result_id': ai_result.id,
                    'success_cases_count': len(ai_result.success_cases),
                    'factors_count': len(ai_result.identified_factors),
                    'tokens_used': ai_result.tokens_used,
                    'processing_time_seconds': round(elapsed, 2),
                }

                logger.info(
                    f"Provider {provider} completed: "
                    f"{len(ai_result.success_cases)} cases, "
                    f"{len(ai_result.identified_factors)} factors, "
                    f"{ai_result.tokens_used} tokens, {elapsed:.2f}s"
                )

            except Exception as e:
                elapsed = time.time() - start_time
                logger.exception(f"Error with provider {provider}: {e}")
                errors[provider] = str(e)

                # Save error result
                AIAnalysisResult.objects.create(
                    config=config,
                    provider=provider,
                    raw_response='',
                    success_cases=[],
                    identified_factors=[],
                    tokens_used=0,
                    processing_time_seconds=elapsed,
                    error_message=str(e),
                )

        # Run comparison if at least 2 providers succeeded
        comparison = None
        if len(results) >= 2:
            try:
                compare_uc = CompareAIResultsUseCase()
                comparison = compare_uc.execute(config_id)
            except Exception as e:
                logger.exception(f"Error generating comparison: {e}")

        # Update config status
        if errors and not results:
            config.status = 'error'
        else:
            config.status = 'completed'
        config.save(update_fields=['status', 'updated_at'])

        return {
            'success': bool(results),
            'config_id': config_id,
            'document_count': len(documents),
            'results': results,
            'errors': errors if errors else None,
            'comparison': comparison,
        }
