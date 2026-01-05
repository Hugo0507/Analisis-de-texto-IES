/**
 * Protected Route Component
 *
 * Wrapper for routes that require authentication.
 * Redirects to login if user is not authenticated.
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../atoms';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('🔒 [ProtectedRoute] Verificando autenticación:', { isAuthenticated, isLoading });

  if (isLoading) {
    console.log('🔒 [ProtectedRoute] Cargando autenticación...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🔒 [ProtectedRoute] ❌ NO autenticado - Redirigiendo a /admin');
    return <Navigate to="/admin" replace />;
  }

  console.log('🔒 [ProtectedRoute] ✅ Autenticado - Permitiendo acceso');
  return <Outlet />;
};
