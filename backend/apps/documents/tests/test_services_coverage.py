"""
Extended unit tests to improve coverage of Documents services and Cache service.
"""

import pytest
from unittest.mock import patch, MagicMock
from apps.documents.services.language_detector import LanguageDetectorService
from apps.documents.services.document_converter import DocumentConverterService
from apps.documents.services.text_preprocessor import TextPreprocessorService
from apps.infrastructure.cache.triple_layer_cache import TripleLayerCacheService


# ===== LanguageDetectorService extended coverage =====

class TestLanguageDetectorServiceExtended:

    @pytest.fixture
    def service(self):
        return LanguageDetectorService()

    @pytest.mark.unit
    def test_detect_from_text_returns_language(self, service):
        text = "Este es un texto suficientemente largo para que langdetect pueda detectar el idioma correctamente."
        result = service.detect_from_text(text)
        assert 'language' in result
        assert 'confidence' in result

    @pytest.mark.unit
    def test_detect_from_text_short_returns_empty(self, service):
        result = service.detect_from_text("Hi")
        assert result['language'] is None
        assert result['confidence'] == 0.0

    @pytest.mark.unit
    def test_detect_from_text_empty(self, service):
        result = service.detect_from_text("")
        assert result['language'] is None

    @pytest.mark.unit
    def test_detect_from_text_no_confidence(self, service):
        text = "Este es un texto suficientemente largo para que langdetect detecte el idioma sin probabilidades."
        result = service.detect_from_text(text, return_confidence=False)
        assert 'language' in result

    @pytest.mark.unit
    def test_is_supported_language_true(self, service):
        assert service.is_supported_language('es') is True
        assert service.is_supported_language('en') is True
        assert service.is_supported_language('fr') is True

    @pytest.mark.unit
    def test_is_supported_language_false(self, service):
        assert service.is_supported_language('zh') is False
        assert service.is_supported_language('ar') is False
        assert service.is_supported_language('xx') is False

    @pytest.mark.unit
    def test_get_all_probabilities_empty(self, service):
        result = service.get_all_probabilities("")
        assert result == []

    @pytest.mark.unit
    def test_get_all_probabilities_short(self, service):
        result = service.get_all_probabilities("Hi")
        assert result == []

    @pytest.mark.unit
    def test_get_all_probabilities_valid_text(self, service):
        text = "Este es un texto en español suficientemente largo para la detección de idioma correcta."
        result = service.get_all_probabilities(text)
        assert isinstance(result, list)
        # May be empty if text is ambiguous, but should not raise

    @pytest.mark.unit
    def test_detect_batch(self, service):
        texts = [
            "Este texto es en español para probar la detección de idioma en lote.",
            "This text is in English to test batch language detection properly.",
        ]
        results = service.detect_batch(texts)
        assert len(results) == 2
        assert all('language' in r for r in results)

    @pytest.mark.unit
    def test_detect_batch_empty(self, service):
        results = service.detect_batch([])
        assert results == []

    @pytest.mark.unit
    def test_detect_from_file_not_found(self, service):
        result = service.detect_from_file("nonexistent_file.txt")
        assert result['language'] is None

    @pytest.mark.unit
    def test_detect_from_pdf_not_found(self, service):
        result = service.detect_from_pdf("nonexistent.pdf")
        assert result['language'] is None

    @pytest.mark.unit
    @patch('apps.documents.services.language_detector.detect_langs')
    def test_detect_lang_exception_handled(self, mock_detect_langs, service):
        from langdetect import LangDetectException
        mock_detect_langs.side_effect = LangDetectException(0, "error")
        text = "Este es un texto suficientemente largo en español para probar."
        result = service.detect_from_text(text)
        assert result['language'] is None


# ===== DocumentConverterService extended coverage =====

