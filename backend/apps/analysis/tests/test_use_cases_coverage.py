"""
Extended tests to improve coverage of generate_bow and calculate_tfidf use cases.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock


# ===== GenerateBowUseCase additional paths =====

@pytest.mark.unit
class TestGenerateBowUseCaseExtended:

    @pytest.fixture
    def mock_documents_large(self):
        docs = []
        for i in range(10):
            doc = Mock()
            doc.id = i + 1
            doc.preprocessed_text = f"word{i % 3} keyword{i % 5} common_term extra{i}"
            docs.append(doc)
        return docs

    @patch('apps.analysis.use_cases.generate_bow.Document.objects.filter')
    def test_execute_with_document_ids(self, mock_filter, mock_documents_large):
        from apps.analysis.use_cases.generate_bow import GenerateBowUseCase
        mock_filter.return_value = mock_documents_large
        use_case = GenerateBowUseCase()
        result = use_case.execute(document_ids=[1, 2, 3], use_cache=False)
        assert 'success' in result

    @patch('apps.analysis.use_cases.generate_bow.Document.objects.filter')
    def test_execute_no_documents_with_ids(self, mock_filter):
        from apps.analysis.use_cases.generate_bow import GenerateBowUseCase
        mock_filter.return_value = []
        use_case = GenerateBowUseCase()
        result = use_case.execute(document_ids=[999], use_cache=False)
        assert result['success'] is False

    @patch('apps.analysis.use_cases.generate_bow.Document.objects.filter')
    def test_execute_with_ngram_range(self, mock_filter, mock_documents_large):
        from apps.analysis.use_cases.generate_bow import GenerateBowUseCase
        mock_filter.return_value.exclude.return_value = mock_documents_large
        use_case = GenerateBowUseCase()
        result = use_case.execute(ngram_range=(1, 2), use_cache=False)
        assert result['success'] is True

    @patch('apps.analysis.use_cases.generate_bow.Document.objects.filter')
    def test_execute_top_terms_present(self, mock_filter, mock_documents_large):
        from apps.analysis.use_cases.generate_bow import GenerateBowUseCase
        mock_filter.return_value.exclude.return_value = mock_documents_large
        use_case = GenerateBowUseCase()
        result = use_case.execute(use_cache=False)
        assert result['success'] is True
        assert 'top_terms' in result
        assert 'config' in result

    @patch('apps.analysis.use_cases.generate_bow.Document.objects.filter')
    def test_execute_config_returned(self, mock_filter, mock_documents_large):
        from apps.analysis.use_cases.generate_bow import GenerateBowUseCase
        mock_filter.return_value.exclude.return_value = mock_documents_large
        use_case = GenerateBowUseCase()
        result = use_case.execute(max_features=200, min_df=1, max_df=1.0, use_cache=False)
        assert result['success'] is True
        assert result['config']['max_features'] == 200


# ===== CalculateTfidfUseCase additional paths =====

@pytest.mark.unit
class TestCalculateTfidfUseCaseExtended:

    @pytest.fixture
    def mock_documents_large(self):
        docs = []
        texts = [
            "transformacion digital tecnologia innovacion educacion",
            "aprendizaje plataformas virtuales metodologia pedagogia",
            "analisis datos estadistica computacion algoritmo",
            "inteligencia artificial aprendizaje automatico redes neuronales",
            "universidad investigacion ciencia conocimiento academico",
        ]
        for i, text in enumerate(texts):
            doc = Mock()
            doc.id = i + 1
            doc.preprocessed_text = text
            docs.append(doc)
        return docs

    @patch('apps.analysis.use_cases.calculate_tfidf.Document.objects.filter')
    def test_execute_returns_top_terms(self, mock_filter, mock_documents_large):
        from apps.analysis.use_cases.calculate_tfidf import CalculateTfidfUseCase
        mock_filter.return_value.exclude.return_value = mock_documents_large
        use_case = CalculateTfidfUseCase()
        result = use_case.execute(use_cache=False)
        assert result['success'] is True
        assert 'top_terms' in result
        assert 'config' in result

    @patch('apps.analysis.use_cases.calculate_tfidf.Document.objects.filter')
    def test_execute_with_sublinear_tf(self, mock_filter, mock_documents_large):
        from apps.analysis.use_cases.calculate_tfidf import CalculateTfidfUseCase
        mock_filter.return_value.exclude.return_value = mock_documents_large
        use_case = CalculateTfidfUseCase()
        result = use_case.execute(sublinear_tf=True, use_cache=False)
        assert result['success'] is True

    @patch('apps.analysis.use_cases.calculate_tfidf.Document.objects.filter')
    def test_execute_config_in_result(self, mock_filter, mock_documents_large):
        from apps.analysis.use_cases.calculate_tfidf import CalculateTfidfUseCase
        mock_filter.return_value.exclude.return_value = mock_documents_large
        use_case = CalculateTfidfUseCase()
        result = use_case.execute(max_features=300, norm='l1', use_cache=False)
        assert result['config']['max_features'] == 300
        assert result['config']['norm'] == 'l1'

    @patch('apps.analysis.use_cases.calculate_tfidf.Document.objects.filter')
    def test_execute_with_document_ids_no_docs(self, mock_filter):
        from apps.analysis.use_cases.calculate_tfidf import CalculateTfidfUseCase
        mock_filter.return_value = []
        use_case = CalculateTfidfUseCase()
        result = use_case.execute(document_ids=[999], use_cache=False)
        assert result['success'] is False

    @patch('apps.analysis.use_cases.calculate_tfidf.Document.objects.filter')
    def test_avg_tfidf_score_bounded(self, mock_filter, mock_documents_large):
        from apps.analysis.use_cases.calculate_tfidf import CalculateTfidfUseCase
        mock_filter.return_value.exclude.return_value = mock_documents_large
        use_case = CalculateTfidfUseCase()
        result = use_case.execute(norm='l2', use_idf=True, use_cache=False)
        assert result['success'] is True
        assert 0.0 <= result['avg_tfidf_score'] <= 1.0
