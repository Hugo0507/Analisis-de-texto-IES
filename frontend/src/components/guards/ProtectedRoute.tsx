/**
 * Protected Route Component
 *
 * Envuelve rutas que requieren sesion y, opcionalmente, rol de administrador.
 *
 * Antes solo comprobaba `isAuthenticated`, nunca el rol. Como el area /admin
 * completa cuelga de este guard, cualquier usuario con sesion valida alcanzaba
 * todas sus pantallas. El sintoma que lo delataba: una cuenta rechazada por
 * Users.tsx -que si miraba el rol- entraba sin problema al resto del area
 * escribiendo la URL directamente.
 *
 * La decision usa `is_admin`, la misma propiedad que aplica el backend en
 * IsAdminRole (`role === 'admin' || is_superuser`), para que ambos lados
 * respondan igual.
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../atoms';

export interface ProtectedRouteProps {
  /** Exige rol de administrador ademas de sesion iniciada. */
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requireAdmin = false }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  // Sin permisos de administrador no se entra al area de gestion. Se manda al
  // dashboard publico, que si es accesible para cualquiera.
  if (requireAdmin && !user?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