class TestDocumentConverterServiceExtended:

    @pytest.fixture
    def service(self):
        return DocumentConverterService()

    @pytest.mark.unit
    def test_validate_pdf_not_found(self, service):
        result = service.validate_pdf("nonexistent.pdf")
        assert result['valid'] is False
        assert 'error' in result

    @pytest.mark.unit
    def test_validate_pdf_not_pdf_extension(self, service, tmp_path):
        txt_file = tmp_path / "file.txt"
        txt_file.write_text("some content")
        result = service.validate_pdf(str(txt_file))
        assert result['valid'] is False

    @pytest.mark.unit
    def test_convert_batch_all_fail(self, service):
        paths = ["nonexistent1.pdf", "nonexistent2.pdf"]
        results = service.convert_batch(paths)
        assert len(results) == 2
        assert all(r['success'] is False for r in results)

    @pytest.mark.unit
    def test_get_pdf_metadata_not_found(self, service):
        result = service.get_pdf_metadata("nonexistent.pdf")
        assert result == {}

    @pytest.mark.unit
    def test_convert_pdf_to_text_not_found(self, service):
        result = service.convert_pdf_to_text("nonexistent.pdf")
        assert result['success'] is False
        assert 'error' in result

    @pytest.mark.unit
    @patch('apps.documents.services.document_converter.extract_text')
    def test_convert_pdf_to_text_pdfminer_strategy(self, mock_extract, service, tmp_path):
        mock_extract.return_value = "x" * 200  # longer than min_text_length
        fake_pdf = tmp_path / "doc.pdf"
        fake_pdf.write_bytes(b"%PDF-1.4 fake")
        with patch('apps.documents.services.document_converter.PdfReader') as mock_reader:
            mock_reader.return_value.pages = []
            result = service.convert_pdf_to_text(str(fake_pdf), strategy='pdfminer')
        assert result['success'] is True
        assert result['method'] == 'pdfminer'

    @pytest.mark.unit
    def test_convert_pdf_to_text_unknown_strategy(self, service, tmp_path):
        fake_pdf = tmp_path / "doc.pdf"
        fake_pdf.write_bytes(b"%PDF fake")
        result = service.convert_pdf_to_text(str(fake_pdf), strategy='unknown')
        assert result['success'] is False
        assert 'Unknown strategy' in result['error']

    @pytest.mark.unit
    @patch('apps.documents.services.document_converter.pdfplumber')
    def test_try_pdfplumber_success(self, mock_pdfplumber, service, tmp_path):
        """Test _try_pdfplumber when it succeeds."""
        fake_pdf = tmp_path / "doc.pdf"
        fake_pdf.write_bytes(b"%PDF fake")

        mock_page = MagicMock()
        mock_page.extract_text.return_value = "x" * 200
        mock_pdf = MagicMock()
        mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
        mock_pdf.__exit__ = MagicMock(return_value=False)
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.open.return_value = mock_pdf

        from pathlib import Path
        result = service._try_pdfplumber(Path(str(fake_pdf)))
        assert result['success'] is True
        assert result['method'] == 'pdfplumber'

    @pytest.mark.unit
    @patch('apps.documents.services.document_converter.pdfplumber')
    def test_try_pdfplumber_failure(self, mock_pdfplumber, service, tmp_path):
        """Test _try_pdfplumber when pdfplumber raises an exception."""
        fake_pdf = tmp_path / "doc.pdf"
        fake_pdf.write_bytes(b"%PDF fake")
        mock_pdfplumber.open.side_effect = Exception("pdfplumber error")

        from pathlib import Path
        result = service._try_pdfplumber(Path(str(fake_pdf)))
        assert result['success'] is False
        assert result['method'] == 'pdfplumber'

    @pytest.mark.unit
    @patch('apps.documents.services.document_converter.extract_text')
    @patch('apps.documents.services.document_converter.PdfReader')
    def test_try_pdfminer_success(self, mock_reader, mock_extract, service, tmp_path):
        """Test _try_pdfminer internal method directly."""
        fake_pdf = tmp_path / "doc.pdf"
        fake_pdf.write_bytes(b"%PDF fake")
        mock_extract.return_value = "Extracted text " * 20
        mock_reader.return_value.pages = [MagicMock(), MagicMock()]

        from pathlib import Path
        result = service._try_pdfminer(Path(str(fake_pdf)))
        assert result['success'] is True
        assert result['method'] == 'pdfminer'

    @pytest.mark.unit
    @patch('apps.documents.services.document_converter.extract_text')
    def test_try_pdfminer_failure(self, mock_extract, service, tmp_path):
        """Test _try_pdfminer when extraction fails."""
        fake_pdf = tmp_path / "doc.pdf"
        fake_pdf.write_bytes(b"%PDF fake")
        mock_extract.side_effect = Exception("pdfminer error")

        from pathlib import Path
        result = service._try_pdfminer(Path(str(fake_pdf)))
        assert result['success'] is False

    @pytest.mark.unit
    @patch('apps.documents.services.document_converter.PdfReader')
    def test_try_pypdf2_success(self, mock_reader_cls, service, tmp_path):
        """Test _try_pypdf2 internal method directly."""
        fake_pdf = tmp_path / "doc.pdf"
        fake_pdf.write_bytes(b"%PDF fake")

        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Page text content"
        mock_reader = MagicMock()
        mock_reader.pages = [mock_page, mock_page]
        mock_reader_cls.return_value = mock_reader

        from pathlib import Path
        result = service._try_pypdf2(Path(str(fake_pdf)))
        assert result['success'] is True
        assert result['method'] == 'pypdf2'

    @pytest.mark.unit
    @patch('apps.documents.services.document_converter.PdfReader')
    def test_try_pypdf2_failure(self, mock_reader_cls, service, tmp_path):
        fake_pdf = tmp_path / "doc.pdf"
        fake_pdf.write_bytes(b"%PDF fake")
        mock_reader_cls.side_effect = Exception("pypdf2 error")

        from pathlib import Path
        result = service._try_pypdf2(Path(str(fake_pdf)))
        assert result['success'] is False

    @pytest.mark.unit
    @patch('apps.documents.services.document_converter.pdfplumber')
    @patch('apps.documents.services.document_converter.extract_text')
    @patch('apps.documents.services.document_converter.PdfReader')
    def test_convert_pdf_to_text_auto_uses_pdfplumber(
        self, mock_reader, mock_extract, mock_plumber, service, tmp_path
    ):
        """Test auto strategy: pdfplumber returns enough text, so it's used."""
        fake_pdf = tmp_path / "doc.pdf"
        fake_pdf.write_bytes(b"%PDF fake")

        mock_page = MagicMock()
        mock_page.extract_text.return_value = "x" * 200
        mock_pdf_ctx = MagicMock()
        mock_pdf_ctx.__enter__ = MagicMock(return_value=mock_pdf_ctx)
        mock_pdf_ctx.__exit__ = MagicMock(return_value=False)
        mock_pdf_ctx.pages = [mock_page]
        mock_plumber.open.return_value = mock_pdf_ctx

        result = service.convert_pdf_to_text(str(fake_pdf), strategy='auto')
        assert result['success'] is True
        assert result['method'] == 'pdfplumber'

    @pytest.mark.unit
    @patch('apps.documents.services.document_converter.PdfReader')
    def test_validate_pdf_success(self, mock_reader_cls, service, tmp_path):
        """Test validate_pdf on a valid file."""
        fake_pdf = tmp_path / "doc.pdf"
        fake_pdf.write_bytes(b"%PDF fake")
        mock_reader = MagicMock()
        mock_reader.pages = [MagicMock(), MagicMock()]
        mock_reader_cls.return_value = mock_reader

        result = service.validate_pdf(str(fake_pdf))
        assert result['valid'] is True
        assert result['page_count'] == 2


