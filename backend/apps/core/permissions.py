"""
Permisos compartidos.

El proyecto tenia tres definiciones distintas de "es administrador" y cada
capa consultaba una:

  - User.role == 'admin'      lo miraba el frontend en Users.tsx
  - User.is_admin (property)  role == 'admin' or is_superuser
  - User.is_staff             lo mira IsAdminUser de DRF

De ahi el sintoma que las delataba: una cuenta podia ser rechazada por una
pantalla y aceptada por otra. IsAdminRole fija una sola fuente de verdad, la
propiedad is_admin del modelo, para que backend y frontend decidan igual.
"""

from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """
    Permite el acceso solo a administradores de la aplicacion.

    Se apoya en User.is_admin, que es `role == 'admin' or is_superuser`. No usa
    is_staff: ese campo gobierna el admin de Django, que es otra cosa.
    """

    message = 'Se requiere rol de administrador.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, 'is_admin', False))


class IsAdminRoleOrReadOnlySelf(BasePermission):
    """
    Administradores con acceso completo; el resto solo a su propio usuario.

    Pensado para UserViewSet: cualquiera autenticado necesita leer /users/me/
    y cambiar su propia contrasena, pero listar o editar otras cuentas es
    cosa de administradores.
    """

    message = 'Solo puedes consultar o modificar tu propio usuario.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if getattr(user, 'is_admin', False):
            return True
        return obj.pk == user.pk
