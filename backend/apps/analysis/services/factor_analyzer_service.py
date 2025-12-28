"""
Factor Analyzer Service.

Analyzes digital transformation factors in documents.
Uses 16 predefined factors across 8 categories with keyword matching.
"""

import logging
from typing import Dict, List, Tuple
import re
from collections import defaultdict, Counter
import numpy as np

logger = logging.getLogger(__name__)


class FactorAnalyzerService:
    """
    Service for analyzing digital transformation factors in documents.

    Analyzes 16 factors across 8 categories:
    - Tecnologico (2 factors)
    - Organizacional (2 factors)
    - Humano (2 factors)
    - Estrategico (2 factors)
    - Financiero (2 factors)
    - Pedagogico (2 factors)
    - Infraestructura (2 factors)
    - Seguridad (2 factors)
    """

    def __init__(self, factors: List[Dict] = None):
        """
        Initialize factor analyzer.

        Args:
            factors: List of factor dictionaries with 'name', 'category', 'keywords'
                     If None, factors must be loaded from database
        """
        self.factors = factors or []
        self.factor_patterns = {}
        self._compile_patterns()

    def load_factors(self, factors: List[Dict]):
        """
        Load factors from database.

        Args:
            factors: List of factor dictionaries

        Example:
            >>> analyzer = FactorAnalyzerService()
            >>> factors = Factor.objects.all().values('id', 'name', 'category', 'keywords')
            >>> analyzer.load_factors(list(factors))
        """
        self.factors = factors
        self._compile_patterns()
        logger.info(f"Loaded {len(self.factors)} factors")

    def _compile_patterns(self):
        """Compile regex patterns for each factor's keywords."""
        for factor in self.factors:
            factor_id = factor.get('id') or factor.get('name')
            keywords = factor.get('keywords', [])

            # Create regex pattern for all keywords (case insensitive)
            patterns = []
            for keyword in keywords:
                # Escape special regex characters
                escaped = re.escape(keyword.lower())
                # Add word boundaries
                pattern = r'\b' + escaped + r'\b'
                patterns.append(pattern)

            if patterns:
                # Combine all patterns with OR
                combined_pattern = '|'.join(patterns)
                self.factor_patterns[factor_id] = re.compile(
                    combined_pattern,
                    re.IGNORECASE
                )

        logger.info(f"Compiled patterns for {len(self.factor_patterns)} factors")

    def analyze_document(
        self,
        text: str,
        normalize_by_length: bool = True
    ) -> Dict[str, any]:
        """
        Analyze a single document for factors.

        Args:
            text: Preprocessed document text
            normalize_by_length: Normalize scores by document length

        Returns:
            Dictionary with factor mentions and relevance scores

        Example:
            >>> analyzer = FactorAnalyzerService(factors)
            >>> result = analyzer.analyze_document("inteligencia artificial machine learning")
            >>> print(result['factors'][0])
            {
                'factor_id': 1,
                'factor_name': 'Tecnologias Emergentes',
                'category': 'tecnologico',
                'mention_count': 2,
                'relevance_score': 0.0015,
                'matched_keywords': ['inteligencia artificial', 'machine learning']
            }
        """
        if not text:
            return {
                'factors': [],
                'total_mentions': 0,
                'document_length': 0
            }

        text_lower = text.lower()
        doc_length = len(text.split())

        factor_results = []

        for factor in self.factors:
            factor_id = factor.get('id') or factor.get('name')
            factor_name = factor['name']
            category = factor['category']

            if factor_id not in self.factor_patterns:
                continue

            pattern = self.factor_patterns[factor_id]

            # Find all matches
            matches = pattern.findall(text_lower)
            mention_count = len(matches)

            if mention_count > 0:
                # Calculate relevance score
                if normalize_by_length and doc_length > 0:
                    relevance_score = mention_count / doc_length
                else:
                    relevance_score = mention_count

                # Get unique matched keywords
                matched_keywords = list(set(matches))

                factor_results.append({
                    'factor_id': factor_id,
                    'factor_name': factor_name,
                    'category': category,
                    'mention_count': mention_count,
                    'relevance_score': round(relevance_score, 6),
                    'matched_keywords': matched_keywords[:10]  # Limit to top 10
                })

        # Sort by relevance score descending
        factor_results.sort(key=lambda x: x['relevance_score'], reverse=True)

        total_mentions = sum(f['mention_count'] for f in factor_results)

        return {
            'factors': factor_results,
            'total_mentions': total_mentions,
            'document_length': doc_length
        }

    def analyze_corpus(
        self,
        documents: List[Dict[str, str]],
        normalize_by_length: bool = True
    ) -> Dict[str, any]:
        """
        Analyze entire corpus for factors.

        Args:
            documents: List of dicts with 'id' and 'text' keys
            normalize_by_length: Normalize scores by document length

        Returns:
            Dictionary with corpus-level and document-level results

        Example:
            >>> analyzer = FactorAnalyzerService(factors)
            >>> docs = [
            ...     {'id': 1, 'text': 'text with AI'},
            ...     {'id': 2, 'text': 'text with cloud'}
            ... ]
            >>> result = analyzer.analyze_corpus(docs)
            >>> print(result['global_statistics'])
        """
        logger.info(f"Analyzing corpus of {len(documents)} documents")

        document_results = []
        global_factor_counts = Counter()
        factor_document_counts = Counter()

        for doc in documents:
            doc_id = doc['id']
            text = doc['text']

            # Analyze document
            doc_result = self.analyze_document(text, normalize_by_length)

            # Store document result
            document_results.append({
                'document_id': doc_id,
                'factors': doc_result['factors'],
                'total_mentions': doc_result['total_mentions']
            })

            # Update global counts
            for factor_result in doc_result['factors']:
                factor_id = factor_result['factor_id']
                mention_count = factor_result['mention_count']

                global_factor_counts[factor_id] += mention_count
                factor_document_counts[factor_id] += 1

        # Calculate global statistics
        global_statistics = self._calculate_global_statistics(
            global_factor_counts,
            factor_document_counts,
            len(documents)
        )

        logger.info(f"Corpus analysis complete. Found {len(global_statistics)} active factors")

        return {
            'document_results': document_results,
            'global_statistics': global_statistics,
            'n_documents': len(documents)
        }

    def _calculate_global_statistics(
        self,
        global_counts: Counter,
        doc_counts: Counter,
        n_documents: int
    ) -> List[Dict[str, any]]:
        """Calculate global factor statistics."""
        statistics = []

        for factor in self.factors:
            factor_id = factor.get('id') or factor.get('name')
            factor_name = factor['name']
            category = factor['category']

            global_frequency = global_counts.get(factor_id, 0)
            document_frequency = doc_counts.get(factor_id, 0)

            if global_frequency > 0:
                # Calculate relevance score
                # (global frequency * document coverage)
                doc_coverage = document_frequency / n_documents if n_documents > 0 else 0
                relevance_score = global_frequency * doc_coverage

                statistics.append({
                    'factor_id': factor_id,
                    'factor_name': factor_name,
                    'category': category,
                    'global_frequency': global_frequency,
                    'document_frequency': document_frequency,
                    'document_coverage': round(doc_coverage, 4),
                    'relevance_score': round(relevance_score, 4)
                })

        # Sort by relevance score descending
        statistics.sort(key=lambda x: x['relevance_score'], reverse=True)

        return statistics

    def get_factor_co_occurrence(
        self,
        document_results: List[Dict[str, any]],
        min_co_occurrence: int = 2
    ) -> List[Dict[str, any]]:
        """
        Calculate factor co-occurrence matrix.

        Args:
            document_results: Results from analyze_corpus
            min_co_occurrence: Minimum co-occurrence count to include

        Returns:
            List of factor pairs with co-occurrence counts

        Example:
            >>> analyzer = FactorAnalyzerService(factors)
            >>> corpus_result = analyzer.analyze_corpus(documents)
            >>> co_occur = analyzer.get_factor_co_occurrence(corpus_result['document_results'])
            >>> print(co_occur[0])
            {
                'factor1_id': 1,
                'factor1_name': 'Tecnologias Emergentes',
                'factor2_id': 3,
                'factor2_name': 'Cultura Organizacional',
                'co_occurrence_count': 5
            }
        """
        logger.info("Calculating factor co-occurrence")

        # Build co-occurrence matrix
        co_occur_counts = defaultdict(int)

        for doc_result in document_results:
            factor_ids = [f['factor_id'] for f in doc_result['factors']]

            # Count pairs
            for i, factor1_id in enumerate(factor_ids):
                for factor2_id in factor_ids[i+1:]:
                    # Create sorted tuple to avoid duplicates (A,B) vs (B,A)
                    pair = tuple(sorted([factor1_id, factor2_id]))
                    co_occur_counts[pair] += 1

        # Create result list
        results = []
        factor_lookup = {
            (f.get('id') or f.get('name')): f
            for f in self.factors
        }

        for (factor1_id, factor2_id), count in co_occur_counts.items():
            if count >= min_co_occurrence:
                factor1 = factor_lookup.get(factor1_id, {})
                factor2 = factor_lookup.get(factor2_id, {})

                results.append({
                    'factor1_id': factor1_id,
                    'factor1_name': factor1.get('name', 'Unknown'),
                    'factor1_category': factor1.get('category', ''),
                    'factor2_id': factor2_id,
                    'factor2_name': factor2.get('name', 'Unknown'),
                    'factor2_category': factor2.get('category', ''),
                    'co_occurrence_count': count
                })

        # Sort by co-occurrence count descending
        results.sort(key=lambda x: x['co_occurrence_count'], reverse=True)

        logger.info(f"Found {len(results)} factor co-occurrences")

        return results

    def get_category_statistics(
        self,
        global_statistics: List[Dict[str, any]]
    ) -> Dict[str, Dict[str, any]]:
        """
        Calculate statistics by category.

        Args:
            global_statistics: Global statistics from analyze_corpus

        Returns:
            Dictionary with statistics per category

        Example:
            >>> analyzer = FactorAnalyzerService(factors)
            >>> corpus_result = analyzer.analyze_corpus(documents)
            >>> cat_stats = analyzer.get_category_statistics(corpus_result['global_statistics'])
            >>> print(cat_stats['tecnologico'])
            {
                'total_frequency': 150,
                'avg_relevance': 12.5,
                'n_factors': 2
            }
        """
        category_stats = defaultdict(lambda: {
            'total_frequency': 0,
            'total_relevance': 0,
            'factors': []
        })

        for stat in global_statistics:
            category = stat['category']

            category_stats[category]['total_frequency'] += stat['global_frequency']
            category_stats[category]['total_relevance'] += stat['relevance_score']
            category_stats[category]['factors'].append(stat['factor_name'])

        # Calculate averages
        result = {}
        for category, stats in category_stats.items():
            n_factors = len(stats['factors'])
            result[category] = {
                'total_frequency': stats['total_frequency'],
                'avg_relevance': round(stats['total_relevance'] / n_factors, 4) if n_factors > 0 else 0,
                'n_factors': n_factors,
                'factors': stats['factors']
            }

        return result

    def get_top_documents_by_factor(
        self,
        document_results: List[Dict[str, any]],
        factor_id: any,
        top_n: int = 10
    ) -> List[Dict[str, any]]:
        """
        Get top N documents for a specific factor.

        Args:
            document_results: Results from analyze_corpus
            factor_id: Factor ID to filter by
            top_n: Number of top documents to return

        Returns:
            List of top documents sorted by relevance score
        """
        # Extract documents with this factor
        docs_with_factor = []

        for doc_result in document_results:
            for factor_result in doc_result['factors']:
                if factor_result['factor_id'] == factor_id:
                    docs_with_factor.append({
                        'document_id': doc_result['document_id'],
                        'mention_count': factor_result['mention_count'],
                        'relevance_score': factor_result['relevance_score'],
                        'matched_keywords': factor_result['matched_keywords']
                    })
                    break

        # Sort by relevance score descending
        docs_with_factor.sort(key=lambda x: x['relevance_score'], reverse=True)

        return docs_with_factor[:top_n]

    def consolidate_results(
        self,
        corpus_result: Dict[str, any],
        weight_global: float = 0.5,
        weight_coverage: float = 0.3,
        weight_relevance: float = 0.2
    ) -> List[Dict[str, any]]:
        """
        Consolidate and rank factors with weighted scoring.

        Args:
            corpus_result: Result from analyze_corpus
            weight_global: Weight for global frequency
            weight_coverage: Weight for document coverage
            weight_relevance: Weight for relevance score

        Returns:
            Consolidated factor ranking

        Example:
            >>> analyzer = FactorAnalyzerService(factors)
            >>> corpus_result = analyzer.analyze_corpus(documents)
            >>> consolidated = analyzer.consolidate_results(corpus_result)
            >>> print(consolidated[0])
            {
                'rank': 1,
                'factor_name': 'Tecnologias Emergentes',
                'category': 'tecnologico',
                'consolidated_score': 0.85,
                'global_frequency': 150,
                'document_coverage': 0.75
            }
        """
        statistics = corpus_result['global_statistics']

        if not statistics:
            return []

        # Normalize scores
        max_freq = max(s['global_frequency'] for s in statistics)
        max_cov = max(s['document_coverage'] for s in statistics)
        max_rel = max(s['relevance_score'] for s in statistics)

        consolidated = []

        for stat in statistics:
            # Normalize each component
            norm_freq = stat['global_frequency'] / max_freq if max_freq > 0 else 0
            norm_cov = stat['document_coverage'] / max_cov if max_cov > 0 else 0
            norm_rel = stat['relevance_score'] / max_rel if max_rel > 0 else 0

            # Calculate weighted score
            consolidated_score = (
                weight_global * norm_freq +
                weight_coverage * norm_cov +
                weight_relevance * norm_rel
            )

            consolidated.append({
                'factor_id': stat['factor_id'],
                'factor_name': stat['factor_name'],
                'category': stat['category'],
                'consolidated_score': round(consolidated_score, 4),
                'global_frequency': stat['global_frequency'],
                'document_frequency': stat['document_frequency'],
                'document_coverage': stat['document_coverage'],
                'relevance_score': stat['relevance_score']
            })

        # Sort by consolidated score descending
        consolidated.sort(key=lambda x: x['consolidated_score'], reverse=True)

        # Add rank
        for idx, item in enumerate(consolidated, 1):
            item['rank'] = idx

        logger.info(f"Consolidated {len(consolidated)} factors")

        return consolidated
