"""
Tests for ExecutePipelineUseCase.

Covers:
- Happy path: all stages succeed
- Stage skipping
- Stage failure recovery (pipeline continues despite one failed stage)
- get_status() with known and unknown execution IDs
- get_history()
"""

import uuid
import pytest
from unittest.mock import Mock, patch, MagicMock
from apps.pipeline.use_cases.execute_pipeline import ExecutePipelineUseCase


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_success(**kwargs):
    return {'success': True, 'cached': False, **kwargs}


def _make_failure(error='Stage error'):
    return {'success': False, 'error': error, 'cached': False}


def _patch_all_inner_use_cases(monkeypatch):
    """
    Patch all 7 inner use cases so they return success immediately,
    and silence the WebSocket channel layer.
    """
    patches = [
        patch('apps.pipeline.use_cases.execute_pipeline.DetectLanguageUseCase'),
        patch('apps.pipeline.use_cases.execute_pipeline.ConvertDocumentsUseCase'),
        patch('apps.pipeline.use_cases.execute_pipeline.PreprocessTextUseCase'),
        patch('apps.pipeline.use_cases.execute_pipeline.GenerateBowUseCase'),
        patch('apps.pipeline.use_cases.execute_pipeline.CalculateTfidfUseCase'),
        patch('apps.pipeline.use_cases.execute_pipeline.TrainTopicModelsUseCase'),
        patch('apps.pipeline.use_cases.execute_pipeline.AnalyzeFactorsUseCase'),
        patch('apps.pipeline.use_cases.execute_pipeline.get_channel_layer', return_value=None),
    ]
    started = [p.start() for p in patches]
    return patches, started


# ---------------------------------------------------------------------------
# Unit tests — ExecutePipelineUseCase.execute()
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestExecutePipelineHappyPath:
    """Pipeline runs through all stages when every stage succeeds."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self._patches, mocks = _patch_all_inner_use_cases(None)

        lang_cls, conv_cls, prep_cls, bow_cls, tfidf_cls, topic_cls, factor_cls, _ = mocks

        # Wire return values for batch / execute methods
        lang_cls.return_value.execute_batch.return_value = _make_success(detected=10)
        conv_cls.return_value.execute_batch.return_value = _make_success(converted=10)
        prep_cls.return_value.execute_batch.return_value = _make_success(preprocessed=10)
        bow_cls.return_value.execute.return_value = _make_success(vocabulary_size=200)
        tfidf_cls.return_value.execute.return_value = _make_success(vocabulary_size=200)
        topic_cls.return_value.execute.return_value = _make_success(n_topics=10)
        topic_cls.return_value.compare_models.return_value = _make_success()
        factor_cls.return_value.execute.return_value = _make_success(n_factors=5)

        yield

        for p in self._patches:
            p.stop()

    @pytest.mark.django_db
    def test_execute_returns_execution_id(self):
        uc = ExecutePipelineUseCase()
        result = uc.execute(skip_stages=['consolidation', 'cache_validation', 'final_report'])
        assert 'execution_id' in result
        assert len(result['execution_id']) == 36  # UUID string

    @pytest.mark.django_db
    def test_execute_skips_requested_stages(self):
        skip = ['consolidation', 'cache_validation', 'final_report']
        uc = ExecutePipelineUseCase()
        result = uc.execute(skip_stages=skip)

        assert result['skipped_stages'] == len(skip)
        for s in skip:
            assert result['stages'][s]['status'] == 'skipped'

    @pytest.mark.django_db
    def test_execute_reports_completed_stages(self):
        skip = ['consolidation', 'cache_validation', 'final_report']
        uc = ExecutePipelineUseCase()
        result = uc.execute(skip_stages=skip)

        # 14 total - 3 skipped = 11 should run
        assert result['completed_stages'] == 11
        assert result['failed_stages'] == 0

    @pytest.mark.django_db
    def test_execute_has_started_and_completed_at(self):
        uc = ExecutePipelineUseCase()
        result = uc.execute(skip_stages=list(ExecutePipelineUseCase.STAGE_NAMES))
        assert 'started_at' in result
        assert 'completed_at' in result

    @pytest.mark.django_db
    def test_execute_total_stages_is_14(self):
        uc = ExecutePipelineUseCase()
        result = uc.execute(skip_stages=list(ExecutePipelineUseCase.STAGE_NAMES))
        assert result['total_stages'] == 14


@pytest.mark.unit
class TestExecutePipelineFailureRecovery:
    """Pipeline continues when a stage fails; records error but doesn't abort."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self._patches, mocks = _patch_all_inner_use_cases(None)
        lang_cls, conv_cls, prep_cls, bow_cls, tfidf_cls, topic_cls, factor_cls, _ = mocks

        # language_detection FAILS, all others succeed
        lang_cls.return_value.execute_batch.return_value = _make_failure('Language model unavailable')
        conv_cls.return_value.execute_batch.return_value = _make_success()
        prep_cls.return_value.execute_batch.return_value = _make_success()
        bow_cls.return_value.execute.return_value = _make_success(vocabulary_size=100)
        tfidf_cls.return_value.execute.return_value = _make_success(vocabulary_size=100)
        topic_cls.return_value.execute.return_value = _make_success(n_topics=10)
        topic_cls.return_value.compare_models.return_value = _make_success()
        factor_cls.return_value.execute.return_value = _make_success(n_factors=5)

        yield

        for p in self._patches:
            p.stop()

    @pytest.mark.django_db
    def test_pipeline_continues_after_one_failure(self):
        skip = ['consolidation', 'cache_validation', 'final_report']
        uc = ExecutePipelineUseCase()
        result = uc.execute(skip_stages=skip)

        assert result['failed_stages'] == 1
        assert result['completed_stages'] == 10  # 11 ran - 1 failed

    @pytest.mark.django_db
    def test_failed_stage_has_error_field(self):
        uc = ExecutePipelineUseCase()
        result = uc.execute(skip_stages=['consolidation', 'cache_validation', 'final_report'])

        lang_stage = result['stages']['language_detection']
        assert lang_stage['success'] is False
        assert lang_stage['error'] == 'Language model unavailable'

    @pytest.mark.django_db
    def test_overall_success_is_false_when_stage_fails(self):
        uc = ExecutePipelineUseCase()
        result = uc.execute(skip_stages=['consolidation', 'cache_validation', 'final_report'])
        assert result['success'] is False


