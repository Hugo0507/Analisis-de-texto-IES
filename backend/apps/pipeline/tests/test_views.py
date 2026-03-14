"""
Integration tests for PipelineViewSet.

Tests the REST API surface using DRF's APIClient — mocks only the
ExecutePipelineUseCase to avoid real ML computation.
"""

import uuid
import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

EXECUTE_UC = 'apps.pipeline.views.ExecutePipelineUseCase'

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    user = User.objects.create_user(
        username='admin_pipeline',
        email='admin_pipeline@test.com',
        password='TestPass123!',
        role='admin',
    )
    return user


@pytest.fixture
def auth_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


def _mock_execute_result(success=True, skipped=2):
    exec_id = str(uuid.uuid4())
    return {
        'execution_id': exec_id,
        'success': success,
        'started_at': '2024-01-01T00:00:00+00:00',
        'completed_at': '2024-01-01T00:01:00+00:00',
        'total_stages': 14,
        'completed_stages': 14 - skipped if success else 12,
        'failed_stages': 0 if success else 1,
        'skipped_stages': skipped,
        'stages': {},
        'results': {},
    }


def _mock_status_result(exec_id):
    return {
        'success': True,
        'execution_id': exec_id,
        'total_stages': 14,
        'completed': 14,
        'failed': 0,
        'running': 0,
        'skipped': 0,
        'progress_percentage': 100,
        'is_completed': True,
        'is_running': False,
        'has_errors': False,
        'stages': [],
    }


# ---------------------------------------------------------------------------
# POST /api/v1/pipeline/execute/
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.django_db
class TestPipelineExecuteView:

    def test_execute_returns_200_on_success(self, auth_client):
        mock_result = _mock_execute_result(success=True)
        with patch(EXECUTE_UC) as MockUC:
            MockUC.return_value.execute.return_value = mock_result
            resp = auth_client.post(
                '/api/v1/pipeline/execute/',
                {'use_cache': True},
                format='json'
            )
        assert resp.status_code == 200
        assert resp.data['success'] is True
        assert 'execution_id' in resp.data

    def test_execute_returns_400_when_use_case_fails(self, auth_client):
        mock_result = {'success': False, 'error': 'No documents found'}
        with patch(EXECUTE_UC) as MockUC:
            MockUC.return_value.execute.return_value = mock_result
            resp = auth_client.post('/api/v1/pipeline/execute/', {}, format='json')
        assert resp.status_code == 400
        assert resp.data['success'] is False

    def test_execute_passes_document_ids_to_use_case(self, auth_client):
        mock_result = _mock_execute_result(success=True)
        with patch(EXECUTE_UC) as MockUC:
            MockUC.return_value.execute.return_value = mock_result
            auth_client.post(
                '/api/v1/pipeline/execute/',
                {'document_ids': [1, 2, 3], 'use_cache': False},
                format='json'
            )
            call_kwargs = MockUC.return_value.execute.call_args
        assert call_kwargs.kwargs['document_ids'] == [1, 2, 3]
        assert call_kwargs.kwargs['use_cache'] is False

    def test_execute_passes_skip_stages_to_use_case(self, auth_client):
        mock_result = _mock_execute_result(success=True, skipped=3)
        skip = ['consolidation', 'cache_validation', 'final_report']
        with patch(EXECUTE_UC) as MockUC:
            MockUC.return_value.execute.return_value = mock_result
            auth_client.post(
                '/api/v1/pipeline/execute/',
                {'skip_stages': skip},
                format='json'
            )
            call_kwargs = MockUC.return_value.execute.call_args
        assert call_kwargs.kwargs['skip_stages'] == skip

    def test_execute_requires_authentication(self, api_client):
        resp = api_client.post('/api/v1/pipeline/execute/', {}, format='json')
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# GET /api/v1/pipeline/status/{execution_id}/
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.django_db
class TestPipelineStatusView:

    def test_get_status_returns_200_for_known_id(self, auth_client):
        exec_id = str(uuid.uuid4())
        mock_result = _mock_status_result(exec_id)
        with patch(EXECUTE_UC) as MockUC:
            MockUC.return_value.get_status.return_value = mock_result
            resp = auth_client.get(f'/api/v1/pipeline/status/{exec_id}/')
        assert resp.status_code == 200
        assert resp.data['execution_id'] == exec_id
        assert resp.data['progress_percentage'] == 100

    def test_get_status_returns_404_for_unknown_id(self, auth_client):
        unknown_id = str(uuid.uuid4())
        with patch(EXECUTE_UC) as MockUC:
            MockUC.return_value.get_status.return_value = {
                'success': False,
                'error': f'Execution {unknown_id} not found'
            }
            resp = auth_client.get(f'/api/v1/pipeline/status/{unknown_id}/')
        assert resp.status_code == 404

    def test_get_status_requires_authentication(self, api_client):
        resp = api_client.get(f'/api/v1/pipeline/status/{uuid.uuid4()}/')
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# GET /api/v1/pipeline/history/
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.django_db
class TestPipelineHistoryView:

    def test_history_returns_200(self, auth_client):
        mock_result = {'success': True, 'count': 2, 'executions': [{}, {}]}
        with patch(EXECUTE_UC) as MockUC:
            MockUC.return_value.get_history.return_value = mock_result
            resp = auth_client.get('/api/v1/pipeline/history/')
        assert resp.status_code == 200
        assert resp.data['count'] == 2

    def test_history_respects_limit_param(self, auth_client):
        mock_result = {'success': True, 'count': 5, 'executions': [{}] * 5}
        with patch(EXECUTE_UC) as MockUC:
            MockUC.return_value.get_history.return_value = mock_result
            auth_client.get('/api/v1/pipeline/history/?limit=5')
            call_kwargs = MockUC.return_value.get_history.call_args
        assert call_kwargs.kwargs.get('limit') == 5 or call_kwargs.args == (5,) or \
               (call_kwargs.kwargs == {} and call_kwargs.args[0] == 5)

    def test_history_returns_400_on_failure(self, auth_client):
        with patch(EXECUTE_UC) as MockUC:
            MockUC.return_value.get_history.return_value = {
                'success': False, 'error': 'DB unavailable'
            }
            resp = auth_client.get('/api/v1/pipeline/history/')
        assert resp.status_code == 400

    def test_history_requires_authentication(self, api_client):
        resp = api_client.get('/api/v1/pipeline/history/')
        assert resp.status_code in (401, 403)
