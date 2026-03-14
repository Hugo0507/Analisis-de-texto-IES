"""
Integration tests for Users API.

Covers:
- Registration (POST /api/v1/users/) — public endpoint
- Login (POST /api/v1/auth/login/) — returns JWT + user data
- GET /api/v1/users/me/ — current authenticated user
- Change password (POST /api/v1/users/{id}/change-password/)
- Permission rules: unauthenticated vs authenticated
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

BASE = '/api/v1'


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def regular_user(db):
    user = User.objects.create_user(
        username='john_doe',
        email='john@example.com',
        password='SecurePass123!',
        name='John',
        surname='Doe',
        role='user',
    )
    return user


@pytest.fixture
def admin_user(db):
    user = User.objects.create_user(
        username='admin_test',
        email='admin@example.com',
        password='AdminPass123!',
        name='Admin',
        surname='User',
        role='admin',
    )
    return user


@pytest.fixture
def auth_client(client, regular_user):
    client.force_authenticate(user=regular_user)
    return client, regular_user


@pytest.fixture
def admin_client(client, admin_user):
    client.force_authenticate(user=admin_user)
    return client, admin_user


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.django_db
class TestUserRegistration:

    def test_create_user_returns_201(self, client):
        resp = client.post(f'{BASE}/users/', {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'NewPass123!',
            'password_confirm': 'NewPass123!',
            'name': 'New',
            'surname': 'User',
        }, format='json')
        assert resp.status_code == 201
        assert User.objects.filter(username='newuser').exists()

    def test_create_user_does_not_require_auth(self, client):
        """Registration must be open (AllowAny)."""
        resp = client.post(f'{BASE}/users/', {
            'username': 'anon_user',
            'email': 'anon@example.com',
            'password': 'AnonPass123!',
            'password_confirm': 'AnonPass123!',
        }, format='json')
        assert resp.status_code == 201

    def test_create_user_with_mismatched_passwords_returns_400(self, client):
        resp = client.post(f'{BASE}/users/', {
            'username': 'bad_user',
            'email': 'bad@example.com',
            'password': 'Pass123!',
            'password_confirm': 'WrongPass123!',
        }, format='json')
        assert resp.status_code == 400

    def test_create_user_with_duplicate_email_returns_400(self, client, regular_user):
        resp = client.post(f'{BASE}/users/', {
            'username': 'another_john',
            'email': regular_user.email,  # duplicate
            'password': 'Pass123!',
            'password_confirm': 'Pass123!',
        }, format='json')
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.django_db
class TestLogin:

    def test_login_returns_tokens_and_user_data(self, client, regular_user):
        resp = client.post(f'{BASE}/auth/login/', {
            'username': regular_user.username,
            'password': 'SecurePass123!',
        }, format='json')
        assert resp.status_code == 200
        assert 'access' in resp.data
        assert 'refresh' in resp.data
        assert 'user' in resp.data
        assert resp.data['user']['username'] == regular_user.username

    def test_login_with_wrong_password_returns_401(self, client, regular_user):
        resp = client.post(f'{BASE}/auth/login/', {
            'username': regular_user.username,
            'password': 'WrongPassword!',
        }, format='json')
        assert resp.status_code == 401

    def test_login_user_data_includes_role(self, client, regular_user):
        resp = client.post(f'{BASE}/auth/login/', {
            'username': regular_user.username,
            'password': 'SecurePass123!',
        }, format='json')
        assert resp.data['user']['role'] == 'user'
        assert resp.data['user']['is_admin'] is False

    def test_login_admin_user_has_is_admin_true(self, client, admin_user):
        resp = client.post(f'{BASE}/auth/login/', {
            'username': admin_user.username,
            'password': 'AdminPass123!',
        }, format='json')
        assert resp.status_code == 200
        assert resp.data['user']['is_admin'] is True


# ---------------------------------------------------------------------------
# /me/ endpoint
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.django_db
class TestMeEndpoint:

    def test_me_returns_current_user(self, auth_client):
        client, user = auth_client
        resp = client.get(f'{BASE}/users/me/')
        assert resp.status_code == 200
        assert resp.data['email'] == user.email
        assert resp.data['username'] == user.username

    def test_me_returns_full_name(self, auth_client):
        client, user = auth_client
        resp = client.get(f'{BASE}/users/me/')
        assert 'full_name' in resp.data
        assert user.name in resp.data['full_name']

    def test_me_unauthenticated_returns_401(self, client):
        resp = client.get(f'{BASE}/users/me/')
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Change password
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.django_db
class TestChangePassword:

    def test_change_password_success(self, auth_client):
        client, user = auth_client
        resp = client.post(f'{BASE}/users/{user.id}/change-password/', {
            'old_password': 'SecurePass123!',
            'new_password': 'NewSecure456!',
            'new_password_confirm': 'NewSecure456!',
        }, format='json')
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.check_password('NewSecure456!')

    def test_change_password_wrong_old_password_returns_400(self, auth_client):
        client, user = auth_client
        resp = client.post(f'{BASE}/users/{user.id}/change-password/', {
            'old_password': 'WrongOldPass!',
            'new_password': 'NewSecure456!',
            'new_password_confirm': 'NewSecure456!',
        }, format='json')
        assert resp.status_code == 400

    def test_change_password_mismatched_new_passwords_returns_400(self, auth_client):
        client, user = auth_client
        resp = client.post(f'{BASE}/users/{user.id}/change-password/', {
            'old_password': 'SecurePass123!',
            'new_password': 'NewSecure456!',
            'new_password_confirm': 'Different456!',
        }, format='json')
        assert resp.status_code == 400

    def test_change_another_users_password_returns_403(self, auth_client, admin_user):
        """Regular user cannot change another user's password."""
        client, user = auth_client
        resp = client.post(f'{BASE}/users/{admin_user.id}/change-password/', {
            'old_password': 'AdminPass123!',
            'new_password': 'Hacked456!',
            'new_password_confirm': 'Hacked456!',
        }, format='json')
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# List users (requires auth)
# ---------------------------------------------------------------------------

@pytest.mark.integration
@pytest.mark.django_db
class TestUserListPermissions:

    def test_list_users_requires_auth(self, client):
        resp = client.get(f'{BASE}/users/')
        assert resp.status_code in (401, 403)

    def test_authenticated_user_can_list_users(self, auth_client):
        client, _ = auth_client
        resp = client.get(f'{BASE}/users/')
        assert resp.status_code == 200