@pytest.mark.unit
class TestExecutePipelineExceptionHandling:
    """Stage handler raises an unhandled exception — use case must not propagate it."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self._patches, mocks = _patch_all_inner_use_cases(None)
        lang_cls, conv_cls, prep_cls, bow_cls, tfidf_cls, topic_cls, factor_cls, _ = mocks

        lang_cls.return_value.execute_batch.side_effect = RuntimeError('CUDA OOM')
        conv_cls.return_value.execute_batch.return_value = _make_success()
        prep_cls.return_value.execute_batch.return_value = _make_success()
        bow_cls.return_value.execute.return_value = _make_success(vocabulary_size=100)
        tfidf_cls.return_value.execute.return_value = _make_success(vocabulary_size=100)
        topic_cls.return_value.execute.return_value = _make_success(n_topics=10)
        topic_cls.return_value.compare_models.return_value = _make_success()
        factor_cls.return_value.execute.return_value = _make_success(n_factors=5)

        yield

        for p in self._patches:
            p.stop()

    @pytest.mark.django_db
    def test_exception_is_caught_and_recorded(self):
        skip = ['consolidation', 'cache_validation', 'final_report']
        uc = ExecutePipelineUseCase()
        result = uc.execute(skip_stages=skip)  # must not raise

        lang_stage = result['stages']['language_detection']
        assert lang_stage['success'] is False
        assert 'CUDA OOM' in lang_stage['error']


# ---------------------------------------------------------------------------
# Unit tests — get_status() / get_history()
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestGetStatus:

    @pytest.fixture(autouse=True)
    def _silence_ws(self):
        with patch('apps.pipeline.use_cases.execute_pipeline.get_channel_layer', return_value=None):
            yield

    @pytest.mark.django_db
    def test_get_status_returns_not_found_for_unknown_id(self):
        uc = ExecutePipelineUseCase()
        result = uc.get_status(str(uuid.uuid4()))
        assert result['success'] is False
        assert 'not found' in result['error'].lower()

    @pytest.mark.django_db
    def test_get_status_returns_stages_after_execution(self):
        """Run a trivial execution (all skipped) then check its status."""
        with patch('apps.pipeline.use_cases.execute_pipeline.DetectLanguageUseCase'), \
             patch('apps.pipeline.use_cases.execute_pipeline.ConvertDocumentsUseCase'), \
             patch('apps.pipeline.use_cases.execute_pipeline.PreprocessTextUseCase'), \
             patch('apps.pipeline.use_cases.execute_pipeline.GenerateBowUseCase'), \
             patch('apps.pipeline.use_cases.execute_pipeline.CalculateTfidfUseCase'), \
             patch('apps.pipeline.use_cases.execute_pipeline.TrainTopicModelsUseCase'), \
             patch('apps.pipeline.use_cases.execute_pipeline.AnalyzeFactorsUseCase'):

            uc = ExecutePipelineUseCase()
            exec_result = uc.execute(skip_stages=list(ExecutePipelineUseCase.STAGE_NAMES))
            exec_id = exec_result['execution_id']

        status_result = uc.get_status(exec_id)

        assert status_result['success'] is True
        assert status_result['execution_id'] == exec_id
        assert 'progress_percentage' in status_result
        assert isinstance(status_result['stages'], list)
        assert len(status_result['stages']) == 14


@pytest.mark.unit
class TestGetHistory:

    @pytest.fixture(autouse=True)
    def _silence_ws(self):
        with patch('apps.pipeline.use_cases.execute_pipeline.get_channel_layer', return_value=None):
            yield

    @pytest.mark.django_db
    def test_get_history_returns_empty_when_no_executions(self):
        uc = ExecutePipelineUseCase()
        result = uc.get_history(limit=5)
        assert result['success'] is True
        assert result['count'] == 0
        assert result['executions'] == []

    @pytest.mark.django_db
    def test_get_history_respects_limit(self):
        """Create 3 executions (all skipped) and request only 2."""
        all_stages = list(ExecutePipelineUseCase.STAGE_NAMES)
        with patch('apps.pipeline.use_cases.execute_pipeline.DetectLanguageUseCase'), \
             patch('apps.pipeline.use_cases.execute_pipeline.ConvertDocumentsUseCase'), \
             patch('apps.pipeline.use_cases.execute_pipeline.PreprocessTextUseCase'), \
             patch('apps.pipeline.use_cases.execute_pipeline.GenerateBowUseCase'), \
             patch('apps.pipeline.use_cases.execute_pipeline.CalculateTfidfUseCase'), \
             patch('apps.pipeline.use_cases.execute_pipeline.TrainTopicModelsUseCase'), \
             patch('apps.pipeline.use_cases.execute_pipeline.AnalyzeFactorsUseCase'):

            uc = ExecutePipelineUseCase()
            for _ in range(3):
                uc.execute(skip_stages=all_stages)

        result = uc.get_history(limit=2)
        assert result['success'] is True
        assert result['count'] <= 2
