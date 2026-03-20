"""
Train Topic Models Use Case.

Trains topic modeling algorithms (LDA, NMF, LSA, pLSA) on documents.
"""

import logging
from typing import Any, Dict, List

from apps.analysis.services.topic_modeling_service import TopicModelingService
from apps.datasets.models import DatasetFile
from apps.analysis.models import Topic, DocumentTopic
from apps.infrastructure.cache.triple_layer_cache import TripleLayerCacheService

logger = logging.getLogger(__name__)


class TrainTopicModelsUseCase:
    """
    Use case for training topic models.

    Orchestrates:
    - TopicModelingService (train LDA, NMF, LSA, pLSA)
    - Document model (get preprocessed texts)
    - Topic and DocumentTopic models (save results)
    - TripleLayerCacheService (cache results)
    """

    def __init__(
        self,
        topic_service: TopicModelingService = None,
        cache_service: TripleLayerCacheService = None
    ):
        """
        Initialize use case.

        Args:
            topic_service: Topic modeling service instance
            cache_service: Cache service instance
        """
        self.topic_service = topic_service or TopicModelingService()
        self.cache_service = cache_service or TripleLayerCacheService()

    def execute(
        self,
        model_type: str = 'lda',
        n_topics: int = 10,
        document_ids: List[int] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Train topic model.

        Args:
            model_type: Model type ('lda', 'nmf', 'lsa', 'plsa')
            n_topics: Number of topics
            document_ids: List of document IDs (None = all preprocessed documents)
            use_cache: Use cache for results

        Returns:
            Dictionary with topic modeling results

        Example:
            >>> use_case = TrainTopicModelsUseCase()
            >>> result = use_case.execute(model_type='lda', n_topics=10)
            >>> print(f"Topics: {len(result['topics'])}")
        """
        logger.info(f"Training {model_type.upper()} topic model with {n_topics} topics")

        # Generate config hash for caching
        config = {
            'model_type': model_type,
            'n_topics': n_topics
        }
        config_hash = self.cache_service.generate_config_hash(config)

        # Check cache
        if use_cache:
            cached_result = self.cache_service.get('topic_modeling', config_hash)
            if cached_result:
                logger.info(f"{model_type.upper()} model found in cache")
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
                    'error': 'No preprocessed documents found'
                }

            logger.info(f"Processing {documents.count()} documents")

            # Prepare texts
            texts = [doc.preprocessed_text for doc in documents]
            doc_ids = [doc.id for doc in documents]

            # Configure service
            self.topic_service.n_topics = n_topics

            # Train model based on type
            if model_type == 'lda':
                result = self._train_lda(texts, doc_ids)
            elif model_type == 'nmf':
                result = self._train_nmf(texts, doc_ids)
            elif model_type == 'lsa':
                result = self._train_lsa(texts, doc_ids)
            elif model_type == 'plsa':
                result = self._train_plsa(texts, doc_ids)
            else:
                return {
                    'success': False,
                    'error': f'Unknown model type: {model_type}'
                }

            # Add config
            result['config'] = config

            # Save to cache
            if use_cache:
                self.cache_service.set(
                    'topic_modeling',
                    config_hash,
                    result,
                    save_to_drive=True
                )

            logger.info(f"{model_type.upper()} training complete")

            return {
                'success': True,
                'cached': False,
                **result
            }

        except Exception as e:
            logger.exception(f"Error training {model_type} model: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _train_lda(self, texts: List[str], doc_ids: List[int]) -> Dict[str, Any]:
        """Train LDA model."""
        # Create TF-IDF matrix first
        from apps.analysis.services.tfidf_service import TfidfService
        tfidf_service = TfidfService()
        tfidf_result = tfidf_service.fit_transform(texts)

        # Train LDA
        lda_result = self.topic_service.train_lda(
            tfidf_result['matrix'],
            tfidf_service.get_feature_names()
        )

        # Save topics to database
        self._save_topics('lda', lda_result['topics'])

        return {
            'model_type': 'lda',
            'n_topics': self.topic_service.n_topics,
            'topics': lda_result['topics'],
            'perplexity': lda_result.get('perplexity'),
            'coherence': lda_result.get('coherence')
        }

    def _train_nmf(self, texts: List[str], doc_ids: List[int]) -> Dict[str, Any]:
        """Train NMF model."""
        from apps.analysis.services.tfidf_service import TfidfService
        tfidf_service = TfidfService()
        tfidf_result = tfidf_service.fit_transform(texts)

        nmf_result = self.topic_service.train_nmf(
            tfidf_result['matrix'],
            tfidf_service.get_feature_names()
        )

        self._save_topics('nmf', nmf_result['topics'])

        return {
            'model_type': 'nmf',
            'n_topics': self.topic_service.n_topics,
            'topics': nmf_result['topics'],
            'reconstruction_error': nmf_result.get('reconstruction_error'),
            'coherence': nmf_result.get('coherence')
        }

    def _train_lsa(self, texts: List[str], doc_ids: List[int]) -> Dict[str, Any]:
        """Train LSA model."""
        from apps.analysis.services.tfidf_service import TfidfService
        tfidf_service = TfidfService()
        tfidf_result = tfidf_service.fit_transform(texts)

        lsa_result = self.topic_service.train_lsa(
            tfidf_result['matrix'],
            tfidf_service.get_feature_names()
        )

        self._save_topics('lsa', lsa_result['topics'])

        return {
            'model_type': 'lsa',
            'n_topics': self.topic_service.n_topics,
            'topics': lsa_result['topics'],
            'explained_variance': lsa_result.get('explained_variance'),
            'coherence': lsa_result.get('coherence')
        }

    def _train_plsa(self, texts: List[str], doc_ids: List[int]) -> Dict[str, Any]:
        """Train pLSA model."""
        # Tokenize texts
        tokenized_texts = [text.split() for text in texts]

        plsa_result = self.topic_service.train_plsa(tokenized_texts)

        self._save_topics('plsa', plsa_result['topics'])

        return {
            'model_type': 'plsa',
            'n_topics': self.topic_service.n_topics,
            'topics': plsa_result['topics'],
            'coherence': plsa_result.get('coherence')
        }

    def _save_topics(self, model_type: str, topics: List[Dict]) -> None:
        """Save topics to database."""
        logger.info(f"Saving {len(topics)} topics for {model_type}")

        # Clear existing topics for this model
        Topic.objects.filter(model_type=model_type).delete()

        # Create topic entries
        for topic_data in topics:
            words = topic_data.get('words') or topic_data.get('top_words', [])
            # words can be list of strings or list of (word, score) tuples
            if words and isinstance(words[0], (list, tuple)):
                words = [w for w, _ in words]
            Topic.objects.create(
                model_type=model_type,
                topic_number=topic_data.get('topic_number', topic_data.get('topic_id', 0)),
                top_words=words,
                coherence_score=topic_data.get('coherence_score', 0.0)
            )

    def compare_models(
        self,
        document_ids: List[int] = None,
        n_topics: int = 10
    ) -> Dict[str, Any]:
        """
        Compare all topic models, including BERTopic if available.

        Args:
            document_ids: List of document IDs
            n_topics: Number of topics

        Returns:
            Dictionary with comparison results
        """
        logger.info("Comparing all topic models")

        results = {}

        for model_type in ['lda', 'nmf', 'lsa', 'plsa']:
            result = self.execute(
                model_type=model_type,
                n_topics=n_topics,
                document_ids=document_ids,
                use_cache=True
            )

            if result['success']:
                results[model_type] = {
                    'n_topics': result.get('n_topics'),
                    'coherence': result.get('coherence', 0.0),
                    'perplexity': result.get('perplexity'),
                    'reconstruction_error': result.get('reconstruction_error'),
                    'explained_variance': result.get('explained_variance')
                }

        # Include BERTopic if completed analysis exists
        bertopic_result = self._get_bertopic_metrics()
        if bertopic_result:
            results['bertopic'] = bertopic_result

        return {
            'success': True,
            'models': results,
            'best_model': max(
                results.items(),
                key=lambda x: x[1].get('coherence') or 0.0
            )[0] if results else None
        }

    def _get_bertopic_metrics(self) -> Dict[str, Any]:
        """
        Get BERTopic metrics from the most recent completed analysis.

        Returns:
            Dictionary with BERTopic metrics, or None if not available.
        """
        try:
            from apps.bertopic.models import BERTopicAnalysis

            analysis = (
                BERTopicAnalysis.objects
                .filter(status=BERTopicAnalysis.STATUS_COMPLETED)
                .order_by('-processing_completed_at')
                .first()
            )

            if not analysis:
                logger.info("No completed BERTopic analysis found for comparison")
                return None

            # Calculate outlier ratio
            docs_processed = analysis.documents_processed or 0
            num_outliers = analysis.num_outliers or 0
            outlier_ratio = (
                num_outliers / docs_processed
                if docs_processed > 0
                else 0.0
            )

            return {
                'n_topics': analysis.num_topics_found,
                'coherence': analysis.coherence_score,
                'outlier_ratio': round(outlier_ratio, 4),
                'num_outliers': num_outliers,
                'documents_processed': docs_processed,
                'embedding_model': analysis.embedding_model,
                'analysis_name': analysis.name,
            }

        except ImportError:
            logger.warning("BERTopic app not available")
            return None
        except Exception as e:
            logger.warning(f"Error fetching BERTopic metrics: {e}")
            return None
