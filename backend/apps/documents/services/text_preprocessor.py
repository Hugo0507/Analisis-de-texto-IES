"""
Text Preprocessing Service.

Uses NLTK for tokenization, stopword removal, and text normalization.
"""

import logging
import re
from typing import List, Dict, Set
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.corpus import stopwords
from nltk.stem import SnowballStemmer

logger = logging.getLogger(__name__)


class TextPreprocessorService:
    """
    Service for preprocessing text for NLP analysis.

    Performs:
    - Tokenization (words and sentences)
    - Lowercasing
    - Stopword removal (200+ stopwords for Spanish)
    - Punctuation removal
    - Number removal
    - Stemming (optional)
    - Lemmatization (optional)
    """

    def __init__(self, language: str = 'spanish'):
        """
        Initialize text preprocessor.

        Args:
            language: Language for stopwords ('spanish', 'english', 'portuguese')
        """
        self.language = language
        self._ensure_nltk_data()
        self._load_stopwords()
        self.stemmer = SnowballStemmer(language)

    def _ensure_nltk_data(self):
        """Download required NLTK data if not present."""
        required_data = [
            'punkt',
            'stopwords',
        ]

        for data_name in required_data:
            try:
                nltk.data.find(f'tokenizers/{data_name}')
            except LookupError:
                logger.info(f"Downloading NLTK data: {data_name}")
                nltk.download(data_name, quiet=True)

    def _load_stopwords(self):
        """Load stopwords for the specified language."""
        try:
            self.stopwords = set(stopwords.words(self.language))

            # Add custom stopwords for academic Spanish
            if self.language == 'spanish':
                custom_stopwords = {
                    'si', 'no', 'ser', 'estar', 'haber', 'tener',
                    'hacer', 'poder', 'decir', 'dar', 'ver',
                    'muy', 'mas', 'tambien', 'solo', 'asi',
                    'puede', 'pueden', 'debe', 'deben',
                    'mediante', 'traves', 'debe', 'ejemplo',
                    'forma', 'parte', 'etc', 'segun'
                }
                self.stopwords.update(custom_stopwords)

            logger.info(
                f"Loaded {len(self.stopwords)} stopwords for {self.language}"
            )

        except Exception as e:
            logger.exception(f"Error loading stopwords: {e}")
            self.stopwords = set()

    def preprocess(
        self,
        text: str,
        lowercase: bool = True,
        remove_stopwords: bool = True,
        remove_punctuation: bool = True,
        remove_numbers: bool = True,
        apply_stemming: bool = False,
        min_word_length: int = 3,
        max_word_length: int = 30
    ) -> Dict[str, any]:
        """
        Preprocess text with configurable options.

        Args:
            text: Raw text to preprocess
            lowercase: Convert to lowercase
            remove_stopwords: Remove stopwords
            remove_punctuation: Remove punctuation
            remove_numbers: Remove numbers
            apply_stemming: Apply stemming
            min_word_length: Minimum word length to keep
            max_word_length: Maximum word length to keep

        Returns:
            Dictionary with:
                - 'preprocessed_text': Cleaned text
                - 'tokens': List of tokens
                - 'token_count': Number of tokens
                - 'sentence_count': Number of sentences

        Example:
            >>> preprocessor = TextPreprocessorService('spanish')
            >>> result = preprocessor.preprocess("Este es un texto de ejemplo.")
            >>> print(result['preprocessed_text'])
            "texto ejemplo"
        """
        if not text:
            return {
                'preprocessed_text': '',
                'tokens': [],
                'token_count': 0,
                'sentence_count': 0
            }

        # 1. Lowercase
        if lowercase:
            text = text.lower()

        # 2. Remove URLs
        text = re.sub(r'http\S+|www\.\S+', '', text)

        # 3. Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)

        # 4. Remove numbers (if specified)
        if remove_numbers:
            text = re.sub(r'\b\d+\b', '', text)

        # 5. Tokenize
        try:
            tokens = word_tokenize(text, language=self.language)
        except Exception as e:
            logger.warning(f"Tokenization failed, using split: {e}")
            tokens = text.split()

        # 6. Remove punctuation (if specified)
        if remove_punctuation:
            tokens = [
                token for token in tokens
                if token.isalnum()
            ]

        # 7. Remove stopwords (if specified)
        if remove_stopwords:
            tokens = [
                token for token in tokens
                if token not in self.stopwords
            ]

        # 8. Filter by length
        tokens = [
            token for token in tokens
            if min_word_length <= len(token) <= max_word_length
        ]

        # 9. Apply stemming (if specified)
        if apply_stemming:
            tokens = [
                self.stemmer.stem(token)
                for token in tokens
            ]

        # 10. Count sentences in original text
        try:
            sentences = sent_tokenize(text, language=self.language)
            sentence_count = len(sentences)
        except:
            sentence_count = text.count('.') + text.count('!') + text.count('?')

        # 11. Join tokens back
        preprocessed_text = ' '.join(tokens)

        return {
            'preprocessed_text': preprocessed_text,
            'tokens': tokens,
            'token_count': len(tokens),
            'sentence_count': sentence_count
        }

    def tokenize_words(self, text: str) -> List[str]:
        """
        Tokenize text into words.

        Args:
            text: Text to tokenize

        Returns:
            List of word tokens

        Example:
            >>> preprocessor = TextPreprocessorService()
            >>> tokens = preprocessor.tokenize_words("Este es un texto.")
            >>> print(tokens)
            ['Este', 'es', 'un', 'texto', '.']
        """
        try:
            return word_tokenize(text, language=self.language)
        except Exception as e:
            logger.warning(f"Tokenization failed: {e}")
            return text.split()

    def tokenize_sentences(self, text: str) -> List[str]:
        """
        Tokenize text into sentences.

        Args:
            text: Text to tokenize

        Returns:
            List of sentences

        Example:
            >>> preprocessor = TextPreprocessorService()
            >>> sentences = preprocessor.tokenize_sentences("Primera frase. Segunda frase.")
            >>> print(len(sentences))
            2
        """
        try:
            return sent_tokenize(text, language=self.language)
        except Exception as e:
            logger.warning(f"Sentence tokenization failed: {e}")
            # Simple fallback
            return re.split(r'[.!?]+', text)

    def remove_stopwords(self, tokens: List[str]) -> List[str]:
        """
        Remove stopwords from token list.

        Args:
            tokens: List of tokens

        Returns:
            Filtered tokens

        Example:
            >>> preprocessor = TextPreprocessorService('spanish')
            >>> tokens = ['este', 'es', 'texto', 'importante']
            >>> filtered = preprocessor.remove_stopwords(tokens)
            >>> print(filtered)
            ['texto', 'importante']
        """
        return [
            token for token in tokens
            if token.lower() not in self.stopwords
        ]

    def apply_stemming(self, tokens: List[str]) -> List[str]:
        """
        Apply stemming to tokens.

        Args:
            tokens: List of tokens

        Returns:
            Stemmed tokens

        Example:
            >>> preprocessor = TextPreprocessorService('spanish')
            >>> tokens = ['transformacion', 'transformador', 'transformar']
            >>> stemmed = preprocessor.apply_stemming(tokens)
            >>> print(stemmed)
            ['transform', 'transform', 'transform']
        """
        return [
            self.stemmer.stem(token)
            for token in tokens
        ]

    def get_word_frequency(
        self,
        tokens: List[str],
        top_n: int = 50
    ) -> Dict[str, int]:
        """
        Calculate word frequency distribution.

        Args:
            tokens: List of tokens
            top_n: Number of top words to return

        Returns:
            Dictionary with word frequencies (sorted)

        Example:
            >>> preprocessor = TextPreprocessorService()
            >>> tokens = ['word', 'test', 'word', 'example', 'word']
            >>> freqs = preprocessor.get_word_frequency(tokens, top_n=3)
            >>> print(freqs)
            {'word': 3, 'test': 1, 'example': 1}
        """
        from collections import Counter

        freq_dist = Counter(tokens)

        # Return top N
        top_words = dict(freq_dist.most_common(top_n))

        return top_words

    def get_vocabulary(self, tokens: List[str]) -> Set[str]:
        """
        Get unique vocabulary from tokens.

        Args:
            tokens: List of tokens

        Returns:
            Set of unique words

        Example:
            >>> preprocessor = TextPreprocessorService()
            >>> tokens = ['word', 'test', 'word', 'example']
            >>> vocab = preprocessor.get_vocabulary(tokens)
            >>> print(len(vocab))
            3
        """
        return set(tokens)

    def preprocess_batch(
        self,
        texts: List[str],
        **kwargs
    ) -> List[Dict[str, any]]:
        """
        Preprocess multiple texts in batch.

        Args:
            texts: List of text strings
            **kwargs: Preprocessing options

        Returns:
            List of preprocessing results

        Example:
            >>> preprocessor = TextPreprocessorService()
            >>> texts = ["Texto 1", "Texto 2", "Texto 3"]
            >>> results = preprocessor.preprocess_batch(texts)
            >>> print(len(results))
            3
        """
        results = []

        for text in texts:
            result = self.preprocess(text, **kwargs)
            results.append(result)

        logger.info(f"Batch preprocessing completed for {len(texts)} texts")

        return results

    def get_statistics(self, text: str) -> Dict[str, any]:
        """
        Get text statistics.

        Args:
            text: Text to analyze

        Returns:
            Dictionary with statistics

        Example:
            >>> preprocessor = TextPreprocessorService()
            >>> stats = preprocessor.get_statistics("Este es un texto de ejemplo.")
            >>> print(stats)
            {
                'char_count': 28,
                'word_count': 6,
                'sentence_count': 1,
                'avg_word_length': 3.5
            }
        """
        words = self.tokenize_words(text)
        sentences = self.tokenize_sentences(text)

        return {
            'char_count': len(text),
            'word_count': len(words),
            'sentence_count': len(sentences),
            'avg_word_length': sum(len(w) for w in words) / len(words) if words else 0,
            'avg_sentence_length': len(words) / len(sentences) if sentences else 0
        }
