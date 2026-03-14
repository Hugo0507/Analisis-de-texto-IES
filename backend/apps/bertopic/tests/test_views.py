"""
Integration tests for BERTopicViewSet.

Covers: list, create (mocks start_processing_thread), progress,
stats, embedding_models, update, auth required.
"""

import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

pytestmark = pytest.mark.django_db


# ── Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture
def user(db):
    return User.objects.create_user(
        username='bertopic_user',
        email='bertopic@test.com',
        password='testpass123',
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        username='other_bertopic',
        email='other_bertopic@test.com',
        password='testpass123',
    )


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def dataset(user):
    from apps.datasets.models import Dataset
    return Dataset.objects.create(
        name='BERTopic Dataset',
        created_by=user,
        status='completed',
    )


@pytest.fixture
def data_preparation(user, dataset):
    from apps.data_preparation.models import DataPreparation
    return DataPreparation.objects.create(
        name='Prep for BERTopic',
        dataset=dataset,
        created_by=user,
        status=DataPreparation.STATUS_COMPLETED,
        progress_percentage=100,
    )


@pytest.fixture
def bertopic_analysis(user, dataset):
    from apps.bertopic.models import BERTopicAnalysis
    return BERTopicAnalysis.objects.create(
        name='Test BERTopic',
        source_type=BERTopicAnalysis.SOURCE_DATASET,
        dataset=dataset,
        embedding_model='all-MiniLM-L6-v2',
        created_by=user,
        status=BERTopicAnalysis.STATUS_COMPLETED,
    )


# ── Auth required ──────────────────────────────────────────────────────────

class TestAuthRequired:
    def test_list_requires_auth(self):
        client = APIClient()
        response = client.get('/api/v1/bertopic/')
        assert response.status_code == 401

    def test_create_requires_auth(self):
        client = APIClient()
        response = client.post('/api/v1/bertopic/', {})
        assert response.status_code == 401

    def test_embedding_models_requires_auth(self):
        client = APIClient()
        response = client.get('/api/v1/bertopic/embedding_models/')
        assert response.status_code == 401


# ── List ───────────────────────────────────────────────────────────────────

def _results(response):
    """Return the items list whether or not the response is paginated."""
    if isinstance(response.data, dict) and 'results' in response.data:
        return response.data['results']
    return response.data


class TestBERTopicList:
    def test_list_returns_own_analyses(self, auth_client, bertopic_analysis):
        response = auth_client.get('/api/v1/bertopic/')
        assert response.status_code == 200
        items = _results(response)
        assert len(items) == 1
        assert items[0]['name'] == 'Test BERTopic'

    def test_list_excludes_other_users(self, auth_client, other_user, dataset):
        from apps.bertopic.models import BERTopicAnalysis
        BERTopicAnalysis.objects.create(
            name='Other Analysis',
            source_type=BERTopicAnalysis.SOURCE_DATASET,
            dataset=dataset,
            embedding_model='all-MiniLM-L6-v2',
            created_by=other_user,
        )
        response = auth_client.get('/api/v1/bertopic/')
        assert response.status_code == 200
        assert all(a['name'] != 'Other Analysis' for a in _results(response))

    def test_list_empty_for_new_user(self, auth_client):
        response = auth_client.get('/api/v1/bertopic/')
        assert response.status_code == 200
        assert len(_results(response)) == 0


# ── Create ─────────────────────────────────────────────────────────────────

class TestBERTopicCreate:
    @patch('apps.bertopic.processor.start_processing_thread')
    def test_create_with_dataset_source(self, mock_thread, auth_client, dataset):
        payload = {
            'name': 'New BERTopic',
            'source_type': 'dataset',
            'dataset': dataset.id,
            'embedding_model': 'all-MiniLM-L6-v2',
        }
        response = auth_client.post('/api/v1/bertopic/', payload, format='json')

        assert response.status_code == 201
        assert response.data['name'] == 'New BERTopic'
        mock_thread.assert_called_once()

    @patch('apps.bertopic.processor.start_processing_thread')
    def test_create_with_data_preparation_source(self, mock_thread, auth_client, data_preparation):
        payload = {
            'name': 'Prep BERTopic',
            'source_type': 'data_preparation',
            'data_preparation': data_preparation.id,
            'embedding_model': 'all-MiniLM-L6-v2',
        }
        response = auth_client.post('/api/v1/bertopic/', payload, format='json')

        assert response.status_code == 201
        mock_thread.assert_called_once()

    def test_create_dataset_source_requires_dataset(self, auth_client):
        payload = {
            'name': 'Missing Dataset',
            'source_type': 'dataset',
            'embedding_model': 'all-MiniLM-L6-v2',
        }
        response = auth_client.post('/api/v1/bertopic/', payload, format='json')
        assert response.status_code == 400

    def test_create_data_preparation_source_requires_preparation(self, auth_client):
        payload = {
            'name': 'Missing Prep',
            'source_type': 'data_preparation',
            'embedding_model': 'all-MiniLM-L6-v2',
        }
        response = auth_client.post('/api/v1/bertopic/', payload, format='json')
        assert response.status_code == 400

    @patch('apps.bertopic.processor.start_processing_thread')
    def test_create_starts_background_thread_with_correct_id(self, mock_thread, auth_client, dataset):
        payload = {
            'name': 'Thread Test',
            'source_type': 'dataset',
            'dataset': dataset.id,
            'embedding_model': 'all-MiniLM-L6-v2',
        }
        response = auth_client.post('/api/v1/bertopic/', payload, format='json')

        assert response.status_code == 201
        called_id = mock_thread.call_args[0][0]
        assert called_id == response.data['id']