# ===== TextPreprocessorService extended coverage =====

class TestTextPreprocessorServiceExtended:

    @pytest.fixture
    def service(self):
        return TextPreprocessorService()

    @pytest.mark.unit
    def test_tokenize_words(self, service):
        tokens = service.tokenize_words("hola mundo texto")
        assert isinstance(tokens, list)
        assert len(tokens) > 0

    @pytest.mark.unit
    def test_tokenize_sentences(self, service):
        text = "Primera oración. Segunda oración. Tercera oración."
        sentences = service.tokenize_sentences(text)
        assert isinstance(sentences, list)
        assert len(sentences) >= 1

    @pytest.mark.unit
    def test_remove_stopwords(self, service):
        tokens = ['este', 'texto', 'importante', 'de', 'la']
        filtered = service.remove_stopwords(tokens)
        assert isinstance(filtered, list)
        assert 'texto' in filtered or 'importante' in filtered

    @pytest.mark.unit
    def test_apply_stemming(self, service):
        tokens = ['corriendo', 'correr', 'transformacion']
        stemmed = service.apply_stemming(tokens)
        assert isinstance(stemmed, list)
        assert len(stemmed) == len(tokens)

    @pytest.mark.unit
    def test_get_word_frequency(self, service):
        tokens = ['palabra', 'test', 'palabra', 'ejemplo', 'palabra']
        freq = service.get_word_frequency(tokens, top_n=5)
        assert isinstance(freq, dict)
        assert freq['palabra'] == 3

    @pytest.mark.unit
    def test_get_word_frequency_top_n(self, service):
        tokens = ['a', 'b', 'c', 'd', 'e', 'a', 'b', 'a']
        freq = service.get_word_frequency(tokens, top_n=2)
        assert len(freq) <= 2

    @pytest.mark.unit
    def test_get_vocabulary(self, service):
        tokens = ['palabra', 'test', 'palabra', 'ejemplo']
        vocab = service.get_vocabulary(tokens)
        assert isinstance(vocab, set)
        assert len(vocab) == 3  # unique words

    @pytest.mark.unit
    def test_preprocess_batch(self, service):
        texts = ["texto uno ejemplo", "texto dos prueba"]
        results = service.preprocess_batch(texts, remove_stopwords=False)
        assert len(results) == 2
        assert all(r['success'] is True for r in results)

    @pytest.mark.unit
    def test_preprocess_batch_with_empty(self, service):
        texts = ["texto válido para procesar", ""]
        results = service.preprocess_batch(texts)
        assert len(results) == 2
        assert results[0]['success'] is True
        assert results[1]['success'] is False

    @pytest.mark.unit
    def test_get_statistics(self, service):
        text = "Este es un texto de prueba con varias palabras."
        stats = service.get_statistics(text)
        assert 'char_count' in stats
        assert 'word_count' in stats
        assert 'sentence_count' in stats
        assert 'avg_word_length' in stats
        assert stats['char_count'] == len(text)

    @pytest.mark.unit
    def test_preprocess_no_lowercase(self, service):
        text = "Texto Con Mayúsculas"
        result = service.preprocess(text, lowercase=False, remove_stopwords=False,
                                    remove_punctuation=False, min_word_length=1)
        assert result['success'] is True
        tokens_joined = ' '.join(result['tokens'])
        assert 'Texto' in tokens_joined or 'Con' in tokens_joined


