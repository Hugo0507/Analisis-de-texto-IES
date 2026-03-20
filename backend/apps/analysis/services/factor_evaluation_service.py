"""
Factor Evaluation Service.

Evaluates the quality of keyword-based factor detection
using proxy metrics (no ground truth available).
"""

import logging
from typing import Any, Dict, List, Optional
from collections import defaultdict, Counter

from apps.analysis.models import Factor, DocumentFactor
from apps.datasets.models import DatasetFile

logger = logging.getLogger(__name__)


class FactorEvaluationService:
    """
    Service for evaluating keyword-based factor detection quality.

    Since no manual ground truth is available, this service computes
    proxy metrics that indicate detection quality:

    1. Coverage: % of corpus documents mentioning the factor
    2. Density: average mentions per document that contains the factor
    3. Keyword precision proxy: internal coherence (multiple keywords
       from the same factor in the same document = stronger match)
    4. Factor distinctiveness: how distinct each factor is from others
       (high keyword overlap with other factors = less distinctive)
    5. Keyword coverage: % of dictionary keywords that appear at least
       once in the corpus (unused keywords may be irrelevant)
    """

    def evaluate_factor_detection(
        self,
        factor_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Evaluate the quality of keyword matching for factor identification.

        Args:
            factor_id: Optional specific factor ID. If None, evaluate all.

        Returns:
            Dictionary with per-factor and global metrics.
        """
        logger.info("Starting factor detection evaluation")

        try:
            # Load factors
            if factor_id:
                factors = list(
                    Factor.objects.filter(id=factor_id)
                    .values('id', 'name', 'category', 'keywords')
                )
            else:
                factors = list(
                    Factor.objects.all()
                    .values('id', 'name', 'category', 'keywords')
                )

            if not factors:
                return {
                    'success': False,
                    'error': 'No factors found in database.'
                }

            # Load corpus
            corpus_files = DatasetFile.objects.filter(
                preprocessed_text__isnull=False
            ).exclude(preprocessed_text='')

            if not corpus_files.exists():
                return {
                    'success': False,
                    'error': 'No preprocessed documents found.'
                }

            total_docs = corpus_files.count()
            corpus_texts = list(
                corpus_files.values_list('id', 'preprocessed_text')
            )

            # Load DocumentFactor data
            if factor_id:
                doc_factors = DocumentFactor.objects.filter(factor_id=factor_id)
            else:
                doc_factors = DocumentFactor.objects.all()

            doc_factors = doc_factors.select_related('factor')

            # Build lookup structures
            # factor_id -> list of (doc_id, mention_count)
            factor_doc_mentions = defaultdict(list)
            for df in doc_factors:
                factor_doc_mentions[df.factor_id].append({
                    'document_id': df.document_id,
                    'mention_count': df.mention_count,
                    'relevance_score': df.relevance_score,
                })

            # doc_id -> set of factor_ids present
            doc_factor_sets = defaultdict(set)
            for df in doc_factors:
                doc_factor_sets[df.document_id].add(df.factor_id)

            # Compute per-factor metrics
            per_factor_metrics = []
            all_keywords_in_corpus = set()
            all_keywords_total = set()

            for factor in factors:
                fid = factor['id']
                fname = factor['name']
                fcategory = factor['category']
                fkeywords = factor.get('keywords') or []

                mentions = factor_doc_mentions.get(fid, [])
                docs_with_factor = len(mentions)

                # 1. Coverage
                coverage = docs_with_factor / total_docs if total_docs > 0 else 0.0

                # 2. Density
                if docs_with_factor > 0:
                    total_mentions = sum(m['mention_count'] for m in mentions)
                    density = total_mentions / docs_with_factor
                else:
                    total_mentions = 0
                    density = 0.0

                # 3. Keyword precision proxy
                # Check how many unique keywords actually matched per document
                # by scanning the corpus for this factor's keywords
                keyword_precision = self._compute_keyword_precision(
                    fkeywords, corpus_texts, mentions
                )

                # 4. Factor distinctiveness
                distinctiveness = self._compute_factor_distinctiveness(
                    fid, factor_doc_mentions, doc_factor_sets, docs_with_factor
                )

                # 5. Keyword coverage
                kw_coverage, kw_found = self._compute_keyword_coverage(
                    fkeywords, corpus_texts
                )
                all_keywords_total.update(fkeywords)
                all_keywords_in_corpus.update(kw_found)

                per_factor_metrics.append({
                    'factor_id': fid,
                    'factor_name': fname,
                    'category': fcategory,
                    'coverage': round(coverage, 4),
                    'documents_with_factor': docs_with_factor,
                    'total_mentions': total_mentions,
                    'density': round(density, 4),
                    'keyword_precision_proxy': round(keyword_precision, 4),
                    'factor_distinctiveness': round(distinctiveness, 4),
                    'keyword_coverage': round(kw_coverage, 4),
                    'keywords_found': len(kw_found),
                    'keywords_total': len(fkeywords),
                })

            # Global metrics
            avg_coverage = (
                sum(m['coverage'] for m in per_factor_metrics)
                / len(per_factor_metrics)
            ) if per_factor_metrics else 0.0

            avg_density = (
                sum(m['density'] for m in per_factor_metrics)
                / len(per_factor_metrics)
            ) if per_factor_metrics else 0.0

            avg_distinctiveness = (
                sum(m['factor_distinctiveness'] for m in per_factor_metrics)
                / len(per_factor_metrics)
            ) if per_factor_metrics else 0.0

            global_keyword_coverage = (
                len(all_keywords_in_corpus) / len(all_keywords_total)
            ) if all_keywords_total else 0.0

            # Sort by coverage descending
            per_factor_metrics.sort(
                key=lambda x: x['coverage'], reverse=True
            )

            result = {
                'success': True,
                'total_documents': total_docs,
                'total_factors_evaluated': len(per_factor_metrics),
                'global_metrics': {
                    'avg_coverage': round(avg_coverage, 4),
                    'avg_density': round(avg_density, 4),
                    'avg_distinctiveness': round(avg_distinctiveness, 4),
                    'global_keyword_coverage': round(global_keyword_coverage, 4),
                    'total_keywords': len(all_keywords_total),
                    'keywords_found_in_corpus': len(all_keywords_in_corpus),
                },
                'per_factor': per_factor_metrics,
            }

            logger.info(
                f"Factor evaluation complete: {len(per_factor_metrics)} factors, "
                f"avg_coverage={avg_coverage:.4f}"
            )

            return result

        except Exception as e:
            logger.exception(f"Error evaluating factor detection: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _compute_keyword_precision(
        self,
        keywords: List[str],
        corpus_texts: List[tuple],
        mentions: List[dict],
    ) -> float:
        """
        Keyword precision proxy: ratio of documents with multiple
        unique keyword matches vs documents with any match.

        If a document matches 2+ distinct keywords of the same factor,
        the match is more likely to be genuinely relevant.

        Returns value between 0.0 and 1.0.
        """
        if not mentions or not keywords:
            return 0.0

        import re

        doc_id_set = {m['document_id'] for m in mentions}
        if not doc_id_set:
            return 0.0

        # Build individual keyword patterns
        kw_patterns = []
        for kw in keywords:
            escaped = re.escape(kw.lower())
            kw_patterns.append(re.compile(r'\b' + escaped + r'\b', re.IGNORECASE))

        multi_keyword_docs = 0

        for doc_id, text in corpus_texts:
            if doc_id not in doc_id_set:
                continue

            text_lower = text.lower()
            distinct_matches = sum(
                1 for p in kw_patterns if p.search(text_lower)
            )
            if distinct_matches >= 2:
                multi_keyword_docs += 1

        return multi_keyword_docs / len(doc_id_set) if doc_id_set else 0.0

    def _compute_factor_distinctiveness(
        self,
        factor_id: int,
        factor_doc_mentions: Dict[int, List[dict]],
        doc_factor_sets: Dict[int, set],
        docs_with_factor: int,
    ) -> float:
        """
        Factor distinctiveness: 1 - (avg overlap with other factors).

        A factor that always co-occurs with many others is less distinctive.
        Returns value between 0.0 and 1.0 (higher = more distinctive).
        """
        if docs_with_factor == 0:
            return 0.0

        doc_ids = {m['document_id'] for m in factor_doc_mentions.get(factor_id, [])}
        if not doc_ids:
            return 0.0

        # Count how many other factors co-occur on average
        total_other_factors = 0
        for doc_id in doc_ids:
            other_factors = doc_factor_sets.get(doc_id, set()) - {factor_id}
            total_other_factors += len(other_factors)

        # Get total number of possible factors (excluding self)
        total_factors = len(factor_doc_mentions)
        if total_factors <= 1:
            return 1.0

        avg_co_occurring = total_other_factors / len(doc_ids)
        # Normalize: max co-occurring would be total_factors - 1
        overlap_ratio = avg_co_occurring / (total_factors - 1)

        return 1.0 - overlap_ratio

    def _compute_keyword_coverage(
        self,
        keywords: List[str],
        corpus_texts: List[tuple],
    ) -> tuple:
        """
        Keyword coverage: fraction of keywords that appear at least once
        in the corpus.

        Returns:
            (coverage_ratio, set_of_found_keywords)
        """
        if not keywords:
            return 0.0, set()

        import re

        found = set()
        for kw in keywords:
            escaped = re.escape(kw.lower())
            pattern = re.compile(r'\b' + escaped + r'\b', re.IGNORECASE)
            for _, text in corpus_texts:
                if pattern.search(text):
                    found.add(kw)
                    break

        coverage = len(found) / len(keywords)
        return coverage, found
