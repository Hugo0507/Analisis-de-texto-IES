"""
Tests de autorizacion del API de datasets.

DatasetViewSet usaba IsAdminUser de DRF, que mira is_staff, mientras el
frontend miraba role. Ahora usa IsAdminRole, que se apoya en User.is_admin.
Estos tests recorren el API de punta a punta para que la regla quede fijada
donde se aplica de verdad, no solo en la clase de permiso.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

BASE = '/api/v1/datasets/'


@pytest.fixture
def cliente():
    return APIClient()


@pytest.fixture
def usuario_normal(db):
    return User.objects.create_user(
        username='normal_ds', email='normal_ds@example.com',
        password='ClaveSegura123!', role='user',
    )


@pytest.fixture
def usuario_admin(db):
    return User.objects.create_user(
        username='admin_ds', email='admin_ds@example.com',
        password='ClaveSegura123!', role='admin',
    )


@pytest.fixture
def superusuario(db):
    return User.objects.create_superuser(
        username='super_ds', email='super_ds@example.com', password='ClaveSegura123!',
    )


@pytest.mark.integration
class TestPermisosDeDatasets:

    def test_el_anonimo_recibe_401(self, cliente):
        respuesta = cliente.get(BASE)
        assert respuesta.status_code == 401

    def test_el_usuario_normal_recibe_403(self, cliente, usuario_normal):
        """
        Antes bastaba con is_staff. Un usuario corriente autenticado no puede
        listar los datasets de la institucion.
        """
        cliente.force_authenticate(user=usuario_normal)
        respuesta = cliente.get(BASE)
        assert respuesta.status_code == 403

    def test_is_staff_por_si_solo_no_abre_la_puerta(self, cliente, usuario_normal):
        """is_staff gobierna el admin de Django, no este API."""
        usuario_normal.is_staff = True
        usuario_normal.save()
        cliente.force_authenticate(user=usuario_normal)
        respuesta = cliente.get(BASE)
        assert respuesta.status_code == 403

    def test_el_admin_entra(self, cliente, usuario_admin):
        cliente.force_authenticate(user=usuario_admin)
        respuesta = cliente.get(BASE)
        assert respuesta.status_code == 200

    def test_el_superusuario_entra(self, cliente, superusuario):
        cliente.force_authenticate(user=superusuario)
        respuesta = cliente.get(BASE)
        assert respuesta.status_code == 200

    def test_el_usuario_normal_no_puede_crear(self, cliente, usuario_normal):
        cliente.force_authenticate(user=usuario_normal)
        respuesta = cliente.post(BASE, {'name': 'prueba', 'source': 'upload'})
        assert respuesta.status_code == 403

    def test_el_usuario_normal_no_puede_borrar(self, cliente, usuario_normal):
        cliente.force_authenticate(user=usuario_normal)
        respuesta = cliente.delete(BASE + '1/')
        assert respuesta.status_code == 403
