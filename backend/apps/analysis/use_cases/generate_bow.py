"""
Generate Bag of Words Use Case.

Generates BoW matrix from preprocessed documents.
"""

import logging
from typing import Dict, List, Optional
import json

from apps.analysis.services.bow_service import BowService
from apps.documents.models import Document
from apps.analysis.models import Vocabulary, BowMatrix
from apps.infrastructure.cache.triple_layer_cache import TripleLayerCacheService

logger = logging.getLogger(__name__)


class GenerateBowUseCase:
    """
    Use case for generating Bag of Words matrix.

    Orchestrates:
    - BowService (BoW generation)
    - Document model (get preprocessed texts)
    - Vocabulary and BowMatrix models (save results)
    - TripleLayerCacheService (cache results)
    """

    def __init__(
        self,
        bow_service: BowService = None,
        cache_service: TripleLayerCacheService = None
    ):
        """
        Initialize use case.

        Args:
            bow_service: BoW service instance
            cache_service: Cache service instance
        """
        self.bow_service = bow_service or BowService()
        self.cache_service = cache_service or TripleLayerCacheService()

    def execute(
        self,
        document_ids: List[int] = None,
        max_features: int = 5000,
        min_df: int = 1,
        max_df: float = 1.0,
        ngram_range: tuple = (1, 1),
        use_cache: bool = True
    ) -> Dict[str, any]:
        """
        Generate BoW matrix for documents.

        Args:
            document_ids: List of document IDs (None = all preprocessed documents)
            max_features: Maximum number of features
            min_df: Minimum document frequency
            max_df: Maximum document frequency
            ngram_range: N-gram range (e.g., (1,1) for unigrams)
            use_cache: Use cache for results

        Returns:
            Dictionary with BoW results

        Example:
            >>> use_case = GenerateBowUseCase()
            >>> result = use_case.execute()
            >>> print(f"Vocabulary size: {result['vocabulary_size']}")
        """
        logger.info("Generating BoW matrix")

        # Generate config hash for caching
        config = {
            'max_features': max_features,
            'min_df': min_df,
            'max_df': max_df,
            'ngram_range': ngram_range
        }
        config_hash = self.cache_service.generate_config_hash(config)

        # Check cache
        if use_cache:
            cached_result = self.cache_service.get('bow_generation', config_hash)
            if cached_result:
                logger.info("BoW matrix found in cache")
                return {
                    'success': True,
                    'cached': True,
                    'cache_source': cached_result['cache_source'],
                    **cached_result['data']
                }

        try:
            # Get documents
            if document_ids:
                documents = Document.objects.filter(id__in=document_ids)
            else:
                documents = Document.objects.filter(
                    preprocessed_text__isnull=False
                ).exclude(preprocessed_text='')

            if not documents:
                return {
                    'success': False,
                    'error': 'No documents found for preprocessing'
                }

            doc_count = len(documents)
            logger.info(f"Processing {doc_count} documents")

            # Prepare texts
            texts = [doc.preprocessed_text for doc in documents]
            doc_ids = [doc.id for doc in documents]

            # Configure BoW service
            self.bow_service.max_features = max_features
            self.bow_service.min_df = min_df
            self.bow_service.max_df = max_df
            self.bow_service.ngram_range = ngram_range

            # Generate BoW matrix
            bow_result = self.bow_service.fit_transform(texts)

            # Get feature names (vocabulary)
            feature_names = self.bow_service.get_feature_names()

            # Persist to database (skipped gracefully when DB is unavailable)
            try:
                vocabulary_mapping = self._save_vocabulary(feature_names)
                self._save_bow_matrix(bow_result['matrix'], doc_ids, vocabulary_mapping)
            except Exception as db_err:
                logger.warning(f"Database persistence skipped: {db_err}")

            # Get top terms
            top_terms = self.bow_service.get_global_term_frequency(
                bow_result['matrix'],
                top_n=50
            )

            result = {
                'vocabulary_size': len(feature_names),
                'document_count': doc_count,
                'matrix_shape': bow_result['shape'],
                'sparsity': bow_result['sparsity'],
                'top_terms': [
                    {'term': term, 'frequency': int(freq)}
                    for term, freq in top_terms
                ],
                'config': config
            }

            # Save to cache
            if use_cache:
                self.cache_service.set(
                    'bow_generation',
                    config_hash,
                    result,
                    save_to_drive=True
                )

            logger.info(f"BoW generation complete: {len(feature_names)} terms")

            return {
                'success': True,
                'cached': False,
                **result
            }

        except Exception as e:
            logger.exception(f"Error generating BoW matrix: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _save_vocabulary(
        self,
        feature_names: List[str]
    ) -> Dict[str, int]:
        """
        Save vocabulary terms to database.

        Args:
            feature_names: List of terms

        Returns:
            Dictionary mapping term to vocabulary ID
        """
        logger.info(f"Saving {len(feature_names)} vocabulary terms")

        vocabulary_mapping = {}

        for term in feature_names:
            # Create or get vocabulary entry
            vocab, created = Vocabulary.objects.get_or_create(
                term=term,
                defaults={'global_frequency': 0}
            )
            vocabulary_mapping[term] = vocab.id

        return vocabulary_mapping

    def _save_bow_matrix(
        self,
        bow_matrix,
        doc_ids: List[int],
        vocabulary_mapping: Dict[str, int]
    ):
        """
        Save BoW matrix to database.

        Args:
            bow_matrix: Sparse BoW matrix
            doc_ids: List of document IDs
            vocabulary_mapping: Mapping of term to vocabulary ID
        """
        logger.info("Saving BoW matrix to database")

        # Clear existing BoW matrix entries for these documents
        BowMatrix.objects.filter(document_id__in=doc_ids).delete()

        # Convert to COO format for efficient iteration
        bow_coo = bow_matrix.tocoo()

        # Prepare bulk create
        bow_entries = []
        term_ids = list(vocabulary_mapping.values())

        for row_idx, col_idx, frequency in zip(bow_coo.row, bow_coo.col, bow_coo.data):
            doc_id = doc_ids[row_idx]
            term_id = term_ids[col_idx]

            bow_entries.append(
                BowMatrix(
                    document_id=doc_id,
                    term_id=term_id,
                    frequency=int(frequency)
                )
            )

        # Bulk create entries
        BowMatrix.objects.bulk_create(bow_entries, batch_size=1000)

        logger.info(f"Saved {len(bow_entries)} BoW matrix entries")

    def get_document_bow(
        self,
        document_id: int,
        top_n: int = 50
    ) -> Dict[str, any]:
        """
        Get BoW representation for a single document.

        Args:
            document_id: Document ID
            top_n: Number of top terms to return

        Returns:
            Dictionary with document BoW results
        """
        logger.info(f"Getting BoW for document {document_id}")

        try:
            # Get document
            document = Document.objects.get(id=document_id)

            # Get BoW entries
            bow_entries = BowMatrix.objects.filter(
                document_id=document_id
            ).select_related('term').order_by('-frequency')[:top_n]

            if not bow_entries.exists():
                return {
                    'success': False,
                    'error': 'BoW matrix not generated for this document'
                }

            # Format results
            terms = [
                {
                    'term': entry.term.term,
                    'frequency': entry.frequency
                }
                for entry in bow_entries
            ]

            return {
                'success': True,
                'document_id': document_id,
                'filename': document.filename,
                'top_terms': terms,
                'total_terms': BowMatrix.objects.filter(document_id=document_id).count()
            }

        except Document.DoesNotExist:
            logger.error(f"Document {document_id} not found")
            return {
                'success': False,
                'error': f'Document {document_id} not found'
            }

        except Exception as e:
            logger.exception(f"Error getting BoW for document {document_id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_vocabulary_stats(self) -> Dict[str, any]:
        """
        Get vocabulary statistics.

        Returns:
            Dictionary with vocabulary stats
        """
        logger.info("Getting vocabulary statistics")

        try:
            vocabulary = Vocabulary.objects.all()

            if not vocabulary.exists():
                return {
                    'success': False,
                    'error': 'Vocabulary not generated yet'
                }

            # Get top terms by frequency
            top_terms = vocabulary.order_by('-global_frequency')[:50]

            return {
                'success': True,
                'vocabulary_size': vocabulary.count(),
                'top_terms': [
                    {
                        'term': v.term,
                        'global_frequency': v.global_frequency,
                        'document_frequency': v.document_frequency
                    }
                    for v in top_terms
                ]
            }

        except Exception as e:
            logger.exception(f"Error getting vocabulary stats: {e}")
            return {
                'success': False,
                'error': str(e)
            }
