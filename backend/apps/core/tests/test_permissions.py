"""
Tests de las clases de permisos compartidas.

El proyecto tenia tres definiciones rivales de "es administrador" y cada capa
consultaba una distinta, asi que una misma cuenta podia ser rechazada por una
pantalla y aceptada por otra. IsAdminRole fija una sola fuente de verdad
-User.is_admin- y estos tests la clavan para que no vuelva a divergir.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

from apps.core.permissions import IsAdminRole, IsAdminRoleOrReadOnlySelf

User = get_user_model()


@pytest.fixture
def peticion():
    return APIRequestFactory().get('/')


@pytest.fixture
def usuario_normal(db):
    return User.objects.create_user(
        username='normal', email='normal@example.com',
        password='ClaveSegura123!', role='user',
    )


@pytest.fixture
def usuario_admin(db):
    return User.objects.create_user(
        username='administrador', email='admin@example.com',
        password='ClaveSegura123!', role='admin',
    )


@pytest.fixture
def superusuario(db):
    return User.objects.create_superuser(
        username='super', email='super@example.com', password='ClaveSegura123!',
    )


# ---------------------------------------------------------------------------
# IsAdminRole
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestIsAdminRole:

    def test_rechaza_al_anonimo(self, peticion):
        """Sin sesion no hay acceso, aunque el usuario sea AnonymousUser."""
        from django.contrib.auth.models import AnonymousUser
        peticion.user = AnonymousUser()
        assert IsAdminRole().has_permission(peticion, None) is False

    def test_rechaza_cuando_no_hay_usuario(self, peticion):
        """request.user puede ser None si no hay middleware de autenticacion."""
        peticion.user = None
        assert IsAdminRole().has_permission(peticion, None) is False

    def test_rechaza_al_usuario_normal(self, peticion, usuario_normal):
        peticion.user = usuario_normal
        assert IsAdminRole().has_permission(peticion, None) is False

    def test_acepta_al_rol_admin(self, peticion, usuario_admin):
        peticion.user = usuario_admin
        assert IsAdminRole().has_permission(peticion, None) is True

    def test_acepta_al_superusuario(self, peticion, superusuario):
        """is_admin es `role == 'admin' or is_superuser`: ambas vias valen."""
        peticion.user = superusuario
        assert IsAdminRole().has_permission(peticion, None) is True

    def test_no_se_apoya_en_is_staff(self, peticion, usuario_normal):
        """
        is_staff gobierna el admin de Django, no la autorizacion del API.

        Este es justo el error que tenia IsAdminUser de DRF y que provocaba la
        incoherencia: dar acceso al API por marcar una casilla del admin.
        """
        usuario_normal.is_staff = True
        usuario_normal.save()
        peticion.user = usuario_normal

        assert usuario_normal.is_admin is False
        assert IsAdminRole().has_permission(peticion, None) is False


# ---------------------------------------------------------------------------
# IsAdminRoleOrReadOnlySelf
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestIsAdminRoleOrReadOnlySelf:

    def test_exige_sesion(self, peticion):
        from django.contrib.auth.models import AnonymousUser
        peticion.user = AnonymousUser()
        assert IsAdminRoleOrReadOnlySelf().has_permission(peticion, None) is False

    def test_cualquier_autenticado_pasa_el_filtro_general(self, peticion, usuario_normal):
        peticion.user = usuario_normal
        assert IsAdminRoleOrReadOnlySelf().has_permission(peticion, None) is True

    def test_el_usuario_alcanza_su_propio_objeto(self, peticion, usuario_normal):
        peticion.user = usuario_normal
        assert IsAdminRoleOrReadOnlySelf().has_object_permission(
            peticion, None, usuario_normal) is True

    def test_el_usuario_no_alcanza_a_otro(self, peticion, usuario_normal, usuario_admin):
        peticion.user = usuario_normal
        assert IsAdminRoleOrReadOnlySelf().has_object_permission(
            peticion, None, usuario_admin) is False

    def test_el_admin_alcanza_a_cualquiera(self, peticion, usuario_admin, usuario_normal):
        peticion.user = usuario_admin
        assert IsAdminRoleOrReadOnlySelf().has_object_permission(
            peticion, None, usuario_normal) is True


# ---------------------------------------------------------------------------
# Coherencia del modelo
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestCoherenciaDeIsAdmin:

    def test_el_superusuario_nace_con_rol_admin(self, superusuario):
        """
        create_superuser dejaba el rol por defecto ('user'), y de ahi salia la
        contradiccion: el backend lo trataba de administrador y la ficha del
        usuario lo mostraba como "Usuario". CustomUserManager lo corrige.
        """
        assert superusuario.role == 'admin'
        assert superusuario.is_superuser is True
        assert superusuario.is_admin is True

    def test_el_usuario_normal_no_es_admin(self, usuario_normal):
        assert usuario_normal.is_admin is False
