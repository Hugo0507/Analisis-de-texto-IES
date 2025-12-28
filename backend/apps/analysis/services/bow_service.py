"""
Bag of Words Service.

Generates BoW matrix using scikit-learn CountVectorizer.
"""

import logging
from typing import Dict, List, Tuple
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from scipy.sparse import csr_matrix

logger = logging.getLogger(__name__)


class BowService:
    """
    Service for generating Bag of Words representations.

    Uses scikit-learn CountVectorizer with configurable parameters.
    """

    def __init__(
        self,
        max_features: int = 5000,
        min_df: int = 2,
        max_df: float = 0.85,
        ngram_range: Tuple[int, int] = (1, 1)
    ):
        """
        Initialize BoW service.

        Args:
            max_features: Maximum number of features (vocabulary size)
            min_df: Minimum document frequency (ignore terms appearing in < min_df documents)
            max_df: Maximum document frequency (ignore terms appearing in > max_df% of documents)
            ngram_range: N-gram range (1,1) for unigrams, (1,2) for unigrams+bigrams
        """
        self.max_features = max_features
        self.min_df = min_df
        self.max_df = max_df
        self.ngram_range = ngram_range
        self.vectorizer = None
        self.vocabulary = None

    def fit(self, documents: List[str]) -> Dict[str, any]:
        """
        Fit BoW model on documents.

        Args:
            documents: List of preprocessed text documents

        Returns:
            Dictionary with fit information

        Example:
            >>> bow_service = BowService(max_features=1000)
            >>> docs = ["text one", "text two", "text three"]
            >>> info = bow_service.fit(docs)
            >>> print(info['vocabulary_size'])
            4
        """
        logger.info(f"Fitting BoW model on {len(documents)} documents")

        try:
            self.vectorizer = CountVectorizer(
                max_features=self.max_features,
                min_df=self.min_df,
                max_df=self.max_df,
                ngram_range=self.ngram_range,
                token_pattern=r'\b\w+\b'
            )

            # Fit the vectorizer
            self.vectorizer.fit(documents)

            # Store vocabulary
            self.vocabulary = self.vectorizer.vocabulary_

            vocab_size = len(self.vocabulary)

            logger.info(f"BoW model fitted with vocabulary size: {vocab_size}")

            return {
                'success': True,
                'vocabulary_size': vocab_size,
                'max_features': self.max_features,
                'min_df': self.min_df,
                'max_df': self.max_df,
                'ngram_range': self.ngram_range
            }

        except Exception as e:
            logger.exception(f"Error fitting BoW model: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def transform(self, documents: List[str]) -> Dict[str, any]:
        """
        Transform documents to BoW matrix.

        Args:
            documents: List of preprocessed text documents

        Returns:
            Dictionary with:
                - 'matrix': Sparse BoW matrix (scipy.sparse.csr_matrix)
                - 'shape': Matrix shape (n_documents, n_features)
                - 'sparsity': Sparsity percentage

        Example:
            >>> bow_service = BowService()
            >>> bow_service.fit(["text one", "text two"])
            >>> result = bow_service.transform(["text one"])
            >>> print(result['shape'])
            (1, 3)
        """
        if self.vectorizer is None:
            raise ValueError("Model not fitted. Call fit() first.")

        logger.info(f"Transforming {len(documents)} documents to BoW")

        try:
            # Transform to BoW matrix
            bow_matrix = self.vectorizer.transform(documents)

            # Calculate sparsity
            sparsity = 1.0 - (bow_matrix.nnz / (bow_matrix.shape[0] * bow_matrix.shape[1]))

            logger.info(
                f"BoW transformation complete. "
                f"Shape: {bow_matrix.shape}, Sparsity: {sparsity:.4f}"
            )

            return {
                'success': True,
                'matrix': bow_matrix,
                'shape': bow_matrix.shape,
                'sparsity': sparsity,
                'nnz': bow_matrix.nnz
            }

        except Exception as e:
            logger.exception(f"Error transforming to BoW: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def fit_transform(self, documents: List[str]) -> Dict[str, any]:
        """
        Fit and transform in one step.

        Args:
            documents: List of preprocessed text documents

        Returns:
            Dictionary with transformation results
        """
        fit_result = self.fit(documents)

        if not fit_result['success']:
            return fit_result

        return self.transform(documents)

    def get_feature_names(self) -> List[str]:
        """
        Get vocabulary terms (feature names).

        Returns:
            List of terms in vocabulary

        Example:
            >>> bow_service = BowService()
            >>> bow_service.fit(["text example"])
            >>> features = bow_service.get_feature_names()
            >>> print(features)
            ['example', 'text']
        """
        if self.vectorizer is None:
            raise ValueError("Model not fitted. Call fit() first.")

        return self.vectorizer.get_feature_names_out().tolist()

    def get_top_terms_per_document(
        self,
        bow_matrix: csr_matrix,
        top_n: int = 10
    ) -> List[Dict[str, any]]:
        """
        Get top N terms for each document.

        Args:
            bow_matrix: BoW sparse matrix
            top_n: Number of top terms per document

        Returns:
            List of dicts with top terms and frequencies for each document

        Example:
            >>> bow_service = BowService()
            >>> bow_service.fit_transform(["text example word text"])
            >>> top_terms = bow_service.get_top_terms_per_document(result['matrix'])
            >>> print(top_terms[0]['terms'][:3])
            [('text', 2), ('example', 1), ('word', 1)]
        """
        if self.vectorizer is None:
            raise ValueError("Model not fitted. Call fit() first.")

        feature_names = self.get_feature_names()
        results = []

        for doc_idx in range(bow_matrix.shape[0]):
            # Get term frequencies for this document
            doc_vector = bow_matrix[doc_idx].toarray().flatten()

            # Get top N indices
            top_indices = doc_vector.argsort()[-top_n:][::-1]

            # Build list of (term, frequency) tuples
            top_terms = [
                (feature_names[idx], int(doc_vector[idx]))
                for idx in top_indices
                if doc_vector[idx] > 0
            ]

            results.append({
                'document_index': doc_idx,
                'terms': top_terms
            })

        return results

    def get_global_term_frequency(
        self,
        bow_matrix: csr_matrix,
        top_n: int = 50
    ) -> List[Tuple[str, int]]:
        """
        Get global term frequencies across all documents.

        Args:
            bow_matrix: BoW sparse matrix
            top_n: Number of top terms to return

        Returns:
            List of (term, frequency) tuples sorted by frequency

        Example:
            >>> bow_service = BowService()
            >>> result = bow_service.fit_transform(["text", "text word"])
            >>> global_freq = bow_service.get_global_term_frequency(result['matrix'])
            >>> print(global_freq[:3])
            [('text', 2), ('word', 1)]
        """
        if self.vectorizer is None:
            raise ValueError("Model not fitted. Call fit() first.")

        # Sum frequencies across all documents
        global_freqs = np.asarray(bow_matrix.sum(axis=0)).flatten()

        # Get feature names
        feature_names = self.get_feature_names()

        # Create list of (term, frequency) tuples
        term_freqs = [
            (feature_names[idx], int(global_freqs[idx]))
            for idx in range(len(feature_names))
        ]

        # Sort by frequency descending
        term_freqs.sort(key=lambda x: x[1], reverse=True)

        return term_freqs[:top_n]

    def get_document_frequency(
        self,
        bow_matrix: csr_matrix
    ) -> Dict[str, int]:
        """
        Get document frequency for each term.

        Args:
            bow_matrix: BoW sparse matrix

        Returns:
            Dictionary mapping term to document frequency

        Example:
            >>> bow_service = BowService()
            >>> result = bow_service.fit_transform(["text", "text word", "word"])
            >>> doc_freq = bow_service.get_document_frequency(result['matrix'])
            >>> print(doc_freq)
            {'text': 2, 'word': 2}
        """
        if self.vectorizer is None:
            raise ValueError("Model not fitted. Call fit() first.")

        # Count documents containing each term
        doc_freqs = np.asarray((bow_matrix > 0).sum(axis=0)).flatten()

        # Get feature names
        feature_names = self.get_feature_names()

        # Create dictionary
        return {
            feature_names[idx]: int(doc_freqs[idx])
            for idx in range(len(feature_names))
        }

    def get_vocabulary_dict(self) -> Dict[str, int]:
        """
        Get vocabulary as dictionary (term -> index).

        Returns:
            Dictionary mapping term to index

        Example:
            >>> bow_service = BowService()
            >>> bow_service.fit(["example text"])
            >>> vocab = bow_service.get_vocabulary_dict()
            >>> print(vocab)
            {'example': 0, 'text': 1}
        """
        if self.vocabulary is None:
            raise ValueError("Model not fitted. Call fit() first.")

        return self.vocabulary.copy()