# ── Progress ───────────────────────────────────────────────────────────────

class TestBERTopicProgress:
    def test_progress_returns_200(self, auth_client, bertopic_analysis):
        response = auth_client.get(f'/api/v1/bertopic/{bertopic_analysis.id}/progress/')
        assert response.status_code == 200

    def test_progress_404_for_other_user(self, other_user, bertopic_analysis):
        client = APIClient()
        client.force_authenticate(user=other_user)
        response = client.get(f'/api/v1/bertopic/{bertopic_analysis.id}/progress/')
        assert response.status_code == 404


# ── Stats ──────────────────────────────────────────────────────────────────

class TestBERTopicStats:
    def test_stats_returns_totals(self, auth_client, bertopic_analysis):
        response = auth_client.get('/api/v1/bertopic/stats/')
        assert response.status_code == 200
        assert 'total' in response.data
        assert response.data['total'] == 1

    def test_stats_by_status(self, auth_client, bertopic_analysis):
        response = auth_client.get('/api/v1/bertopic/stats/')
        assert 'by_status' in response.data
        assert response.data['by_status'].get('completed') == 1

    def test_stats_empty_for_new_user(self, auth_client):
        response = auth_client.get('/api/v1/bertopic/stats/')
        assert response.data['total'] == 0

    def test_stats_by_embedding_model(self, auth_client, bertopic_analysis):
        response = auth_client.get('/api/v1/bertopic/stats/')
        assert 'by_embedding_model' in response.data
        assert 'all-MiniLM-L6-v2' in response.data['by_embedding_model']


# ── Embedding models ───────────────────────────────────────────────────────

class TestEmbeddingModels:
    def test_returns_three_models(self, auth_client):
        response = auth_client.get('/api/v1/bertopic/embedding_models/')
        assert response.status_code == 200
        assert len(response.data['embedding_models']) == 3

    def test_model_ids_correct(self, auth_client):
        response = auth_client.get('/api/v1/bertopic/embedding_models/')
        ids = [m['id'] for m in response.data['embedding_models']]
        assert 'all-MiniLM-L6-v2' in ids
        assert 'all-mpnet-base-v2' in ids
        assert 'paraphrase-multilingual-MiniLM-L12-v2' in ids

    def test_minilm_is_recommended(self, auth_client):
        response = auth_client.get('/api/v1/bertopic/embedding_models/')
        models = {m['id']: m for m in response.data['embedding_models']}
        assert models['all-MiniLM-L6-v2']['recommended'] is True
        assert models['all-mpnet-base-v2']['recommended'] is False

    def test_models_have_required_fields(self, auth_client):
        response = auth_client.get('/api/v1/bertopic/embedding_models/')
        for model in response.data['embedding_models']:
            assert 'id' in model
            assert 'name' in model
            assert 'language' in model
            assert 'size_mb' in model


# ── Update ─────────────────────────────────────────────────────────────────

class TestBERTopicUpdate:
    def test_partial_update_name(self, auth_client, bertopic_analysis):
        response = auth_client.patch(
            f'/api/v1/bertopic/{bertopic_analysis.id}/',
            {'name': 'Updated Name'},
            format='json',
        )
        assert response.status_code == 200
        assert response.data['name'] == 'Updated Name'

    def test_update_other_user_fails(self, other_user, bertopic_analysis):
        client = APIClient()
        client.force_authenticate(user=other_user)
        response = client.patch(
            f'/api/v1/bertopic/{bertopic_analysis.id}/',
            {'name': 'Hacked'},
            format='json',
        )
        assert response.status_code == 404


# ── Delete ─────────────────────────────────────────────────────────────────

class TestBERTopicDelete:
    def test_delete_own_analysis(self, auth_client, bertopic_analysis):
        response = auth_client.delete(f'/api/v1/bertopic/{bertopic_analysis.id}/')
        assert response.status_code == 204

    def test_delete_other_user_fails(self, other_user, bertopic_analysis):
        client = APIClient()
        client.force_authenticate(user=other_user)
        response = client.delete(f'/api/v1/bertopic/{bertopic_analysis.id}/')
        assert response.status_code == 404
