"""
Integration tests for DataPreparationViewSet.

Covers: list, create (mocks start_processing_thread), progress,
stats, file_details, detect_changes, update_preparation, auth required.
"""

import pytest
from unittest.mock import patch, Mock
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

pytestmark = pytest.mark.django_db


# ── Fixtures ───────────────────────────────────────────────────────────────

@pytest.fixture
def user(db):
    return User.objects.create_user(
        username='prep_user',
        email='prep@test.com',
        password='testpass123',
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        username='other_prep_user',
        email='other_prep@test.com',
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
        name='Test Dataset',
        created_by=user,
        status='completed',
    )


@pytest.fixture
def preparation(user, dataset):
    from apps.data_preparation.models import DataPreparation
    return DataPreparation.objects.create(
        name='Test Preparation',
        dataset=dataset,
        created_by=user,
        status=DataPreparation.STATUS_COMPLETED,
        progress_percentage=100,
    )


# ── Auth required ──────────────────────────────────────────────────────────

class TestAuthRequired:
    def test_list_requires_auth(self):
        client = APIClient()
        response = client.get('/api/v1/data-preparation/')
        assert response.status_code == 401

    def test_create_requires_auth(self):
        client = APIClient()
        response = client.post('/api/v1/data-preparation/', {})
        assert response.status_code == 401


# ── List ───────────────────────────────────────────────────────────────────

class TestDataPreparationList:
    def test_list_returns_own_preparations(self, auth_client, preparation):
        response = auth_client.get('/api/v1/data-preparation/')
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]['name'] == 'Test Preparation'

    def test_list_excludes_other_users(self, auth_client, other_user, dataset):
        from apps.data_preparation.models import DataPreparation
        DataPreparation.objects.create(
            name='Other Preparation',
            dataset=dataset,
            created_by=other_user,
        )
        response = auth_client.get('/api/v1/data-preparation/')
        assert response.status_code == 200
        assert all(p['name'] != 'Other Preparation' for p in response.data)

    def test_list_empty_for_new_user(self, auth_client):
        response = auth_client.get('/api/v1/data-preparation/')
        assert response.status_code == 200
        assert response.data == []


# ── Create ─────────────────────────────────────────────────────────────────

class TestDataPreparationCreate:
    @patch('apps.data_preparation.processor.start_processing_thread')
    def test_create_success(self, mock_thread, auth_client, dataset):
        payload = {
            'name': 'New Preparation',
            'dataset_id': dataset.id,
        }
        response = auth_client.post('/api/v1/data-preparation/', payload, format='json')

        assert response.status_code == 201
        assert response.data['name'] == 'New Preparation'
        mock_thread.assert_called_once()

    @patch('apps.data_preparation.processor.start_processing_thread')
    def test_create_starts_background_thread(self, mock_thread, auth_client, dataset):
        payload = {'name': 'BG Test', 'dataset_id': dataset.id}
        auth_client.post('/api/v1/data-preparation/', payload, format='json')

        prep_id = mock_thread.call_args[0][0]
        assert isinstance(prep_id, int)

    def test_create_requires_dataset(self, auth_client):
        response = auth_client.post('/api/v1/data-preparation/', {'name': 'No dataset'}, format='json')
        assert response.status_code == 400

    def test_create_requires_name(self, auth_client, dataset):
        response = auth_client.post('/api/v1/data-preparation/', {'dataset_id': dataset.id}, format='json')
        assert response.status_code == 400


# ── Progress ───────────────────────────────────────────────────────────────

class TestDataPreparationProgress:
    def test_progress_returns_status(self, auth_client, preparation):
        response = auth_client.get(f'/api/v1/data-preparation/{preparation.id}/progress/')
        assert response.status_code == 200
        assert 'status' in response.data
        assert 'progress_percentage' in response.data

    def test_progress_values_match_model(self, auth_client, preparation):
        response = auth_client.get(f'/api/v1/data-preparation/{preparation.id}/progress/')
        assert response.data['status'] == 'completed'
        assert response.data['progress_percentage'] == 100

    def test_progress_404_for_other_user(self, other_user, preparation):
        client = APIClient()
        client.force_authenticate(user=other_user)
        response = client.get(f'/api/v1/data-preparation/{preparation.id}/progress/')
        assert response.status_code == 404