# ===== TripleLayerCacheService extended coverage =====

class TestTripleLayerCacheService:

    @pytest.fixture
    def service(self):
        return TripleLayerCacheService()

    @pytest.mark.unit
    def test_generate_config_hash_deterministic(self, service):
        config = {'max_features': 100, 'min_df': 1, 'max_df': 1.0}
        h1 = service.generate_config_hash(config)
        h2 = service.generate_config_hash(config)
        assert h1 == h2

    @pytest.mark.unit
    def test_generate_config_hash_is_string(self, service):
        config = {'key': 'value'}
        h = service.generate_config_hash(config)
        assert isinstance(h, str)
        assert len(h) == 32  # MD5 hex digest

    @pytest.mark.unit
    def test_generate_config_hash_different_configs(self, service):
        h1 = service.generate_config_hash({'a': 1})
        h2 = service.generate_config_hash({'a': 2})
        assert h1 != h2

    @pytest.mark.unit
    def test_generate_config_hash_order_independent(self, service):
        h1 = service.generate_config_hash({'a': 1, 'b': 2})
        h2 = service.generate_config_hash({'b': 2, 'a': 1})
        assert h1 == h2  # sort_keys=True

    @pytest.mark.unit
    def test_get_returns_none_for_missing_key(self, service):
        result = service.get('test_ns', 'definitely_not_existing_key_xyz_abc')
        assert result is None

    @pytest.mark.unit
    def test_set_and_get_roundtrip(self, service):
        if not service.redis_enabled:
            pytest.skip("Cache not configured")
        service.set('test_ns', 'roundtrip_key', {'data': 42})
        result = service.get('test_ns', 'roundtrip_key')
        assert result == {'data': 42}

    @pytest.mark.unit
    def test_delete_existing_key(self, service):
        if not service.redis_enabled:
            pytest.skip("Cache not configured")
        service.set('test_ns', 'del_key', 'value')
        deleted = service.delete('test_ns:del_key')
        assert isinstance(deleted, bool)

    @pytest.mark.unit
    def test_delete_nonexistent_key(self, service):
        result = service.delete('nonexistent_namespace:nonexistent_key')
        assert isinstance(result, bool)

    @pytest.mark.unit
    def test_clear(self, service):
        result = service.clear()
        assert isinstance(result, bool)

    @pytest.mark.unit
    def test_get_or_set(self, service):
        if not service.redis_enabled:
            pytest.skip("Cache not configured")
        called = []

        def compute():
            called.append(1)
            return 'computed_value'
        result1 = service.get_or_set('test_ns', 'getorset_key', compute)
        result2 = service.get_or_set('test_ns', 'getorset_key', compute)
        assert result1 == 'computed_value'
        assert result2 == 'computed_value'

    @pytest.mark.unit
    def test_get_single_key_arg(self, service):
        """Test get() with a single positional argument (old API)"""
        result = service.get('some_single_key')
        assert result is None

    @pytest.mark.unit
    def test_set_returns_bool(self, service):
        result = service.set('test_ns', 'bool_key', 'value')
        assert isinstance(result, bool)
