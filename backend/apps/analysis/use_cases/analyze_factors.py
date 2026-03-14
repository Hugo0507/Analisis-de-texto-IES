"""
Analyze Factors Use Case.

Analyzes digital transformation factors in documents.
"""

import logging
from typing import Dict, List

from apps.analysis.services.factor_analyzer_service import FactorAnalyzerService
from apps.datasets.models import DatasetFile
from apps.analysis.models import Factor, DocumentFactor
from apps.infrastructure.cache.triple_layer_cache import TripleLayerCacheService

logger = logging.getLogger(__name__)


class AnalyzeFactorsUseCase:
    """
    Use case for analyzing digital transformation factors.

    Orchestrates:
    - FactorAnalyzerService (factor analysis)
    - Document model (get preprocessed texts)
    - Factor and DocumentFactor models (save results)
    - TripleLayerCacheService (cache results)
    """

    def __init__(
        self,
        analyzer_service: FactorAnalyzerService = None,
        cache_service: TripleLayerCacheService = None
    ):
        """
        Initialize use case.

        Args:
            analyzer_service: Factor analyzer service instance
            cache_service: Cache service instance
        """
        self.analyzer_service = analyzer_service or FactorAnalyzerService()
        self.cache_service = cache_service or TripleLayerCacheService()

    def execute(
        self,
        document_ids: List[int] = None,
        normalize_by_length: bool = True,
        use_cache: bool = True
    ) -> Dict[str, any]:
        """
        Analyze factors for documents.

        Args:
            document_ids: List of document IDs (None = all preprocessed documents)
            normalize_by_length: Normalize scores by document length
            use_cache: Use cache for results

        Returns:
            Dictionary with factor analysis results

        Example:
            >>> use_case = AnalyzeFactorsUseCase()
            >>> result = use_case.execute()
            >>> print(f"Factors found: {len(result['global_statistics'])}")
        """
        logger.info("Analyzing digital transformation factors")

        # Generate config hash for caching
        config = {
            'normalize_by_length': normalize_by_length
        }
        config_hash = self.cache_service.generate_config_hash(config)

        # Check cache
        if use_cache:
            cached_result = self.cache_service.get('factor_analysis', config_hash)
            if cached_result:
                logger.info("Factor analysis found in cache")
                return {
                    'success': True,
                    'cached': True,
                    'cache_source': cached_result['cache_source'],
                    **cached_result['data']
                }

        try:
            # Load factors from database
            factors = list(Factor.objects.all().values('id', 'name', 'category', 'keywords'))

            if not factors:
                return {
                    'success': False,
                    'error': 'No factors found in database. Please seed factors first.'
                }

            # Load factors into analyzer
            self.analyzer_service.load_factors(factors)

            # Get preprocessed files from DatasetFile
            if document_ids:
                files = DatasetFile.objects.filter(
                    id__in=document_ids,
                    preprocessed_text__isnull=False
                ).exclude(preprocessed_text='')
            else:
                files = DatasetFile.objects.filter(
                    preprocessed_text__isnull=False
                ).exclude(preprocessed_text='')

            if not files.exists():
                return {
                    'success': False,
                    'error': 'No preprocessed documents found. Please run Data Preparation first.'
                }

            logger.info(f"Processing {files.count()} preprocessed files")

            # Prepare documents for analysis
            corpus_docs = [
                {
                    'id': f.id,
                    'text': f.preprocessed_text
                }
                for f in files
            ]

            # Analyze corpus
            corpus_result = self.analyzer_service.analyze_corpus(
                corpus_docs,
                normalize_by_length=normalize_by_length
            )

            # Update global factor statistics
            self._update_factor_statistics(corpus_result['global_statistics'])

            # Get category statistics
            category_stats = self.analyzer_service.get_category_statistics(
                corpus_result['global_statistics']
            )

            # Get factor co-occurrence
            co_occurrence = self.analyzer_service.get_factor_co_occurrence(
                corpus_result['document_results'],
                min_co_occurrence=2
            )

            # Get consolidated results
            consolidated = self.analyzer_service.consolidate_results(
                corpus_result,
                weight_global=0.5,
                weight_coverage=0.3,
                weight_relevance=0.2
            )

            result = {
                'document_count': files.count(),
                'factor_count': len(factors),
                'global_statistics': corpus_result['global_statistics'],
                'category_statistics': category_stats,
                'co_occurrence': co_occurrence[:20],  # Top 20
                'consolidated_ranking': consolidated[:16],  # All 16 factors
                'config': config
            }

            # Save to cache
            if use_cache:
                self.cache_service.set(
                    'factor_analysis',
                    config_hash,
                    result,
                    save_to_drive=True
                )

            logger.info("Factor analysis complete")

            return {
                'success': True,
                'cached': False,
                **result
            }

        except Exception as e:
            logger.exception(f"Error analyzing factors: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _save_document_factors(
        self,
        document_results: List[Dict]
    ) -> None:
        """Save document-factor relationships to database."""
        logger.info("Saving document-factor relationships")

        # Clear existing entries
        doc_ids = [dr['document_id'] for dr in document_results]
        DocumentFactor.objects.filter(document_id__in=doc_ids).delete()

        # Prepare bulk create
        entries = []

        for doc_result in document_results:
            doc_id = doc_result['document_id']

            for factor_result in doc_result['factors']:
                entries.append(
                    DocumentFactor(
                        document_id=doc_id,
                        factor_id=factor_result['factor_id'],
                        mention_count=factor_result['mention_count'],
                        relevance_score=factor_result['relevance_score']
                    )
                )

        # Bulk create
        DocumentFactor.objects.bulk_create(entries, batch_size=1000)

        logger.info(f"Saved {len(entries)} document-factor relationships")

    def _update_factor_statistics(
        self,
        global_statistics: List[Dict]
    ) -> None:
        """Update global factor statistics in database."""
        logger.info("Updating factor statistics")

        for stat in global_statistics:
            Factor.objects.filter(
                id=stat['factor_id']
            ).update(
                global_frequency=stat['global_frequency'],
                relevance_score=stat['relevance_score']
            )

    def get_document_factors(
        self,
        document_id: int,
        top_n: int = 16
    ) -> Dict[str, any]:
        """
        Get factor analysis for a single document.

        Args:
            document_id: Document ID
            top_n: Number of top factors to return

        Returns:
            Dictionary with document factor results
        """
        logger.info(f"Getting factors for document {document_id}")

        try:
            # Get document
            document = Document.objects.get(id=document_id)

            # Get document factors
            doc_factors = DocumentFactor.objects.filter(
                document_id=document_id
            ).select_related('factor').order_by('-relevance_score')[:top_n]

            if not doc_factors.exists():
                return {
                    'success': False,
                    'error': 'Factor analysis not performed for this document'
                }

            # Format results
            factors = [
                {
                    'factor_id': df.factor.id,
                    'factor_name': df.factor.name,
                    'category': df.factor.category,
                    'mention_count': df.mention_count,
                    'relevance_score': df.relevance_score
                }
                for df in doc_factors
            ]

            return {
                'success': True,
                'document_id': document_id,
                'filename': document.filename,
                'factors': factors,
                'total_factors': DocumentFactor.objects.filter(document_id=document_id).count()
            }

        except Document.DoesNotExist:
            logger.error(f"Document {document_id} not found")
            return {
                'success': False,
                'error': f'Document {document_id} not found'
            }

        except Exception as e:
            logger.exception(f"Error getting factors for document {document_id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_factor_statistics(self) -> Dict[str, any]:
        """
        Get global factor statistics.

        Returns:
            Dictionary with factor stats
        """
        logger.info("Getting factor statistics")

        try:
            factors = Factor.objects.all().order_by('-relevance_score')

            if not factors.exists():
                return {
                    'success': False,
                    'error': 'No factors found in database'
                }

            # Format results
            factor_stats = [
                {
                    'factor_id': f.id,
                    'factor_name': f.name,
                    'category': f.category,
                    'global_frequency': f.global_frequency,
                    'relevance_score': f.relevance_score,
                    'keyword_count': len(f.keywords) if f.keywords else 0
                }
                for f in factors
            ]

            # Group by category
            category_groups = {}
            for stat in factor_stats:
                category = stat['category']
                if category not in category_groups:
                    category_groups[category] = []
                category_groups[category].append(stat)

            return {
                'success': True,
                'total_factors': factors.count(),
                'factors': factor_stats,
                'by_category': category_groups
            }

        except Exception as e:
            logger.exception(f"Error getting factor statistics: {e}")
            return {
                'success': False,
                'error': str(e)
            }
