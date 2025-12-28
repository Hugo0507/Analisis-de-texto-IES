"""
TF-IDF Service.

Generates TF-IDF matrix using scikit-learn TfidfVectorizer.
"""

import logging
from typing import Dict, List, Tuple
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.sparse import csr_matrix

logger = logging.getLogger(__name__)


class TfidfService:
    """
    Service for generating TF-IDF representations.

    Uses scikit-learn TfidfVectorizer with L2 normalization.
    """

    def __init__(
        self,
        max_features: int = 5000,
        min_df: int = 2,
        max_df: float = 0.85,
        ngram_range: Tuple[int, int] = (1, 1),
        norm: str = 'l2',
        use_idf: bool = True,
        sublinear_tf: bool = False
    ):
        """
        Initialize TF-IDF service.

        Args:
            max_features: Maximum number of features
            min_df: Minimum document frequency
            max_df: Maximum document frequency
            ngram_range: N-gram range
            norm: Normalization ('l1', 'l2', or None)
            use_idf: Enable IDF weighting
            sublinear_tf: Apply sublinear TF scaling (log)
        """
        self.max_features = max_features
        self.min_df = min_df
        self.max_df = max_df
        self.ngram_range = ngram_range
        self.norm = norm
        self.use_idf = use_idf
        self.sublinear_tf = sublinear_tf
        self.vectorizer = None
        self.vocabulary = None
        self.idf_scores = None

    def fit(self, documents: List[str]) -> Dict[str, any]:
        """
        Fit TF-IDF model on documents.

        Args:
            documents: List of preprocessed text documents

        Returns:
            Dictionary with fit information
        """
        logger.info(f"Fitting TF-IDF model on {len(documents)} documents")

        try:
            self.vectorizer = TfidfVectorizer(
                max_features=self.max_features,
                min_df=self.min_df,
                max_df=self.max_df,
                ngram_range=self.ngram_range,
                norm=self.norm,
                use_idf=self.use_idf,
                sublinear_tf=self.sublinear_tf,
                token_pattern=r'\b\w+\b'
            )

            # Fit the vectorizer
            self.vectorizer.fit(documents)

            # Store vocabulary
            self.vocabulary = self.vectorizer.vocabulary_

            # Store IDF scores
            if self.use_idf:
                self.idf_scores = self.vectorizer.idf_

            vocab_size = len(self.vocabulary)

            logger.info(f"TF-IDF model fitted with vocabulary size: {vocab_size}")

            return {
                'success': True,
                'vocabulary_size': vocab_size,
                'max_features': self.max_features,
                'min_df': self.min_df,
                'max_df': self.max_df,
                'ngram_range': self.ngram_range,
                'norm': self.norm
            }

        except Exception as e:
            logger.exception(f"Error fitting TF-IDF model: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def transform(self, documents: List[str]) -> Dict[str, any]:
        """
        Transform documents to TF-IDF matrix.

        Args:
            documents: List of preprocessed text documents

        Returns:
            Dictionary with TF-IDF matrix and metadata
        """
        if self.vectorizer is None:
            raise ValueError("Model not fitted. Call fit() first.")

        logger.info(f"Transforming {len(documents)} documents to TF-IDF")

        try:
            # Transform to TF-IDF matrix
            tfidf_matrix = self.vectorizer.transform(documents)

            # Calculate sparsity
            sparsity = 1.0 - (tfidf_matrix.nnz / (tfidf_matrix.shape[0] * tfidf_matrix.shape[1]))

            logger.info(
                f"TF-IDF transformation complete. "
                f"Shape: {tfidf_matrix.shape}, Sparsity: {sparsity:.4f}"
            )

            return {
                'success': True,
                'matrix': tfidf_matrix,
                'shape': tfidf_matrix.shape,
                'sparsity': sparsity,
                'nnz': tfidf_matrix.nnz
            }

        except Exception as e:
            logger.exception(f"Error transforming to TF-IDF: {e}")
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
        """Get vocabulary terms (feature names)."""
        if self.vectorizer is None:
            raise ValueError("Model not fitted. Call fit() first.")

        return self.vectorizer.get_feature_names_out().tolist()

    def get_idf_scores(self) -> Dict[str, float]:
        """
        Get IDF scores for all terms.

        Returns:
            Dictionary mapping term to IDF score

        Example:
            >>> tfidf_service = TfidfService()
            >>> tfidf_service.fit(["text one", "text two"])
            >>> idf_scores = tfidf_service.get_idf_scores()
            >>> print(idf_scores)
            {'text': 1.0, 'one': 1.405, 'two': 1.405}
        """
        if not self.use_idf or self.idf_scores is None:
            raise ValueError("IDF not available. Enable use_idf=True.")

        feature_names = self.get_feature_names()

        return {
            feature_names[idx]: float(self.idf_scores[idx])
            for idx in range(len(feature_names))
        }

    def get_top_terms_per_document(
        self,
        tfidf_matrix: csr_matrix,
        top_n: int = 10
    ) -> List[Dict[str, any]]:
        """
        Get top N terms for each document by TF-IDF score.

        Args:
            tfidf_matrix: TF-IDF sparse matrix
            top_n: Number of top terms per document

        Returns:
            List of dicts with top terms and scores for each document
        """
        if self.vectorizer is None:
            raise ValueError("Model not fitted. Call fit() first.")

        feature_names = self.get_feature_names()
        results = []

        for doc_idx in range(tfidf_matrix.shape[0]):
            # Get TF-IDF scores for this document
            doc_vector = tfidf_matrix[doc_idx].toarray().flatten()

            # Get top N indices
            top_indices = doc_vector.argsort()[-top_n:][::-1]

            # Build list of (term, score) tuples
            top_terms = [
                (feature_names[idx], float(doc_vector[idx]))
                for idx in top_indices
                if doc_vector[idx] > 0
            ]

            results.append({
                'document_index': doc_idx,
                'terms': top_terms
            })

        return results

    def get_global_tfidf_scores(
        self,
        tfidf_matrix: csr_matrix,
        aggregation: str = 'mean',
        top_n: int = 50
    ) -> List[Tuple[str, float]]:
        """
        Get global TF-IDF scores across all documents.

        Args:
            tfidf_matrix: TF-IDF sparse matrix
            aggregation: How to aggregate ('mean', 'sum', 'max')
            top_n: Number of top terms to return

        Returns:
            List of (term, score) tuples sorted by score
        """
        if self.vectorizer is None:
            raise ValueError("Model not fitted. Call fit() first.")

        # Aggregate scores across documents
        if aggregation == 'mean':
            global_scores = np.asarray(tfidf_matrix.mean(axis=0)).flatten()
        elif aggregation == 'sum':
            global_scores = np.asarray(tfidf_matrix.sum(axis=0)).flatten()
        elif aggregation == 'max':
            global_scores = np.asarray(tfidf_matrix.max(axis=0).toarray()).flatten()
        else:
            raise ValueError(f"Unknown aggregation: {aggregation}")

        # Get feature names
        feature_names = self.get_feature_names()

        # Create list of (term, score) tuples
        term_scores = [
            (feature_names[idx], float(global_scores[idx]))
            for idx in range(len(feature_names))
        ]

        # Sort by score descending
        term_scores.sort(key=lambda x: x[1], reverse=True)

        return term_scores[:top_n]

    def get_document_similarity(
        self,
        tfidf_matrix: csr_matrix,
        doc_idx1: int,
        doc_idx2: int
    ) -> float:
        """
        Calculate cosine similarity between two documents.

        Args:
            tfidf_matrix: TF-IDF sparse matrix
            doc_idx1: Index of first document
            doc_idx2: Index of second document

        Returns:
            Cosine similarity score (0 to 1)

        Example:
            >>> tfidf_service = TfidfService()
            >>> result = tfidf_service.fit_transform(["text one", "text two"])
            >>> sim = tfidf_service.get_document_similarity(result['matrix'], 0, 1)
            >>> print(f"Similarity: {sim:.4f}")
        """
        from sklearn.metrics.pairwise import cosine_similarity

        vec1 = tfidf_matrix[doc_idx1]
        vec2 = tfidf_matrix[doc_idx2]

        similarity = cosine_similarity(vec1, vec2)[0, 0]

        return float(similarity)

    def get_all_similarities(
        self,
        tfidf_matrix: csr_matrix
    ) -> np.ndarray:
        """
        Calculate pairwise cosine similarities between all documents.

        Args:
            tfidf_matrix: TF-IDF sparse matrix

        Returns:
            Similarity matrix (n_documents x n_documents)

        Example:
            >>> tfidf_service = TfidfService()
            >>> result = tfidf_service.fit_transform(["text", "text two", "three"])
            >>> sim_matrix = tfidf_service.get_all_similarities(result['matrix'])
            >>> print(sim_matrix.shape)
            (3, 3)
        """
        from sklearn.metrics.pairwise import cosine_similarity

        similarity_matrix = cosine_similarity(tfidf_matrix)

        return similarity_matrix

    def get_vocabulary_dict(self) -> Dict[str, int]:
        """Get vocabulary as dictionary (term -> index)."""
        if self.vocabulary is None:
            raise ValueError("Model not fitted. Call fit() first.")

        return self.vocabulary.copy()

    def get_dense_matrix(self, tfidf_matrix: csr_matrix) -> np.ndarray:
        """
        Convert sparse TF-IDF matrix to dense numpy array.

        WARNING: Use only for small matrices to avoid memory issues.

        Args:
            tfidf_matrix: Sparse TF-IDF matrix

        Returns:
            Dense numpy array
        """
        logger.warning(
            f"Converting sparse matrix to dense. "
            f"Shape: {tfidf_matrix.shape}, Memory: ~{tfidf_matrix.shape[0] * tfidf_matrix.shape[1] * 8 / 1024 / 1024:.2f} MB"
        )

        return tfidf_matrix.toarray()
