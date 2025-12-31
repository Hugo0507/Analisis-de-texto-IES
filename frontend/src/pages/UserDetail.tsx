/**
 * User Detail Page
 *
 * Display user information in read-only mode.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import authService, { User } from '../services/authService';
import { Spinner } from '../components/atoms';

export const UserDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      navigate('/admin/configuracion/usuarios');
      return;
    }

    loadUser();
  }, [id]);

  const loadUser = async () => {
    if (!id) return;

    setIsLoading(true);
    setError('');

    try {
      const data = await authService.getUserById(parseInt(id));
      setUser(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail ||
                          err.message ||
                          'Error al cargar usuario';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error || 'Usuario no encontrado'}
        </div>
        <button
          onClick={() => navigate('/admin/configuracion/usuarios')}
          className="p-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors shadow-sm"
          title="Volver a usuarios"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {/* Back Arrow Button - Circular */}
          <button
            onClick={() => navigate('/admin/configuracion/usuarios')}
            className="p-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors shadow-sm"
            title="Volver a usuarios"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          {/* User Avatar - Emerald Gradient */}
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-2xl">
              {user.name?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.full_name || user.username}
            </h1>
            <p className="text-sm text-gray-600">@{user.username}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">

      {/* Personal Data Card */}
      <div className="bg-white rounded-3xl shadow-sm p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Datos Personales</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Nombre de Usuario
            </label>
            <p className="text-base text-gray-900">{user.username}</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Correo Electrónico
            </label>
            <p className="text-base text-gray-900">{user.email}</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Nombre
            </label>
            <p className="text-base text-gray-900">{user.name || '—'}</p>
          </div>

          {/* Surname */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Apellido
            </label>
            <p className="text-base text-gray-900">{user.surname || '—'}</p>
          </div>
        </div>
      </div>

      {/* Permissions Card */}
      <div className="bg-white rounded-3xl shadow-sm p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Permisos y Estado</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Rol
            </label>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
              user.role === 'admin'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {user.role === 'admin' ? 'Administrador' : 'Usuario'}
            </span>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Estado
            </label>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
              user.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {user.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>

          {/* Created At */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Fecha de Creación
            </label>
            <p className="text-base text-gray-900">
              {new Date(user.created_at).toLocaleString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          {/* Updated At */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Última Actualización
            </label>
            <p className="text-base text-gray-900">
              {new Date(user.updated_at).toLocaleString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              <strong>Nota:</strong> Esta es una vista de solo lectura. Para modificar la información del usuario,
              contacta con un administrador del sistema.
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
