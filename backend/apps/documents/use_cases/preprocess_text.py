"""
Preprocess Text Use Case.

Preprocesses document text using TextPreprocessorService.
"""

import logging
from typing import Dict, List

from apps.documents.services.text_preprocessor import TextPreprocessorService
from apps.documents.models import Document

logger = logging.getLogger(__name__)


class PreprocessTextUseCase:
    """
    Use case for preprocessing document text.

    Orchestrates:
    - TextPreprocessorService (text preprocessing)
    - Document model (save preprocessed text)
    """

    def __init__(self, preprocessor: TextPreprocessorService = None):
        """
        Initialize use case.

        Args:
            preprocessor: Text preprocessor service instance
        """
        self.preprocessor = preprocessor or TextPreprocessorService('spanish')

    def execute(
        self,
        document_id: int,
        remove_stopwords: bool = True,
        remove_punctuation: bool = True,
        remove_numbers: bool = True,
        apply_stemming: bool = False,
        min_word_length: int = 3,
        max_word_length: int = 30
    ) -> Dict[str, any]:
        """
        Preprocess a single document.

        Args:
            document_id: Document ID
            remove_stopwords: Remove Spanish stopwords
            remove_punctuation: Remove punctuation
            remove_numbers: Remove numbers
            apply_stemming: Apply SnowballStemmer
            min_word_length: Minimum word length
            max_word_length: Maximum word length

        Returns:
            Dictionary with preprocessing results

        Example:
            >>> use_case = PreprocessTextUseCase()
            >>> result = use_case.execute(document_id=1)
            >>> print(f"Tokens: {result['token_count']}")
        """
        logger.info(f"Preprocessing document {document_id}")

        try:
            # Get document from database
            document = Document.objects.get(id=document_id)

            # Check if document has text content
            if not document.txt_content:
                return {
                    'success': False,
                    'error': 'Document has no text content. Convert to TXT first.',
                    'document_id': document_id
                }

            # Preprocess text
            preprocess_result = self.preprocessor.preprocess(
                document.txt_content,
                lowercase=True,
                remove_stopwords=remove_stopwords,
                remove_punctuation=remove_punctuation,
                remove_numbers=remove_numbers,
                apply_stemming=apply_stemming,
                min_word_length=min_word_length,
                max_word_length=max_word_length
            )

            # Update document with preprocessed text
            document.preprocessed_text = preprocess_result['preprocessed_text']
            document.status = 'processing'
            document.save()

            logger.info(
                f"Preprocessed document {document_id} "
                f"({preprocess_result['token_count']} tokens)"
            )

            return {
                'success': True,
                'document_id': document_id,
                'filename': document.filename,
                'token_count': preprocess_result['token_count'],
                'original_length': len(document.txt_content),
                'preprocessed_length': len(preprocess_result['preprocessed_text'])
            }

        except Document.DoesNotExist:
            logger.error(f"Document {document_id} not found")
            return {
                'success': False,
                'error': f'Document {document_id} not found',
                'document_id': document_id
            }

        except Exception as e:
            logger.exception(f"Error preprocessing document {document_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'document_id': document_id
            }

    def execute_batch(
        self,
        document_ids: List[int] = None,
        remove_stopwords: bool = True,
        remove_punctuation: bool = True,
        remove_numbers: bool = True,
        apply_stemming: bool = False,
        min_word_length: int = 3,
        max_word_length: int = 30
    ) -> Dict[str, any]:
        """
        Preprocess multiple documents.

        Args:
            document_ids: List of document IDs (None = all pending documents)
            remove_stopwords: Remove Spanish stopwords
            remove_punctuation: Remove punctuation
            remove_numbers: Remove numbers
            apply_stemming: Apply SnowballStemmer
            min_word_length: Minimum word length
            max_word_length: Maximum word length

        Returns:
            Dictionary with batch preprocessing results

        Example:
            >>> use_case = PreprocessTextUseCase()
            >>> result = use_case.execute_batch([1, 2, 3])
            >>> print(f"Preprocessed {result['success_count']} documents")
        """
        logger.info("Starting batch text preprocessing")

        # Get documents
        if document_ids:
            documents = Document.objects.filter(id__in=document_ids)
        else:
            # Get all documents with text but no preprocessed text
            documents = Document.objects.filter(
                txt_content__isnull=False,
                preprocessed_text__isnull=True
            )

        if not documents.exists():
            return {
                'success': True,
                'success_count': 0,
                'failed_count': 0,
                'message': 'No documents to process'
            }

        logger.info(f"Processing {documents.count()} documents")

        success_count = 0
        failed_count = 0
        results = []
        errors = []

        for document in documents:
            try:
                # Preprocess text
                preprocess_result = self.preprocessor.preprocess(
                    document.txt_content,
                    lowercase=True,
                    remove_stopwords=remove_stopwords,
                    remove_punctuation=remove_punctuation,
                    remove_numbers=remove_numbers,
                    apply_stemming=apply_stemming,
                    min_word_length=min_word_length,
                    max_word_length=max_word_length
                )

                # Update document
                document.preprocessed_text = preprocess_result['preprocessed_text']
                document.status = 'processing'
                document.save()

                results.append({
                    'document_id': document.id,
                    'filename': document.filename,
                    'token_count': preprocess_result['token_count'],
                    'original_length': len(document.txt_content),
                    'preprocessed_length': len(preprocess_result['preprocessed_text'])
                })

                success_count += 1

            except Exception as e:
                logger.exception(f"Error preprocessing document {document.id}: {e}")
                failed_count += 1
                errors.append({
                    'document_id': document.id,
                    'filename': document.filename,
                    'error': str(e)
                })

        logger.info(f"Batch preprocessing complete: {success_count} succeeded, {failed_count} failed")

        return {
            'success': True,
            'success_count': success_count,
            'failed_count': failed_count,
            'total_documents': documents.count(),
            'results': results,
            'errors': errors if errors else None
        }

    def get_statistics(
        self,
        document_id: int
    ) -> Dict[str, any]:
        """
        Get text statistics for a document.

        Args:
            document_id: Document ID

        Returns:
            Dictionary with text statistics
        """
        logger.info(f"Getting text statistics for document {document_id}")

        try:
            # Get document from database
            document = Document.objects.get(id=document_id)

            # Check if document has preprocessed text
            if not document.preprocessed_text:
                return {
                    'success': False,
                    'error': 'Document has no preprocessed text',
                    'document_id': document_id
                }

            # Get statistics
            tokens = document.preprocessed_text.split()
            stats = self.preprocessor.get_statistics(document.preprocessed_text)

            return {
                'success': True,
                'document_id': document_id,
                'filename': document.filename,
                'statistics': stats
            }

        except Document.DoesNotExist:
            logger.error(f"Document {document_id} not found")
            return {
                'success': False,
                'error': f'Document {document_id} not found',
                'document_id': document_id
            }

        except Exception as e:
            logger.exception(f"Error getting statistics for document {document_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'document_id': document_id
            }
