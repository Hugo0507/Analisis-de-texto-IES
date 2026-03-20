"""
Compare AI Results Use Case.

Compares results from multiple LLM providers and against traditional NLP analysis.
"""

import logging
from typing import Any, Dict, List, Set

from django.db import models

from apps.ai_analysis.models import (
    AIAnalysisConfig,
    AIAnalysisResult,
    AIComparisonResult,
)
from apps.analysis.models import Factor

logger = logging.getLogger(__name__)


class CompareAIResultsUseCase:
    """
    Use case for comparing AI analysis results.

    Compares:
    - Results between Claude, Gemini, and OpenAI
    - AI-identified factors against traditional NLP factors (Factor model)
    """

    def execute(self, config_id: int) -> Dict[str, Any]:
        """
        Compare AI results for a given config.

        Args:
            config_id: ID of the AIAnalysisConfig

        Returns:
            Dict with consensus, divergences, and NLP agreement
        """
        try:
            config = AIAnalysisConfig.objects.get(id=config_id)
        except AIAnalysisConfig.DoesNotExist:
            return {
                'success': False,
                'error': f'AIAnalysisConfig con id={config_id} no encontrada',
            }

        # Get successful results: those with identified_factors and no error
        results = list(
            AIAnalysisResult.objects.filter(config=config)
            .exclude(identified_factors=[])
            .filter(
                models.Q(error_message__isnull=True) | models.Q(error_message='')
            )
        )

        if len(results) < 2:
            return {
                'success': False,
                'error': 'Se necesitan al menos 2 resultados exitosos para comparar',
            }

        # Build factor sets per provider
        provider_factors: Dict[str, Set[str]] = {}
        provider_results: Dict[str, AIAnalysisResult] = {}

        for result in results:
            factors_set = set()
            for factor in result.identified_factors:
                name = factor.get('factor_name', '').strip().lower()
                if name:
                    factors_set.add(name)
            provider_factors[result.provider] = factors_set
            provider_results[result.provider] = result

        # Find consensus (intersection of all providers)
        all_factor_sets = list(provider_factors.values())
        consensus = all_factor_sets[0]
        for fs in all_factor_sets[1:]:
            consensus = consensus.intersection(fs)

        # Find divergent factors (in some but not all)
        all_factors_union = set()
        for fs in all_factor_sets:
            all_factors_union = all_factors_union.union(fs)
        divergent = all_factors_union - consensus

        # Build divergent detail: which provider identified each
        divergent_detail = []
        for factor_name in sorted(divergent):
            found_in = [
                provider for provider, fs in provider_factors.items()
                if factor_name in fs
            ]
            divergent_detail.append({
                'factor_name': factor_name,
                'identified_by': found_in,
                'provider_count': len(found_in),
            })

        # Compare against traditional NLP factors
        nlp_agreement = self._compare_with_nlp_factors(
            ai_factors=all_factors_union,
            provider_factors=provider_factors,
        )

        # Build comparison summary
        summary_parts = [
            f"Analisis comparativo de {len(results)} proveedores de IA.",
            f"Factores en consenso: {len(consensus)}.",
            f"Factores divergentes: {len(divergent)}.",
            f"Total factores unicos identificados: {len(all_factors_union)}.",
        ]
        if nlp_agreement.get('matching_factors'):
            summary_parts.append(
                f"Factores coincidentes con NLP tradicional: "
                f"{len(nlp_agreement['matching_factors'])}."
            )

        # Save or update comparison result
        comparison, _ = AIComparisonResult.objects.update_or_create(
            config=config,
            defaults={
                'claude_result': provider_results.get('claude'),
                'gemini_result': provider_results.get('gemini'),
                'openai_result': provider_results.get('openai'),
                'consensus_factors': sorted(consensus),
                'divergent_factors': divergent_detail,
                'nlp_agreement': nlp_agreement,
                'comparison_summary': ' '.join(summary_parts),
            },
        )

        return {
            'success': True,
            'comparison_id': comparison.id,
            'providers_compared': list(provider_factors.keys()),
            'consensus_factors': sorted(consensus),
            'consensus_count': len(consensus),
            'divergent_factors': divergent_detail,
            'divergent_count': len(divergent),
            'total_unique_factors': len(all_factors_union),
            'nlp_agreement': nlp_agreement,
            'summary': ' '.join(summary_parts),
        }

    def _compare_with_nlp_factors(
        self,
        ai_factors: Set[str],
        provider_factors: Dict[str, Set[str]],
    ) -> Dict[str, Any]:
        """
        Compare AI-identified factors against traditional NLP Factor model.

        Returns dict with matching, ai_only, and nlp_only factors.
        """
        # Get NLP factors from database
        nlp_factors = Factor.objects.all().values_list('name', flat=True)
        nlp_factor_set = {f.strip().lower() for f in nlp_factors}

        if not nlp_factor_set:
            return {
                'matching_factors': [],
                'ai_only_factors': sorted(ai_factors),
                'nlp_only_factors': [],
                'agreement_ratio': 0.0,
                'note': 'No hay factores NLP tradicionales en la base de datos',
            }

        # Fuzzy matching: check if AI factor names contain NLP factor names or vice versa
        matching = set()
        for ai_f in ai_factors:
            for nlp_f in nlp_factor_set:
                if ai_f in nlp_f or nlp_f in ai_f:
                    matching.add(ai_f)
                    break

        ai_only = ai_factors - matching
        nlp_only = nlp_factor_set - {
            nlp_f for nlp_f in nlp_factor_set
            for ai_f in ai_factors
            if ai_f in nlp_f or nlp_f in ai_f
        }

        total = len(ai_factors | nlp_factor_set)
        agreement_ratio = len(matching) / total if total > 0 else 0.0

        # Per-provider agreement
        provider_agreement = {}
        for provider, factors in provider_factors.items():
            provider_matching = set()
            for ai_f in factors:
                for nlp_f in nlp_factor_set:
                    if ai_f in nlp_f or nlp_f in ai_f:
                        provider_matching.add(ai_f)
                        break
            provider_agreement[provider] = {
                'matching_count': len(provider_matching),
                'total_ai_factors': len(factors),
                'ratio': len(provider_matching) / len(factors) if factors else 0.0,
            }

        return {
            'matching_factors': sorted(matching),
            'ai_only_factors': sorted(ai_only),
            'nlp_only_factors': sorted(nlp_only),
            'agreement_ratio': round(agreement_ratio, 4),
            'provider_agreement': provider_agreement,
        }
