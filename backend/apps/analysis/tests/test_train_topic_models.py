"""
Unit tests for TrainTopicModelsUseCase.

Covers: execute() for lda/nmf/lsa/plsa, cache hit, no docs,
unknown model type, compare_models().
"""

import pytest
from unittest.mock import Mock, patch, MagicMock


# ── Helpers ────────────────────────────────────────────────────────────────

def _make_topic_result(n=3):
    """Return a fake service result with n topics."""
    return {
        'topics': [
            {'topic_id': i, 'top_words': [f'w{i}a', f'w{i}b'], 'coherence_score': 0.3}
            for i in range(n)
        ],
        'perplexity': 100.0,
        'coherence': 0.35,
        'reconstruction_error': 0.05,
        'explained_variance': 0.60,
    }


def _make_docs(n=4):
    docs = []
    for i in range(n):
        d = Mock()
        d.id = i + 1
        d.preprocessed_text = f"digital transformation technology innovation factor{i}"
        docs.append(d)
    return docs


# ── Tests ──────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestTrainTopicModelsUseCase:

    @pytest.fixture
    def mock_topic_service(self):
        svc = Mock()
        svc.n_topics = 10
        tr = _make_topic_result()
        svc.train_lda.return_value = tr
        svc.train_nmf.return_value = tr
        svc.train_lsa.return_value = tr
        svc.train_plsa.return_value = tr
        return svc

    @pytest.fixture
    def mock_cache_service(self):
        svc = Mock()
        svc.generate_config_hash.return_value = 'abc123'
        svc.get.return_value = None  # cache miss by default
        return svc

    @pytest.fixture
    def use_case(self, mock_topic_service, mock_cache_service):
        from apps.analysis.use_cases.train_topic_models import TrainTopicModelsUseCase
        return TrainTopicModelsUseCase(
            topic_service=mock_topic_service,
            cache_service=mock_cache_service,
        )

    # ── cache hit ──────────────────────────────────────────────────────────

    def test_cache_hit_returns_cached_result(self, use_case, mock_cache_service):
        mock_cache_service.get.return_value = {
            'cache_source': 'redis',
            'data': {'topics': [], 'model_type': 'lda', 'n_topics': 10},
        }

        result = use_case.execute(model_type='lda', n_topics=10, use_cache=True)

        assert result['success'] is True
        assert result['cached'] is True
        assert result['cache_source'] == 'redis'

    # ── no documents ──────────────────────────────────────────────────────

    @patch('apps.analysis.use_cases.train_topic_models.DatasetFile.objects.filter')
    def test_no_documents_returns_error(self, mock_filter, use_case):
        qs = Mock()
        qs.exists.return_value = False
        mock_filter.return_value = qs

        result = use_case.execute(model_type='lda', use_cache=False)

        assert result['success'] is False
        assert 'No preprocessed documents' in result['error']

    # ── unknown model type ────────────────────────────────────────────────

    @patch('apps.analysis.use_cases.train_topic_models.DatasetFile.objects.filter')
    def test_unknown_model_type_returns_error(self, mock_filter, use_case):
        docs = _make_docs()
        qs = Mock()
        qs.exists.return_value = True
        qs.count.return_value = len(docs)
        qs.__iter__ = Mock(return_value=iter(docs))
        mock_filter.return_value = qs

        result = use_case.execute(model_type='bert', use_cache=False)

        assert result['success'] is False
        assert 'Unknown model type' in result['error']

    # ── LDA ───────────────────────────────────────────────────────────────

    @patch('apps.analysis.use_cases.train_topic_models.Topic.objects.filter')
    @patch('apps.analysis.use_cases.train_topic_models.Topic.objects.create')
    @patch('apps.analysis.use_cases.train_topic_models.DatasetFile.objects.filter')
    @patch('apps.analysis.services.tfidf_service.TfidfService')
    def test_execute_lda_success(
        self, MockTfidf, mock_doc_filter, mock_create, mock_topic_filter, use_case
    ):
        _patch_tfidf_and_docs(MockTfidf, mock_doc_filter)
        mock_topic_filter.return_value.delete.return_value = None

        result = use_case.execute(model_type='lda', n_topics=5, use_cache=False)

        assert result['success'] is True
        assert result['cached'] is False
        assert result['model_type'] == 'lda'
        assert 'topics' in result

    # ── NMF ───────────────────────────────────────────────────────────────

    @patch('apps.analysis.use_cases.train_topic_models.Topic.objects.filter')
    @patch('apps.analysis.use_cases.train_topic_models.Topic.objects.create')
    @patch('apps.analysis.use_cases.train_topic_models.DatasetFile.objects.filter')
    @patch('apps.analysis.services.tfidf_service.TfidfService')
    def test_execute_nmf_success(
        self, MockTfidf, mock_doc_filter, mock_create, mock_topic_filter, use_case
    ):
        _patch_tfidf_and_docs(MockTfidf, mock_doc_filter)
        mock_topic_filter.return_value.delete.return_value = None

        result = use_case.execute(model_type='nmf', n_topics=5, use_cache=False)

        assert result['success'] is True
        assert result['model_type'] == 'nmf'

    # ── LSA ───────────────────────────────────────────────────────────────

    @patch('apps.analysis.use_cases.train_topic_models.Topic.objects.filter')
    @patch('apps.analysis.use_cases.train_topic_models.Topic.objects.create')
    @patch('apps.analysis.use_cases.train_topic_models.DatasetFile.objects.filter')
    @patch('apps.analysis.services.tfidf_service.TfidfService')
    def test_execute_lsa_success(
        self, MockTfidf, mock_doc_filter, mock_create, mock_topic_filter, use_case
    ):
        _patch_tfidf_and_docs(MockTfidf, mock_doc_filter)
        mock_topic_filter.return_value.delete.return_value = None

        result = use_case.execute(model_type='lsa', n_topics=5, use_cache=False)

        assert result['success'] is True
        assert result['model_type'] == 'lsa'

    # ── pLSA ──────────────────────────────────────────────────────────────

    @patch('apps.analysis.use_cases.train_topic_models.Topic.objects.filter')
    @patch('apps.analysis.use_cases.train_topic_models.Topic.objects.create')
    @patch('apps.analysis.use_cases.train_topic_models.DatasetFile.objects.filter')
    def test_execute_plsa_success(
        self, mock_doc_filter, mock_create, mock_topic_filter, use_case
    ):
        docs = _make_docs()
        qs = Mock()
        qs.exists.return_value = True
        qs.count.return_value = len(docs)
        qs.__iter__ = Mock(return_value=iter(docs))
        mock_doc_filter.return_value = qs
        mock_topic_filter.return_value.delete.return_value = None

        result = use_case.execute(model_type='plsa', n_topics=5, use_cache=False)

        assert result['success'] is True
        assert result['model_type'] == 'plsa'

    # ── document_ids filter ───────────────────────────────────────────────

    @patch('apps.analysis.use_cases.train_topic_models.Topic.objects.filter')
    @patch('apps.analysis.use_cases.train_topic_models.Topic.objects.create')
    @patch('apps.analysis.use_cases.train_topic_models.DatasetFile.objects.filter')
    def test_document_ids_filter_applied(
        self, mock_doc_filter, mock_create, mock_topic_filter, use_case
    ):
        docs = _make_docs(2)
        qs = Mock()
        qs.exists.return_value = True
        qs.count.return_value = 2
        qs.__iter__ = Mock(return_value=iter(docs))
        mock_doc_filter.return_value = qs
        mock_topic_filter.return_value.delete.return_value = None

        use_case.execute(model_type='plsa', document_ids=[1, 2], use_cache=False)

        mock_doc_filter.assert_called_once_with(id__in=[1, 2])

    # ── result is cached after training ──────────────────────────────────

    @patch('apps.analysis.use_cases.train_topic_models.Topic.objects.filter')
    @patch('apps.analysis.use_cases.train_topic_models.Topic.objects.create')
    @patch('apps.analysis.use_cases.train_topic_models.DatasetFile.objects.filter')
    def test_result_saved_to_cache(
        self, mock_doc_filter, mock_create, mock_topic_filter,
        use_case, mock_cache_service
    ):
        docs = _make_docs(2)
        qs = Mock()
        qs.exists.return_value = True
        qs.count.return_value = 2
        qs.__iter__ = Mock(return_value=iter(docs))
        mock_doc_filter.return_value = qs
        mock_topic_filter.return_value.delete.return_value = None

        use_case.execute(model_type='plsa', use_cache=True)

        mock_cache_service.set.assert_called_once()
        args = mock_cache_service.set.call_args[0]
        assert args[0] == 'topic_modeling'

    # ── compare_models ────────────────────────────────────────────────────

    def test_compare_models_calls_all_model_types(self, use_case):
        executed = []

        original_execute = use_case.execute

        def spy_execute(model_type='lda', **kwargs):
            executed.append(model_type)
            return {'success': True, 'n_topics': 10, 'coherence': 0.3, 'topics': []}

        use_case.execute = spy_execute

        result = use_case.compare_models(n_topics=10)

        assert set(executed) == {'lda', 'nmf', 'lsa', 'plsa'}
        assert result['success'] is True
        assert 'best_model' in result

    def test_compare_models_best_model_is_highest_coherence(self, use_case):
        coherences = {'lda': 0.1, 'nmf': 0.9, 'lsa': 0.4, 'plsa': 0.3}

        def fake_execute(model_type='lda', **kwargs):
            return {'success': True, 'n_topics': 10, 'coherence': coherences[model_type], 'topics': []}

        use_case.execute = fake_execute

        result = use_case.compare_models()

        assert result['best_model'] == 'nmf'

    # ── exception handling ────────────────────────────────────────────────

    @patch('apps.analysis.use_cases.train_topic_models.DatasetFile.objects.filter')
    def test_exception_returns_error(self, mock_filter, use_case):
        mock_filter.side_effect = RuntimeError('DB error')

        result = use_case.execute(model_type='lda', use_cache=False)

        assert result['success'] is False
        assert 'DB error' in result['error']


# ── Helper (module-level) ───────────────────────────────────────────────────

def _patch_tfidf_and_docs(MockTfidf, mock_doc_filter):
    """Wire up TfidfService mock and a valid document queryset."""
    tfidf_instance = Mock()
    tfidf_instance.fit_transform.return_value = {'matrix': Mock()}
    tfidf_instance.get_feature_names.return_value = ['word1', 'word2']
    MockTfidf.return_value = tfidf_instance

    docs = _make_docs()
    qs = Mock()
    qs.exists.return_value = True
    qs.count.return_value = len(docs)
    qs.__iter__ = Mock(return_value=iter(docs))
    mock_doc_filter.return_value = qs
