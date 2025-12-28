"""
Topic Modeling Service.

Supports multiple topic modeling algorithms:
- LDA (Latent Dirichlet Allocation)
- NMF (Non-negative Matrix Factorization)
- LSA (Latent Semantic Analysis)
- pLSA (Probabilistic LSA)
"""

import logging
from typing import Dict, List, Tuple
import numpy as np
from sklearn.decomposition import LatentDirichletAllocation, NMF, TruncatedSVD
from gensim import corpora, models
from gensim.models import CoherenceModel

logger = logging.getLogger(__name__)


class TopicModelingService:
    """
    Service for topic modeling with multiple algorithms.

    Supports LDA, NMF, LSA, and pLSA.
    """

    def __init__(
        self,
        n_topics: int = 10,
        random_state: int = 42
    ):
        """
        Initialize topic modeling service.

        Args:
            n_topics: Number of topics to extract
            random_state: Random seed for reproducibility
        """
        self.n_topics = n_topics
        self.random_state = random_state
        self.models = {}
        self.feature_names = None

    def train_lda(
        self,
        tfidf_matrix,
        feature_names: List[str],
        max_iter: int = 20,
        learning_method: str = 'batch'
    ) -> Dict[str, any]:
        """
        Train LDA (Latent Dirichlet Allocation) model.

        Args:
            tfidf_matrix: TF-IDF matrix (sparse)
            feature_names: List of feature names (vocabulary)
            max_iter: Maximum iterations
            learning_method: 'batch' or 'online'

        Returns:
            Dictionary with model and topics

        Example:
            >>> service = TopicModelingService(n_topics=5)
            >>> result = service.train_lda(tfidf_matrix, feature_names)
            >>> print(result['topics'][0])
            [('word1', 0.05), ('word2', 0.04), ...]
        """
        logger.info(f"Training LDA with {self.n_topics} topics")

        try:
            lda = LatentDirichletAllocation(
                n_components=self.n_topics,
                max_iter=max_iter,
                learning_method=learning_method,
                random_state=self.random_state,
                n_jobs=-1
            )

            # Fit the model
            lda.fit(tfidf_matrix)

            # Extract topics
            topics = self._extract_topics_sklearn(lda, feature_names)

            # Calculate perplexity
            perplexity = lda.perplexity(tfidf_matrix)

            # Store model
            self.models['lda'] = lda
            self.feature_names = feature_names

            logger.info(f"LDA training complete. Perplexity: {perplexity:.2f}")

            return {
                'success': True,
                'model_type': 'lda',
                'model': lda,
                'topics': topics,
                'perplexity': perplexity,
                'n_topics': self.n_topics
            }

        except Exception as e:
            logger.exception(f"Error training LDA: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def train_nmf(
        self,
        tfidf_matrix,
        feature_names: List[str],
        max_iter: int = 200,
        init: str = 'nndsvda'
    ) -> Dict[str, any]:
        """
        Train NMF (Non-negative Matrix Factorization) model.

        Args:
            tfidf_matrix: TF-IDF matrix (sparse)
            feature_names: List of feature names
            max_iter: Maximum iterations
            init: Initialization method ('random', 'nndsvd', 'nndsvda', 'nndsvdar')

        Returns:
            Dictionary with model and topics

        Example:
            >>> service = TopicModelingService(n_topics=5)
            >>> result = service.train_nmf(tfidf_matrix, feature_names)
            >>> print(len(result['topics']))
            5
        """
        logger.info(f"Training NMF with {self.n_topics} topics")

        try:
            nmf = NMF(
                n_components=self.n_topics,
                max_iter=max_iter,
                init=init,
                random_state=self.random_state
            )

            # Fit the model
            nmf.fit(tfidf_matrix)

            # Extract topics
            topics = self._extract_topics_sklearn(nmf, feature_names)

            # Calculate reconstruction error
            reconstruction_error = nmf.reconstruction_err_

            # Store model
            self.models['nmf'] = nmf
            self.feature_names = feature_names

            logger.info(f"NMF training complete. Error: {reconstruction_error:.2f}")

            return {
                'success': True,
                'model_type': 'nmf',
                'model': nmf,
                'topics': topics,
                'reconstruction_error': reconstruction_error,
                'n_topics': self.n_topics
            }

        except Exception as e:
            logger.exception(f"Error training NMF: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def train_lsa(
        self,
        tfidf_matrix,
        feature_names: List[str],
        n_iter: int = 100
    ) -> Dict[str, any]:
        """
        Train LSA (Latent Semantic Analysis) model using TruncatedSVD.

        Args:
            tfidf_matrix: TF-IDF matrix (sparse)
            feature_names: List of feature names
            n_iter: Number of iterations for SVD

        Returns:
            Dictionary with model and topics

        Example:
            >>> service = TopicModelingService(n_topics=5)
            >>> result = service.train_lsa(tfidf_matrix, feature_names)
            >>> print(result['explained_variance'])
            0.45
        """
        logger.info(f"Training LSA with {self.n_topics} topics")

        try:
            lsa = TruncatedSVD(
                n_components=self.n_topics,
                n_iter=n_iter,
                random_state=self.random_state
            )

            # Fit the model
            lsa.fit(tfidf_matrix)

            # Extract topics
            topics = self._extract_topics_sklearn(lsa, feature_names)

            # Calculate explained variance
            explained_variance = lsa.explained_variance_ratio_.sum()

            # Store model
            self.models['lsa'] = lsa
            self.feature_names = feature_names

            logger.info(
                f"LSA training complete. "
                f"Explained variance: {explained_variance:.4f}"
            )

            return {
                'success': True,
                'model_type': 'lsa',
                'model': lsa,
                'topics': topics,
                'explained_variance': explained_variance,
                'n_topics': self.n_topics
            }

        except Exception as e:
            logger.exception(f"Error training LSA: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def train_plsa(
        self,
        documents: List[List[str]],
        passes: int = 10,
        iterations: int = 50
    ) -> Dict[str, any]:
        """
        Train pLSA (Probabilistic LSA) model using Gensim.

        Note: pLSA is implemented via Gensim's LsiModel which is equivalent.

        Args:
            documents: List of tokenized documents
            passes: Number of passes through the corpus
            iterations: Number of iterations

        Returns:
            Dictionary with model and topics

        Example:
            >>> service = TopicModelingService(n_topics=5)
            >>> docs = [['word1', 'word2'], ['word3', 'word4']]
            >>> result = service.train_plsa(docs)
            >>> print(len(result['topics']))
            5
        """
        logger.info(f"Training pLSA with {self.n_topics} topics")

        try:
            # Create dictionary and corpus
            dictionary = corpora.Dictionary(documents)

            # Filter extremes
            dictionary.filter_extremes(no_below=2, no_above=0.85)

            # Create corpus
            corpus = [dictionary.doc2bow(doc) for doc in documents]

            # Train LSI model (equivalent to pLSA)
            lsi_model = models.LsiModel(
                corpus=corpus,
                id2word=dictionary,
                num_topics=self.n_topics,
                power_iters=iterations,
                extra_samples=100
            )

            # Extract topics
            topics = []
            for topic_idx in range(self.n_topics):
                topic_terms = lsi_model.show_topic(topic_idx, topn=10)
                topics.append({
                    'topic_number': topic_idx,
                    'words': topic_terms
                })

            # Store model
            self.models['plsa'] = {
                'model': lsi_model,
                'dictionary': dictionary,
                'corpus': corpus
            }

            logger.info("pLSA training complete")

            return {
                'success': True,
                'model_type': 'plsa',
                'model': lsi_model,
                'dictionary': dictionary,
                'corpus': corpus,
                'topics': topics,
                'n_topics': self.n_topics
            }

        except Exception as e:
            logger.exception(f"Error training pLSA: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _extract_topics_sklearn(
        self,
        model,
        feature_names: List[str],
        top_n: int = 10
    ) -> List[Dict[str, any]]:
        """
        Extract top words for each topic from sklearn models.

        Args:
            model: Trained sklearn model
            feature_names: List of feature names
            top_n: Number of top words per topic

        Returns:
            List of topics with top words
        """
        topics = []

        for topic_idx, topic_vector in enumerate(model.components_):
            # Get top N word indices
            top_indices = topic_vector.argsort()[-top_n:][::-1]

            # Get words and weights
            top_words = [
                (feature_names[idx], float(topic_vector[idx]))
                for idx in top_indices
            ]

            topics.append({
                'topic_number': topic_idx,
                'words': top_words
            })

        return topics

    def get_document_topics(
        self,
        model_type: str,
        tfidf_matrix=None,
        documents: List[List[str]] = None
    ) -> List[Dict[str, any]]:
        """
        Get topic distribution for each document.

        Args:
            model_type: Type of model ('lda', 'nmf', 'lsa', 'plsa')
            tfidf_matrix: TF-IDF matrix (for sklearn models)
            documents: Tokenized documents (for pLSA)

        Returns:
            List of document-topic distributions

        Example:
            >>> service = TopicModelingService()
            >>> service.train_lda(tfidf_matrix, feature_names)
            >>> doc_topics = service.get_document_topics('lda', tfidf_matrix)
            >>> print(doc_topics[0])
            {'document_index': 0, 'topics': [(0, 0.8), (1, 0.2)]}
        """
        if model_type not in self.models:
            raise ValueError(f"Model {model_type} not trained")

        results = []

        if model_type in ['lda', 'nmf', 'lsa']:
            # sklearn models
            model = self.models[model_type]
            topic_distributions = model.transform(tfidf_matrix)

            for doc_idx, dist in enumerate(topic_distributions):
                # Get topics with probability > 0.01
                topics = [
                    (topic_idx, float(prob))
                    for topic_idx, prob in enumerate(dist)
                    if prob > 0.01
                ]

                # Sort by probability descending
                topics.sort(key=lambda x: x[1], reverse=True)

                results.append({
                    'document_index': doc_idx,
                    'topics': topics
                })

        elif model_type == 'plsa':
            # Gensim LSI model
            plsa_data = self.models['plsa']
            model = plsa_data['model']
            dictionary = plsa_data['dictionary']

            for doc_idx, doc in enumerate(documents):
                bow = dictionary.doc2bow(doc)
                topic_dist = model[bow]

                topics = [
                    (topic_idx, float(prob))
                    for topic_idx, prob in topic_dist
                ]

                topics.sort(key=lambda x: x[1], reverse=True)

                results.append({
                    'document_index': doc_idx,
                    'topics': topics
                })

        return results

    def calculate_coherence(
        self,
        documents: List[List[str]],
        model_type: str
    ) -> float:
        """
        Calculate coherence score for a model.

        Args:
            documents: List of tokenized documents
            model_type: Type of model ('lda', 'nmf', 'lsa', 'plsa')

        Returns:
            Coherence score (higher is better)

        Example:
            >>> service = TopicModelingService()
            >>> service.train_lda(tfidf_matrix, feature_names)
            >>> coherence = service.calculate_coherence(tokenized_docs, 'lda')
            >>> print(f"Coherence: {coherence:.4f}")
        """
        if model_type not in self.models:
            raise ValueError(f"Model {model_type} not trained")

        logger.info(f"Calculating coherence for {model_type}")

        try:
            # Create dictionary
            dictionary = corpora.Dictionary(documents)
            corpus = [dictionary.doc2bow(doc) for doc in documents]

            if model_type == 'plsa':
                # For pLSA, use the existing model
                plsa_data = self.models['plsa']
                model = plsa_data['model']
                dictionary = plsa_data['dictionary']

                coherence_model = CoherenceModel(
                    model=model,
                    texts=documents,
                    dictionary=dictionary,
                    coherence='c_v'
                )

            else:
                # For sklearn models, convert to gensim format
                topics = self._extract_topics_sklearn(
                    self.models[model_type],
                    self.feature_names
                )

                # Extract topic words
                topic_words = [
                    [word for word, _ in topic['words']]
                    for topic in topics
                ]

                coherence_model = CoherenceModel(
                    topics=topic_words,
                    texts=documents,
                    dictionary=dictionary,
                    coherence='c_v'
                )

            coherence_score = coherence_model.get_coherence()

            logger.info(f"Coherence score: {coherence_score:.4f}")

            return coherence_score

        except Exception as e:
            logger.exception(f"Error calculating coherence: {e}")
            return 0.0

    def compare_models(
        self,
        tfidf_matrix,
        feature_names: List[str],
        documents: List[List[str]]
    ) -> Dict[str, Dict[str, any]]:
        """
        Train and compare all models.

        Args:
            tfidf_matrix: TF-IDF matrix
            feature_names: List of feature names
            documents: Tokenized documents

        Returns:
            Dictionary with comparison results

        Example:
            >>> service = TopicModelingService(n_topics=5)
            >>> comparison = service.compare_models(tfidf_matrix, features, docs)
            >>> print(comparison['lda']['coherence'])
            0.45
        """
        logger.info("Training and comparing all models")

        results = {}

        # Train LDA
        lda_result = self.train_lda(tfidf_matrix, feature_names)
        if lda_result['success']:
            coherence = self.calculate_coherence(documents, 'lda')
            results['lda'] = {
                'perplexity': lda_result['perplexity'],
                'coherence': coherence,
                'topics': lda_result['topics']
            }

        # Train NMF
        nmf_result = self.train_nmf(tfidf_matrix, feature_names)
        if nmf_result['success']:
            coherence = self.calculate_coherence(documents, 'nmf')
            results['nmf'] = {
                'reconstruction_error': nmf_result['reconstruction_error'],
                'coherence': coherence,
                'topics': nmf_result['topics']
            }

        # Train LSA
        lsa_result = self.train_lsa(tfidf_matrix, feature_names)
        if lsa_result['success']:
            coherence = self.calculate_coherence(documents, 'lsa')
            results['lsa'] = {
                'explained_variance': lsa_result['explained_variance'],
                'coherence': coherence,
                'topics': lsa_result['topics']
            }

        # Train pLSA
        plsa_result = self.train_plsa(documents)
        if plsa_result['success']:
            coherence = self.calculate_coherence(documents, 'plsa')
            results['plsa'] = {
                'coherence': coherence,
                'topics': plsa_result['topics']
            }

        logger.info(f"Model comparison complete. Trained {len(results)} models")

        return results