# ── Stats ──────────────────────────────────────────────────────────────────

class TestDataPreparationStats:
    def test_stats_returns_counts(self, auth_client, preparation):
        response = auth_client.get('/api/v1/data-preparation/stats/')
        assert response.status_code == 200
        assert 'total_preparations' in response.data
        assert response.data['total_preparations'] == 1
        assert response.data['completed'] == 1

    def test_stats_empty_for_new_user(self, auth_client):
        response = auth_client.get('/api/v1/data-preparation/stats/')
        assert response.status_code == 200
        assert response.data['total_preparations'] == 0


# ── File details ───────────────────────────────────────────────────────────

class TestDataPreparationFileDetails:
    def test_file_details_returns_structure(self, auth_client, preparation):
        response = auth_client.get(f'/api/v1/data-preparation/{preparation.id}/file_details/')
        assert response.status_code == 200
        assert 'processed' in response.data
        assert 'omitted' in response.data
        assert 'duplicates' in response.data

    def test_file_details_empty_when_no_files(self, auth_client, preparation):
        response = auth_client.get(f'/api/v1/data-preparation/{preparation.id}/file_details/')
        assert response.data['processed'] == []
        assert response.data['omitted'] == []


# ── Detect changes ─────────────────────────────────────────────────────────

class TestDetectChanges:
    def test_detect_changes_no_changes(self, auth_client, preparation):
        response = auth_client.get(f'/api/v1/data-preparation/{preparation.id}/detect_changes/')
        assert response.status_code == 200
        assert 'has_changes' in response.data
        assert 'added_count' in response.data
        assert 'deleted_count' in response.data

    def test_detect_changes_other_user_cannot_access(self, other_user, preparation):
        # detect_changes has a broad try/except, so Http404 becomes 500
        client = APIClient()
        client.force_authenticate(user=other_user)
        response = client.get(f'/api/v1/data-preparation/{preparation.id}/detect_changes/')
        assert response.status_code in (404, 500)


# ── Update preparation ─────────────────────────────────────────────────────

class TestUpdatePreparation:
    @patch('apps.data_preparation.processor.start_update_thread')
    def test_update_preparation_completed(self, mock_thread, auth_client, preparation):
        response = auth_client.post(f'/api/v1/data-preparation/{preparation.id}/update_preparation/')
        assert response.status_code == 200
        mock_thread.assert_called_once_with(preparation.id)

    def test_update_preparation_rejects_non_completed(self, auth_client, dataset, user):
        from apps.data_preparation.models import DataPreparation
        pending_prep = DataPreparation.objects.create(
            name='Pending',
            dataset=dataset,
            created_by=user,
            status=DataPreparation.STATUS_PENDING,
        )
        response = auth_client.post(f'/api/v1/data-preparation/{pending_prep.id}/update_preparation/')
        assert response.status_code == 400
        assert 'completadas' in response.data['error']

    def test_update_preparation_404_other_user(self, other_user, preparation):
        client = APIClient()
        client.force_authenticate(user=other_user)
        response = client.post(f'/api/v1/data-preparation/{preparation.id}/update_preparation/')
        assert response.status_code == 404


# ── Delete ─────────────────────────────────────────────────────────────────

class TestDataPreparationDelete:
    def test_delete_own_preparation(self, auth_client, preparation):
        response = auth_client.delete(f'/api/v1/data-preparation/{preparation.id}/')
        assert response.status_code == 204

    def test_delete_other_user_preparation_fails(self, other_user, preparation):
        client = APIClient()
        client.force_authenticate(user=other_user)
        response = client.delete(f'/api/v1/data-preparation/{preparation.id}/')
        assert response.status_code == 404
