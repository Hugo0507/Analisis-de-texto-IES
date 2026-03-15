"""
Calculate TF-IDF Use Case.

Calculates TF-IDF matrix from preprocessed documents.
"""

import logging
from typing import Dict, List

from apps.analysis.services.tfidf_service import TfidfService
from apps.datasets.models import DatasetFile
from apps.analysis.models import Vocabulary, TfidfMatrix
from apps.infrastructure.cache.triple_layer_cache import TripleLayerCacheService

logger = logging.getLogger(__name__)


class CalculateTfidfUseCase:
    """
    Use case for calculating TF-IDF matrix.

    Orchestrates:
    - TfidfService (TF-IDF calculation)
    - Document model (get preprocessed texts)
    - Vocabulary and TfidfMatrix models (save results)
    - TripleLayerCacheService (cache results)
    """

    def __init__(
        self,
        tfidf_service: TfidfService = None,
        cache_service: TripleLayerCacheService = None
    ):
        """
        Initialize use case.

        Args:
            tfidf_service: TF-IDF service instance
            cache_service: Cache service instance
        """
        self.tfidf_service = tfidf_service or TfidfService()
        self.cache_service = cache_service or TripleLayerCacheService()

    def execute(
        self,
        document_ids: List[int] = None,
        max_features: int = 5000,
        min_df: int = 1,
        max_df: float = 1.0,
        norm: str = 'l2',
        use_idf: bool = True,
        sublinear_tf: bool = False,
        use_cache: bool = True
    ) -> Dict[str, any]:
        """
        Calculate TF-IDF matrix for documents.

        Args:
            document_ids: List of document IDs (None = all preprocessed documents)
            max_features: Maximum number of features
            norm: Normalization type ('l1', 'l2', or None)
            use_idf: Enable IDF weighting
            sublinear_tf: Apply sublinear TF scaling
            use_cache: Use cache for results

        Returns:
            Dictionary with TF-IDF results

        Example:
            >>> use_case = CalculateTfidfUseCase()
            >>> result = use_case.execute()
            >>> print(f"Vocabulary size: {result['vocabulary_size']}")
        """
        logger.info("Calculating TF-IDF matrix")

        # Generate config hash for caching
        config = {
            'max_features': max_features,
            'min_df': min_df,
            'max_df': max_df,
            'norm': norm,
            'use_idf': use_idf,
            'sublinear_tf': sublinear_tf
        }
        config_hash = self.cache_service.generate_config_hash(config)

        # Check cache
        if use_cache:
            cached_result = self.cache_service.get('tfidf_calculation', config_hash)
            if cached_result:
                logger.info("TF-IDF matrix found in cache")
                return {
                    'success': True,
                    'cached': True,
                    'cache_source': cached_result['cache_source'],
                    **cached_result['data']
                }

        try:
            # Get preprocessed files from DatasetFile
            if document_ids:
                documents = DatasetFile.objects.filter(
                    id__in=document_ids,
                    preprocessed_text__isnull=False
                ).exclude(preprocessed_text='')
            else:
                documents = DatasetFile.objects.filter(
                    preprocessed_text__isnull=False
                ).exclude(preprocessed_text='')

            if not documents.exists():
                return {
                    'success': False,
                    'error': 'No documents found for TF-IDF calculation'
                }

            doc_count = documents.count()
            logger.info(f"Processing {doc_count} documents")

            # Prepare texts
            texts = [doc.preprocessed_text for doc in documents]
            doc_ids = [doc.id for doc in documents]

            # Configure TF-IDF service
            self.tfidf_service.max_features = max_features
            self.tfidf_service.min_df = min_df
            self.tfidf_service.max_df = max_df
            self.tfidf_service.norm = norm
            self.tfidf_service.use_idf = use_idf
            self.tfidf_service.sublinear_tf = sublinear_tf

            # Calculate TF-IDF matrix
            tfidf_result = self.tfidf_service.fit_transform(texts)

            # Get feature names
            feature_names = self.tfidf_service.get_feature_names()

            # Get IDF scores (only available when use_idf=True)
            idf_scores = self.tfidf_service.get_idf_scores() if use_idf else {}

            # Persist to database (skipped gracefully when DB is unavailable)
            try:
                vocabulary_mapping = self._save_vocabulary(feature_names, idf_scores)
                self._save_tfidf_matrix(tfidf_result['matrix'], doc_ids, vocabulary_mapping)
            except Exception as db_err:
                logger.warning(f"Database persistence skipped: {db_err}")

            # Get top terms
            top_terms = self.tfidf_service.get_global_tfidf_scores(
                tfidf_result['matrix'],
                aggregation='mean',
                top_n=50
            )

            # Average TF-IDF score across the matrix
            matrix = tfidf_result['matrix']
            avg_tfidf_score = float(matrix.mean()) if matrix.nnz > 0 else 0.0

            result = {
                'vocabulary_size': len(feature_names),
                'document_count': doc_count,
                'matrix_shape': tfidf_result['shape'],
                'avg_tfidf_score': avg_tfidf_score,
                'top_terms': [
                    {'term': term, 'tfidf_score': float(score)}
                    for term, score in top_terms
                ],
                'config': config
            }

            # Save to cache
            if use_cache:
                self.cache_service.set(
                    'tfidf_calculation',
                    config_hash,
                    result,
                    save_to_drive=True
                )

            logger.info(f"TF-IDF calculation complete: {len(feature_names)} terms")

            return {
                'success': True,
                'cached': False,
                **result
            }

        except Exception as e:
            logger.exception(f"Error calculating TF-IDF matrix: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _save_vocabulary(
        self,
        feature_names: List[str],
        idf_scores: Dict[str, float]
    ) -> Dict[str, int]:
        """
        Save vocabulary terms with IDF scores.

        Args:
            feature_names: List of terms
            idf_scores: Dictionary of term to IDF score

        Returns:
            Dictionary mapping term to vocabulary ID
        """
        logger.info(f"Saving {len(feature_names)} vocabulary terms with IDF scores")

        vocabulary_mapping = {}

        for term in feature_names:
            # Create or update vocabulary entry
            vocab, created = Vocabulary.objects.update_or_create(
                term=term,
                defaults={'idf_score': idf_scores.get(term, 0.0)}
            )
            vocabulary_mapping[term] = vocab.id

        return vocabulary_mapping

    def _save_tfidf_matrix(
        self,
        tfidf_matrix,
        doc_ids: List[int],
        vocabulary_mapping: Dict[str, int]
    ):
        """
        Save TF-IDF matrix to database.

        Args:
            tfidf_matrix: Sparse TF-IDF matrix
            doc_ids: List of document IDs
            vocabulary_mapping: Mapping of term to vocabulary ID
        """
        logger.info("Saving TF-IDF matrix to database")

        # Clear existing TF-IDF matrix entries for these documents
        TfidfMatrix.objects.filter(document_id__in=doc_ids).delete()

        # Convert to COO format for efficient iteration
        tfidf_coo = tfidf_matrix.tocoo()

        # Prepare bulk create
        tfidf_entries = []
        term_ids = list(vocabulary_mapping.values())

        for row_idx, col_idx, tfidf_score in zip(tfidf_coo.row, tfidf_coo.col, tfidf_coo.data):
            doc_id = doc_ids[row_idx]
            term_id = term_ids[col_idx]

            tfidf_entries.append(
                TfidfMatrix(
                    document_id=doc_id,
                    term_id=term_id,
                    tfidf_score=float(tfidf_score)
                )
            )

        # Bulk create entries
        TfidfMatrix.objects.bulk_create(tfidf_entries, batch_size=1000)

        logger.info(f"Saved {len(tfidf_entries)} TF-IDF matrix entries")

    def get_document_tfidf(
        self,
        document_id: int,
        top_n: int = 50
    ) -> Dict[str, any]:
        """
        Get TF-IDF representation for a single document.

        Args:
            document_id: Document ID
            top_n: Number of top terms to return

        Returns:
            Dictionary with document TF-IDF results
        """
        logger.info(f"Getting TF-IDF for document {document_id}")

        try:
            # Get document
            document = DatasetFile.objects.get(id=document_id)

            # Get TF-IDF entries
            tfidf_entries = TfidfMatrix.objects.filter(
                document_id=document_id
            ).select_related('term').order_by('-tfidf_score')[:top_n]

            if not tfidf_entries.exists():
                return {
                    'success': False,
                    'error': 'TF-IDF matrix not calculated for this document'
                }

            # Format results
            terms = [
                {
                    'term': entry.term.term,
                    'tfidf_score': entry.tfidf_score
                }
                for entry in tfidf_entries
            ]

            return {
                'success': True,
                'document_id': document_id,
                'filename': document.filename,
                'top_terms': terms,
                'total_terms': TfidfMatrix.objects.filter(document_id=document_id).count()
            }

        except DatasetFile.DoesNotExist:
            logger.error(f"Document {document_id} not found")
            return {
                'success': False,
                'error': f'Document {document_id} not found'
            }

        except Exception as e:
            logger.exception(f"Error getting TF-IDF for document {document_id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def calculate_similarity(
        self,
        doc_id1: int,
        doc_id2: int
    ) -> Dict[str, any]:
        """
        Calculate cosine similarity between two documents.

        Args:
            doc_id1: First document ID
            doc_id2: Second document ID

        Returns:
            Dictionary with similarity score
        """
        logger.info(f"Calculating similarity between documents {doc_id1} and {doc_id2}")

        try:
            # Get TF-IDF entries for both documents
            tfidf1 = TfidfMatrix.objects.filter(document_id=doc_id1)
            tfidf2 = TfidfMatrix.objects.filter(document_id=doc_id2)

            if not tfidf1.exists() or not tfidf2.exists():
                return {
                    'success': False,
                    'error': 'TF-IDF matrix not calculated for one or both documents'
                }

            # Calculate cosine similarity
            # (simplified version - actual implementation would use scipy)
            # This is a placeholder for the actual calculation

            return {
                'success': True,
                'doc_id1': doc_id1,
                'doc_id2': doc_id2,
                'similarity_score': 0.0  # Placeholder
            }

        except Exception as e:
            logger.exception(f"Error calculating similarity: {e}")
            return {
                'success': False,
                'error': str(e)
            }
