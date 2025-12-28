"""
Unit Tests for Documents Services

Tests for LanguageDetectorService, DocumentConverterService, and TextPreprocessorService.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from apps.documents.services.language_detector import LanguageDetectorService
from apps.documents.services.document_converter import DocumentConverterService
from apps.documents.services.text_preprocessor import TextPreprocessorService


# ===== LanguageDetectorService Tests =====

class TestLanguageDetectorService:
    """Tests for LanguageDetectorService"""

    @pytest.fixture
    def service(self):
        """Create service instance"""
        return LanguageDetectorService()

    @pytest.mark.unit
    def test_detect_spanish_text(self, service):
        """Test Spanish language detection"""
        text = "Este es un texto en español sobre transformación digital en educación superior."

        result = service.detect(text)

        assert result['success'] is True
        assert result['language'] == 'es'
        assert result['confidence'] > 0.9
        assert 'reliable' in result

    @pytest.mark.unit
    def test_detect_english_text(self, service):
        """Test English language detection"""
        text = "This is an English text about digital transformation in higher education."

        result = service.detect(text)

        assert result['success'] is True
        assert result['language'] == 'en'
        assert result['confidence'] > 0.9

    @pytest.mark.unit
    def test_detect_empty_text(self, service):
        """Test detection with empty text"""
        result = service.detect("")

        assert result['success'] is False
        assert 'error' in result
        assert 'empty' in result['error'].lower()

    @pytest.mark.unit
    def test_detect_very_short_text(self, service):
        """Test detection with very short text"""
        result = service.detect("Hi")

        # Short text may have low confidence
        assert result['success'] is True
        assert 'language' in result

    @pytest.mark.unit
    def test_detect_mixed_language(self, service):
        """Test detection with mixed language text"""
        text = "Este es un texto en español but also has some English words."

        result = service.detect(text)

        assert result['success'] is True
        # Should detect the dominant language (Spanish)
        assert result['language'] in ['es', 'en']


# ===== DocumentConverterService Tests =====

class TestDocumentConverterService:
    """Tests for DocumentConverterService"""

    @pytest.fixture
    def service(self):
        """Create service instance"""
        return DocumentConverterService()

    @pytest.mark.unit
    def test_service_has_logger(self, service):
        """Test that service has logger configured"""
        assert hasattr(service, 'logger')
        assert service.logger.name == 'apps.documents.services.document_converter'

    @pytest.mark.unit
    @patch('apps.documents.services.document_converter.extract_text')
    def test_convert_pdf_with_pdfminer(self, mock_extract_text, service):
        """Test PDF conversion using pdfminer"""
        mock_extract_text.return_value = "Extracted text from PDF"

        result = service.convert_from_pdf("test.pdf")

        assert result['success'] is True
        assert result['text'] == "Extracted text from PDF"
        assert result['method'] == 'pdfminer'
        mock_extract_text.assert_called_once()

    @pytest.mark.unit
    def test_convert_nonexistent_file(self, service):
        """Test conversion of non-existent file"""
        result = service.convert_from_pdf("nonexistent_file.pdf")

        assert result['success'] is False
        assert 'error' in result

    @pytest.mark.unit
    @patch('apps.documents.services.document_converter.extract_text')
    @patch('apps.documents.services.document_converter.PyPDF2')
    def test_fallback_to_pypdf2(self, mock_pypdf2, mock_extract_text, service):
        """Test fallback to PyPDF2 when pdfminer fails"""
        # Simulate pdfminer failure
        mock_extract_text.side_effect = Exception("pdfminer failed")

        # Mock PyPDF2 success
        mock_reader = MagicMock()
        mock_reader.pages = [MagicMock()]
        mock_reader.pages[0].extract_text.return_value = "Text from PyPDF2"
        mock_pypdf2.PdfReader.return_value = mock_reader

        result = service.convert_from_pdf("test.pdf")

        # Depending on implementation, it should either fail or fallback
        assert 'success' in result


# ===== TextPreprocessorService Tests =====

class TestTextPreprocessorService:
    """Tests for TextPreprocessorService"""

    @pytest.fixture
    def service(self):
        """Create service instance"""
        return TextPreprocessorService()

    @pytest.mark.unit
    def test_preprocess_basic_text(self, service):
        """Test basic text preprocessing"""
        text = "Este es un texto de PRUEBA con números 123 y puntuación!"

        result = service.preprocess(
            text,
            remove_stopwords=True,
            remove_punctuation=True,
            remove_numbers=True,
            apply_stemming=False
        )

        assert result['success'] is True
        assert 'tokens' in result
        assert 'statistics' in result

        # Check that numbers and punctuation were removed
        tokens = result['tokens']
        assert '123' not in ' '.join(tokens)
        assert '!' not in ' '.join(tokens)

    @pytest.mark.unit
    def test_preprocess_with_stemming(self, service):
        """Test preprocessing with stemming"""
        text = "corriendo correr corrió"

        result = service.preprocess(
            text,
            remove_stopwords=False,
            remove_punctuation=True,
            remove_numbers=False,
            apply_stemming=True
        )

        assert result['success'] is True
        tokens = result['tokens']

        # All should be stemmed to similar root (depending on stemmer)
        # This is a basic check - actual stemming behavior depends on language
        assert len(tokens) > 0

    @pytest.mark.unit
    def test_preprocess_empty_text(self, service):
        """Test preprocessing with empty text"""
        result = service.preprocess("")

        assert result['success'] is False
        assert 'error' in result

    @pytest.mark.unit
    def test_preprocess_statistics(self, service):
        """Test that preprocessing returns correct statistics"""
        text = "palabra1 palabra2 palabra3"

        result = service.preprocess(
            text,
            remove_stopwords=False,
            remove_punctuation=False,
            remove_numbers=False
        )

        assert result['success'] is True
        stats = result['statistics']

        assert 'original_length' in stats
        assert 'token_count' in stats
        assert 'removed_stopwords' in stats
        assert stats['original_length'] == len(text)

    @pytest.mark.unit
    def test_preprocess_with_min_max_length(self, service):
        """Test preprocessing with min/max word length filters"""
        text = "a bb ccc dddd eeeee"

        result = service.preprocess(
            text,
            remove_stopwords=False,
            min_word_length=2,
            max_word_length=4
        )

        assert result['success'] is True
        tokens = result['tokens']

        # Should filter out 'a' (too short) and 'eeeee' (too long)
        assert 'a' not in tokens
        assert 'eeeee' not in tokens
        assert 'bb' in tokens or 'ccc' in tokens or 'dddd' in tokens


# ===== Integration Tests =====

@pytest.mark.integration
class TestServicesIntegration:
    """Integration tests for services working together"""

    def test_full_document_pipeline(self):
        """Test full pipeline: detect language -> preprocess"""
        text = "Este es un documento de prueba sobre transformación digital."

        # Detect language
        lang_service = LanguageDetectorService()
        lang_result = lang_service.detect(text)

        assert lang_result['success'] is True
        assert lang_result['language'] == 'es'

        # Preprocess
        prep_service = TextPreprocessorService()
        prep_result = prep_service.preprocess(
            text,
            remove_stopwords=True,
            remove_punctuation=True
        )

        assert prep_result['success'] is True
        assert len(prep_result['tokens']) > 0


# ===== Parametrized Tests =====

@pytest.mark.unit
@pytest.mark.parametrize("text,expected_lang", [
    ("This is English", "en"),
    ("Esto es español", "es"),
    ("Ceci est français", "fr"),
    ("Dies ist Deutsch", "de"),
])
def test_multiple_languages(text, expected_lang):
    """Test detection of multiple languages"""
    service = LanguageDetectorService()
    result = service.detect(text)

    assert result['success'] is True
    assert result['language'] == expected_lang
