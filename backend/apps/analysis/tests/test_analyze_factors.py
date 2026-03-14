"""
Unit tests for AnalyzeFactorsUseCase.

Covers: execute() with no factors, no documents, success path,
cache hit, get_document_factors(), get_factor_statistics().
"""

import pytest
from unittest.mock import Mock, patch, call


# ── Helpers ────────────────────────────────────────────────────────────────

def _make_factors(n=3):
    return [
        {'id': i + 1, 'name': f'Factor{i}', 'category': 'tech', 'keywords': ['kw1', 'kw2']}
        for i in range(n)
    ]


def _make_docs(n=3):
    docs = []
    for i in range(n):
        d = Mock()
        d.id = i + 1
        d.preprocessed_text = f"technology digital transformation factor{i}"
        docs.append(d)
    return docs


def _make_corpus_result(doc_ids):
    doc_results = [
        {
            'document_id': did,
            'factors': [{'factor_id': 1, 'mention_count': 5, 'relevance_score': 0.8}],
        }
        for did in doc_ids
    ]
    global_stats = [{'factor_id': 1, 'global_frequency': 10, 'relevance_score': 0.75}]
    return {'document_results': doc_results, 'global_statistics': global_stats}


# ── Tests ──────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestAnalyzeFactorsUseCase:

    @pytest.fixture
    def mock_analyzer(self):
        svc = Mock()
        svc.get_category_statistics.return_value = {'tech': []}
        svc.get_factor_co_occurrence.return_value = []
        svc.consolidate_results.return_value = []
        return svc

    @pytest.fixture
    def mock_cache(self):
        svc = Mock()
        svc.generate_config_hash.return_value = 'hash42'
        svc.get.return_value = None
        return svc

    @pytest.fixture
    def use_case(self, mock_analyzer, mock_cache):
        from apps.analysis.use_cases.analyze_factors import AnalyzeFactorsUseCase
        return AnalyzeFactorsUseCase(
            analyzer_service=mock_analyzer,
            cache_service=mock_cache,
        )

    # ── cache hit ──────────────────────────────────────────────────────────

    def test_cache_hit_returns_cached(self, use_case, mock_cache):
        mock_cache.get.return_value = {
            'cache_source': 'redis',
            'data': {'global_statistics': [], 'factor_count': 0},
        }

        result = use_case.execute(use_cache=True)

        assert result['success'] is True
        assert result['cached'] is True
        assert result['cache_source'] == 'redis'

    # ── no factors ────────────────────────────────────────────────────────

    @patch('apps.analysis.use_cases.analyze_factors.Factor.objects.all')
    def test_no_factors_returns_error(self, mock_all, use_case):
        mock_all.return_value.values.return_value = []

        result = use_case.execute(use_cache=False)

        assert result['success'] is False
        assert 'No factors found' in result['error']

    # ── no documents ──────────────────────────────────────────────────────

    @patch('apps.analysis.use_cases.analyze_factors.Document.objects.filter')
    @patch('apps.analysis.use_cases.analyze_factors.Factor.objects.all')
    def test_no_documents_returns_error(self, mock_all, mock_filter, use_case):
        mock_all.return_value.values.return_value = _make_factors()
        qs = Mock()
        qs.exists.return_value = False
        mock_filter.return_value = qs

        result = use_case.execute(use_cache=False)

        assert result['success'] is False
        assert 'No preprocessed documents' in result['error']

    # ── success path ──────────────────────────────────────────────────────

    @patch('apps.analysis.use_cases.analyze_factors.DocumentFactor.objects.filter')
    @patch('apps.analysis.use_cases.analyze_factors.DocumentFactor.objects.bulk_create')
    @patch('apps.analysis.use_cases.analyze_factors.Factor.objects.filter')
    @patch('apps.analysis.use_cases.analyze_factors.Document.objects.filter')
    @patch('apps.analysis.use_cases.analyze_factors.Factor.objects.all')
    def test_execute_success(
        self, mock_all, mock_doc_filter, mock_factor_filter,
        mock_bulk_create, mock_df_filter, use_case, mock_analyzer
    ):
        factors = _make_factors()
        mock_all.return_value.values.return_value = factors

        docs = _make_docs()
        doc_qs = Mock()
        doc_qs.exists.return_value = True
        doc_qs.count.return_value = len(docs)
        doc_qs.__iter__ = Mock(return_value=iter(docs))
        mock_doc_filter.return_value = doc_qs

        corpus_result = _make_corpus_result([d.id for d in docs])
        mock_analyzer.analyze_corpus.return_value = corpus_result

        # Factor.objects.filter().update() for statistics update
        mock_factor_filter.return_value.update.return_value = 1
        # DocumentFactor.objects.filter().delete() for cleanup
        mock_df_filter.return_value.delete.return_value = None

        result = use_case.execute(use_cache=False)

        assert result['success'] is True
        assert result['cached'] is False
        assert result['document_count'] == 3
        assert result['factor_count'] == 3
        mock_analyzer.load_factors.assert_called_once_with(factors)
        mock_analyzer.analyze_corpus.assert_called_once()

    # ── document_ids filter ───────────────────────────────────────────────

    @patch('apps.analysis.use_cases.analyze_factors.DocumentFactor.objects.filter')
    @patch('apps.analysis.use_cases.analyze_factors.DocumentFactor.objects.bulk_create')
    @patch('apps.analysis.use_cases.analyze_factors.Factor.objects.filter')
    @patch('apps.analysis.use_cases.analyze_factors.Document.objects.filter')
    @patch('apps.analysis.use_cases.analyze_factors.Factor.objects.all')
    def test_document_ids_filter_applied(
        self, mock_all, mock_doc_filter, mock_factor_filter,
        mock_bulk_create, mock_df_filter, use_case, mock_analyzer
    ):
        mock_all.return_value.values.return_value = _make_factors(1)

        docs = _make_docs(2)
        doc_qs = Mock()
        doc_qs.exists.return_value = True
        doc_qs.count.return_value = 2
        doc_qs.__iter__ = Mock(return_value=iter(docs))
        mock_doc_filter.return_value = doc_qs

        corpus_result = _make_corpus_result([1, 2])
        mock_analyzer.analyze_corpus.return_value = corpus_result
        mock_factor_filter.return_value.update.return_value = 1
        mock_df_filter.return_value.delete.return_value = None

        use_case.execute(document_ids=[1, 2], use_cache=False)

        mock_doc_filter.assert_called_once_with(id__in=[1, 2])

    # ── get_document_factors ──────────────────────────────────────────────

    @patch('apps.analysis.use_cases.analyze_factors.DocumentFactor.objects.filter')
    @patch('apps.analysis.use_cases.analyze_factors.Document.objects.get')
    def test_get_document_factors_success(self, mock_get, mock_df_filter, use_case):
        doc = Mock()
        doc.filename = 'test.pdf'
        mock_get.return_value = doc

        df1 = Mock()
        df1.factor.id = 1
        df1.factor.name = 'Factor 1'
        df1.factor.category = 'tech'
        df1.mention_count = 5
        df1.relevance_score = 0.8

        # First call: .filter().select_related().order_by()[:top_n]
        first_qs = Mock()
        first_qs.exists.return_value = True
        first_qs.__iter__ = Mock(return_value=iter([df1]))
        # slice on a Mock returns the same Mock by default, so we override __getitem__
        first_qs.__getitem__ = Mock(return_value=first_qs)

        ordered = Mock()
        ordered.__getitem__ = Mock(return_value=first_qs)
        ordered.return_value = first_qs

        mock_df_filter.return_value.select_related.return_value.order_by.return_value = first_qs

        # Second call: .filter().count()
        count_qs = Mock()
        count_qs.count.return_value = 1
        mock_df_filter.side_effect = [
            mock_df_filter.return_value,  # first call (factors)
            count_qs,                      # second call (count)
        ]

        result = use_case.get_document_factors(document_id=1)

        assert result['success'] is True
        assert result['document_id'] == 1
        assert result['filename'] == 'test.pdf'

    @patch('apps.analysis.use_cases.analyze_factors.Document.objects.get')
    def test_get_document_factors_not_found(self, mock_get, use_case):
        from apps.documents.models import Document
        mock_get.side_effect = Document.DoesNotExist

        result = use_case.get_document_factors(document_id=999)

        assert result['success'] is False
        assert '999' in result['error']

    # ── get_factor_statistics ─────────────────────────────────────────────

    @patch('apps.analysis.use_cases.analyze_factors.Factor.objects.all')
    def test_get_factor_statistics_no_factors(self, mock_all, use_case):
        qs = Mock()
        qs.exists.return_value = False
        mock_all.return_value.order_by.return_value = qs

        result = use_case.get_factor_statistics()

        assert result['success'] is False
        assert 'No factors' in result['error']

    @patch('apps.analysis.use_cases.analyze_factors.Factor.objects.all')
    def test_get_factor_statistics_success(self, mock_all, use_case):
        f = Mock()
        f.id = 1
        f.name = 'Cloud'
        f.category = 'tech'
        f.global_frequency = 42
        f.relevance_score = 0.9
        f.keywords = ['cloud', 'aws']

        qs = Mock()
        qs.exists.return_value = True
        qs.count.return_value = 1
        qs.__iter__ = Mock(return_value=iter([f]))
        mock_all.return_value.order_by.return_value = qs

        result = use_case.get_factor_statistics()

        assert result['success'] is True
        assert result['total_factors'] == 1
        assert result['factors'][0]['factor_name'] == 'Cloud'
        assert 'tech' in result['by_category']

    # ── exception handling ────────────────────────────────────────────────

    @patch('apps.analysis.use_cases.analyze_factors.Factor.objects.all')
    def test_execute_exception_returns_error(self, mock_all, use_case):
        mock_all.side_effect = RuntimeError('DB explosion')

        result = use_case.execute(use_cache=False)

        assert result['success'] is False
        assert 'DB explosion' in result['error']
