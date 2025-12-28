"""
Unit Tests for Analysis Use Cases

Tests for GenerateBowUseCase, CalculateTfidfUseCase, and related use cases.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from apps.analysis.use_cases.generate_bow import GenerateBowUseCase
from apps.analysis.use_cases.calculate_tfidf import CalculateTfidfUseCase


# ===== GenerateBowUseCase Tests =====

@pytest.mark.unit
class TestGenerateBowUseCase:
    """Tests for GenerateBowUseCase"""

    @pytest.fixture
    def mock_documents(self):
        """Create mock documents"""
        docs = []
        for i in range(5):
            doc = Mock()
            doc.id = i + 1
            doc.preprocessed_text = f"word{i} word{i} common_word"
            docs.append(doc)
        return docs

    @pytest.fixture
    def use_case(self):
        """Create use case instance"""
        return GenerateBowUseCase()

    @patch('apps.analysis.use_cases.generate_bow.Document.objects.filter')
    def test_generate_bow_basic(self, mock_filter, use_case, mock_documents):
        """Test basic BoW generation"""
        mock_filter.return_value.exclude.return_value = mock_documents

        result = use_case.execute(
            document_ids=None,
            max_features=100,
            min_df=1,
            max_df=1.0,
            use_cache=False
        )

        assert result['success'] is True
        assert 'document_count' in result
        assert 'vocabulary_size' in result
        assert 'matrix_shape' in result
        assert 'sparsity' in result

    @patch('apps.analysis.use_cases.generate_bow.Document.objects.filter')
    def test_generate_bow_no_documents(self, mock_filter, use_case):
        """Test BoW generation with no documents"""
        mock_filter.return_value.exclude.return_value = []

        result = use_case.execute()

        assert result['success'] is False
        assert 'error' in result
        assert 'no documents' in result['error'].lower()

    @patch('apps.analysis.use_cases.generate_bow.Document.objects.filter')
    def test_generate_bow_with_cache(self, mock_filter, use_case, mock_documents):
        """Test BoW generation with cache enabled"""
        mock_filter.return_value.exclude.return_value = mock_documents

        result = use_case.execute(use_cache=True)

        assert result['success'] is True
        # First execution shouldn't have cache
        # assert result.get('cached') is False

    @patch('apps.analysis.use_cases.generate_bow.Document.objects.filter')
    def test_generate_bow_vocabulary_size(self, mock_filter, use_case, mock_documents):
        """Test that vocabulary size is correct"""
        mock_filter.return_value.exclude.return_value = mock_documents

        result = use_case.execute(max_features=10)

        assert result['success'] is True
        assert result['vocabulary_size'] <= 10  # Should not exceed max_features


# ===== CalculateTfidfUseCase Tests =====

@pytest.mark.unit
class TestCalculateTfidfUseCase:
    """Tests for CalculateTfidfUseCase"""

    @pytest.fixture
    def mock_documents(self):
        """Create mock documents"""
        docs = []
        texts = [
            "machine learning artificial intelligence",
            "deep learning neural networks",
            "natural language processing nlp",
            "computer vision image recognition",
            "data science machine learning"
        ]
        for i, text in enumerate(texts):
            doc = Mock()
            doc.id = i + 1
            doc.preprocessed_text = text
            docs.append(doc)
        return docs

    @pytest.fixture
    def use_case(self):
        """Create use case instance"""
        return CalculateTfidfUseCase()

    @patch('apps.analysis.use_cases.calculate_tfidf.Document.objects.filter')
    def test_calculate_tfidf_basic(self, mock_filter, use_case, mock_documents):
        """Test basic TF-IDF calculation"""
        mock_filter.return_value.exclude.return_value = mock_documents

        result = use_case.execute(
            document_ids=None,
            max_features=100,
            norm='l2',
            use_idf=True,
            use_cache=False
        )

        assert result['success'] is True
        assert 'document_count' in result
        assert 'vocabulary_size' in result
        assert 'matrix_shape' in result
        assert 'avg_tfidf_score' in result

    @patch('apps.analysis.use_cases.calculate_tfidf.Document.objects.filter')
    def test_calculate_tfidf_no_documents(self, mock_filter, use_case):
        """Test TF-IDF calculation with no documents"""
        mock_filter.return_value.exclude.return_value = []

        result = use_case.execute()

        assert result['success'] is False
        assert 'error' in result

    @patch('apps.analysis.use_cases.calculate_tfidf.Document.objects.filter')
    def test_calculate_tfidf_with_normalization(self, mock_filter, use_case, mock_documents):
        """Test TF-IDF with L2 normalization"""
        mock_filter.return_value.exclude.return_value = mock_documents

        result = use_case.execute(norm='l2', use_idf=True)

        assert result['success'] is True
        # Avg TF-IDF should be reasonable
        assert 0 <= result['avg_tfidf_score'] <= 1

    @patch('apps.analysis.use_cases.calculate_tfidf.Document.objects.filter')
    def test_calculate_tfidf_without_idf(self, mock_filter, use_case, mock_documents):
        """Test TF-IDF without IDF component (just TF)"""
        mock_filter.return_value.exclude.return_value = mock_documents

        result = use_case.execute(use_idf=False)

        assert result['success'] is True
        # Should still compute successfully


# ===== Integration Tests for Analysis =====

@pytest.mark.integration
class TestAnalysisIntegration:
    """Integration tests for analysis use cases"""

    @pytest.fixture
    def sample_documents(self, db):
        """Create sample documents in database"""
        from apps.documents.models import Document

        docs = []
        texts = [
            "transformación digital educación superior tecnología",
            "innovación pedagógica metodologías activas aprendizaje",
            "plataformas virtuales educación distancia online",
            "inteligencia artificial machine learning educación",
            "big data analítica educativa datos estudiantes"
        ]

        for i, text in enumerate(texts):
            doc = Document.objects.create(
                drive_file_id=f"test_file_{i}",
                filename=f"test_document_{i}.pdf",
                language_code="es",
                preprocessed_text=text,
                status="completed"
            )
            docs.append(doc)

        return docs

    @pytest.mark.django_db
    def test_bow_tfidf_pipeline(self, sample_documents):
        """Test BoW -> TF-IDF pipeline"""
        # Generate BoW
        bow_uc = GenerateBowUseCase()
        bow_result = bow_uc.execute(max_features=50, use_cache=False)

        assert bow_result['success'] is True
        assert bow_result['document_count'] == 5

        # Calculate TF-IDF
        tfidf_uc = CalculateTfidfUseCase()
        tfidf_result = tfidf_uc.execute(max_features=50, use_cache=False)

        assert tfidf_result['success'] is True
        assert tfidf_result['document_count'] == 5

        # Vocabulary sizes should be similar
        assert bow_result['vocabulary_size'] > 0
        assert tfidf_result['vocabulary_size'] > 0


# ===== Parametrized Tests =====

@pytest.mark.unit
@pytest.mark.parametrize("max_features,min_df,max_df", [
    (100, 1, 1.0),
    (500, 2, 0.95),
    (1000, 3, 0.90),
    (5000, 1, 1.0),
])
def test_bow_with_different_params(max_features, min_df, max_df):
    """Test BoW generation with different parameter combinations"""
    use_case = GenerateBowUseCase()

    mock_docs = []
    for i in range(10):
        doc = Mock()
        doc.id = i + 1
        doc.preprocessed_text = f"word{i % 5} common_word test_{i % 3}"
        mock_docs.append(doc)

    with patch('apps.analysis.use_cases.generate_bow.Document.objects.filter') as mock_filter:
        mock_filter.return_value.exclude.return_value = mock_docs

        result = use_case.execute(
            max_features=max_features,
            min_df=min_df,
            max_df=max_df,
            use_cache=False
        )

        assert result['success'] is True
        assert result['vocabulary_size'] <= max_features


@pytest.mark.unit
@pytest.mark.parametrize("norm,use_idf,sublinear_tf", [
    ('l1', True, False),
    ('l2', True, False),
    ('l2', False, False),
    ('l2', True, True),
])
def test_tfidf_with_different_params(norm, use_idf, sublinear_tf):
    """Test TF-IDF calculation with different parameter combinations"""
    use_case = CalculateTfidfUseCase()

    mock_docs = []
    for i in range(5):
        doc = Mock()
        doc.id = i + 1
        doc.preprocessed_text = f"term1 term2 term{i} specific{i}"
        mock_docs.append(doc)

    with patch('apps.analysis.use_cases.calculate_tfidf.Document.objects.filter') as mock_filter:
        mock_filter.return_value.exclude.return_value = mock_docs

        result = use_case.execute(
            norm=norm,
            use_idf=use_idf,
            sublinear_tf=sublinear_tf,
            use_cache=False
        )

        assert result['success'] is True
