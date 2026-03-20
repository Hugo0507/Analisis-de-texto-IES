"""
Unit tests for FactorEvaluationService helper methods.

These tests exercise pure computation methods without hitting the database,
providing coverage for the proxy metrics logic.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock


@pytest.mark.unit
class TestFactorEvaluationServiceHelpers:
    """Tests for FactorEvaluationService internal computation methods."""

    @pytest.fixture
    def service(self):
        from apps.analysis.services.factor_evaluation_service import FactorEvaluationService
        return FactorEvaluationService()

    # ── _compute_keyword_precision ────────────────────────────────────────────

    def test_keyword_precision_empty_mentions(self, service):
        result = service._compute_keyword_precision(
            keywords=['digital', 'transformation'],
            corpus_texts=[(1, 'digital transformation university')],
            mentions=[],
        )
        assert result == 0.0

    def test_keyword_precision_empty_keywords(self, service):
        result = service._compute_keyword_precision(
            keywords=[],
            corpus_texts=[(1, 'digital transformation university')],
            mentions=[{'document_id': 1, 'mention_count': 1, 'relevance_score': 0.8}],
        )
        assert result == 0.0

    def test_keyword_precision_single_keyword_match(self, service):
        # Only 1 keyword: can never have >=2 distinct matches
        result = service._compute_keyword_precision(
            keywords=['digital'],
            corpus_texts=[(1, 'digital systems in university education')],
            mentions=[{'document_id': 1, 'mention_count': 3, 'relevance_score': 0.9}],
        )
        assert result == 0.0

    def test_keyword_precision_multi_keyword_match(self, service):
        # Both keywords match → multi_keyword_docs = 1 / 1 = 1.0
        result = service._compute_keyword_precision(
            keywords=['digital', 'transformation'],
            corpus_texts=[(1, 'digital transformation in higher education')],
            mentions=[{'document_id': 1, 'mention_count': 2, 'relevance_score': 0.9}],
        )
        assert result == 1.0

    def test_keyword_precision_partial_match(self, service):
        # doc 1: both keywords match, doc 2: only one keyword → 1/2 = 0.5
        corpus = [
            (1, 'digital transformation university'),
            (2, 'digital systems only'),
        ]
        mentions = [
            {'document_id': 1, 'mention_count': 2, 'relevance_score': 0.9},
            {'document_id': 2, 'mention_count': 1, 'relevance_score': 0.5},
        ]
        result = service._compute_keyword_precision(
            keywords=['digital', 'transformation'],
            corpus_texts=corpus,
            mentions=mentions,
        )
        assert result == pytest.approx(0.5)

    def test_keyword_precision_doc_not_in_mentions(self, service):
        # corpus has doc 99 but mentions only reference doc 1
        corpus = [
            (1, 'digital transformation university'),
            (99, 'unrelated document content'),
        ]
        mentions = [{'document_id': 1, 'mention_count': 2, 'relevance_score': 0.9}]
        result = service._compute_keyword_precision(
            keywords=['digital', 'transformation'],
            corpus_texts=corpus,
            mentions=mentions,
        )
        # Only doc 1 evaluated (doc 99 not in mentions), both keywords match
        assert result == 1.0

    # ── _compute_factor_distinctiveness ──────────────────────────────────────

    def test_distinctiveness_no_docs(self, service):
        result = service._compute_factor_distinctiveness(
            factor_id=1,
            factor_doc_mentions={},
            doc_factor_sets={},
            docs_with_factor=0,
        )
        assert result == 0.0

    def test_distinctiveness_only_one_factor(self, service):
        # With only 1 factor total, distinctiveness = 1.0 (no others to co-occur with)
        factor_doc_mentions = {
            1: [{'document_id': 10, 'mention_count': 2, 'relevance_score': 0.8}],
        }
        doc_factor_sets = {10: {1}}
        result = service._compute_factor_distinctiveness(
            factor_id=1,
            factor_doc_mentions=factor_doc_mentions,
            doc_factor_sets=doc_factor_sets,
            docs_with_factor=1,
        )
        assert result == 1.0

    def test_distinctiveness_always_co_occurs(self, service):
        # Factor 1 always co-occurs with factor 2 → low distinctiveness
        factor_doc_mentions = {
            1: [{'document_id': 10, 'mention_count': 2, 'relevance_score': 0.8}],
            2: [{'document_id': 10, 'mention_count': 3, 'relevance_score': 0.7}],
        }
        doc_factor_sets = {10: {1, 2}}
        result = service._compute_factor_distinctiveness(
            factor_id=1,
            factor_doc_mentions=factor_doc_mentions,
            doc_factor_sets=doc_factor_sets,
            docs_with_factor=1,
        )
        # avg_co_occurring=1, total_factors-1=1 → overlap_ratio=1 → 1-1=0
        assert result == pytest.approx(0.0)

    def test_distinctiveness_never_co_occurs(self, service):
        # Factor 1 never co-occurs with factor 2
        factor_doc_mentions = {
            1: [{'document_id': 10, 'mention_count': 2, 'relevance_score': 0.8}],
            2: [{'document_id': 20, 'mention_count': 3, 'relevance_score': 0.7}],
        }
        doc_factor_sets = {10: {1}, 20: {2}}
        result = service._compute_factor_distinctiveness(
            factor_id=1,
            factor_doc_mentions=factor_doc_mentions,
            doc_factor_sets=doc_factor_sets,
            docs_with_factor=1,
        )
        assert result == pytest.approx(1.0)

    # ── _compute_keyword_coverage ─────────────────────────────────────────────

    def test_keyword_coverage_no_keywords(self, service):
        ratio, found = service._compute_keyword_coverage(
            keywords=[],
            corpus_texts=[(1, 'digital transformation university')],
        )
        assert ratio == 0.0
        assert found == set()

    def test_keyword_coverage_all_found(self, service):
        ratio, found = service._compute_keyword_coverage(
            keywords=['digital', 'transformation'],
            corpus_texts=[(1, 'digital transformation university')],
        )
        assert ratio == 1.0
        assert 'digital' in found
        assert 'transformation' in found

    def test_keyword_coverage_partial(self, service):
        ratio, found = service._compute_keyword_coverage(
            keywords=['digital', 'blockchain'],
            corpus_texts=[(1, 'digital university education')],
        )
        assert ratio == pytest.approx(0.5)
        assert 'digital' in found
        assert 'blockchain' not in found

    def test_keyword_coverage_none_found(self, service):
        ratio, found = service._compute_keyword_coverage(
            keywords=['blockchain', 'metaverse'],
            corpus_texts=[(1, 'digital university education')],
        )
        assert ratio == 0.0
        assert found == set()

    def test_keyword_coverage_case_insensitive(self, service):
        ratio, found = service._compute_keyword_coverage(
            keywords=['Digital'],
            corpus_texts=[(1, 'digital transformation')],
        )
        assert ratio == 1.0
        assert 'Digital' in found

    # ── evaluate_factor_detection (DB-dependent, mocked) ─────────────────────

    @patch('apps.analysis.services.factor_evaluation_service.Factor.objects')
    def test_evaluate_no_factors(self, mock_factor_mgr, service):
        mock_factor_mgr.filter.return_value.values.return_value = []
        mock_factor_mgr.all.return_value.values.return_value = []

        result = service.evaluate_factor_detection(factor_id=None)

        assert result['success'] is False
        assert 'No factors' in result['error']

    @patch('apps.analysis.services.factor_evaluation_service.DatasetFile.objects')
    @patch('apps.analysis.services.factor_evaluation_service.Factor.objects')
    def test_evaluate_no_corpus(self, mock_factor_mgr, mock_file_mgr, service):
        mock_factor_mgr.all.return_value.values.return_value = [
            {'id': 1, 'name': 'Digital Leadership', 'category': 'governance', 'keywords': ['leadership']},
        ]
        corpus_qs = Mock()
        corpus_qs.exists.return_value = False
        mock_file_mgr.filter.return_value.exclude.return_value = corpus_qs

        result = service.evaluate_factor_detection()

        assert result['success'] is False
        assert 'No preprocessed' in result['error']
