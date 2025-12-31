/**
 * User Detail Page
 *
 * Display/Edit user information.
 * Supports both read-only and edit modes.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import authService, { User } from '../services/authService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

export const UserDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Detect edit mode from URL
  const isEditMode = location.pathname.endsWith('/editar');

  // Form state for edit mode
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    name: '',
    surname: '',
    role: 'user' as 'admin' | 'user',
    is_active: true,
  });

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
      // Initialize form data with user data
      setFormData({
        username: data.username,
        email: data.email,
        name: data.name || '',
        surname: data.surname || '',
        role: data.role,
        is_active: data.is_active,
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail ||
                          err.message ||
                          'Error al cargar usuario';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!id) return;

    setIsSaving(true);
    setError('');

    try {
      const updatedUser = await authService.updateUser(parseInt(id), formData);
      showSuccess(`Usuario "${updatedUser.username}" actualizado exitosamente`);
      // Reload user data
      await loadUser();
      // Navigate back to view mode
      navigate(`/admin/configuracion/usuarios/${id}`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail ||
                          err.response?.data?.email?.[0] ||
                          err.response?.data?.username?.[0] ||
                          err.message ||
                          'Error al actualizar usuario';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSaving(false);
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
      <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)' }}>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Datos Personales</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de Usuario {isEditMode && <span className="text-red-500">*</span>}
            </label>
            {isEditMode ? (
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm"
                required
                disabled={isSaving}
              />
            ) : (
              <p className="text-sm text-gray-900">{user.username}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico {isEditMode && <span className="text-red-500">*</span>}
            </label>
            {isEditMode ? (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm"
                required
                disabled={isSaving}
              />
            ) : (
              <p className="text-sm text-gray-900">{user.email}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre
            </label>
            {isEditMode ? (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm"
                disabled={isSaving}
              />
            ) : (
              <p className="text-sm text-gray-900">{user.name || '—'}</p>
            )}
          </div>

          {/* Surname */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Apellido
            </label>
            {isEditMode ? (
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm"
                disabled={isSaving}
              />
            ) : (
              <p className="text-sm text-gray-900">{user.surname || '—'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Permissions Card */}
      <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)' }}>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Permisos y Estado</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol {isEditMode && <span className="text-red-500">*</span>}
            </label>
            {isEditMode ? (
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm"
                required
                disabled={isSaving}
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            ) : (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                user.role === 'admin'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {user.role === 'admin' ? 'Administrador' : 'Usuario'}
              </span>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            {isEditMode ? (
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  disabled={isSaving}
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Usuario activo
                </span>
              </label>
            ) : (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                user.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {user.is_active ? 'Activo' : 'Inactivo'}
              </span>
            )}
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

      {/* Action Buttons - Edit Mode */}
      {isEditMode && (
        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)' }}>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/admin/configuracion/usuarios/${id}`)}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-medium text-sm"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium text-sm shadow-md"
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" />
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Info Box - View Mode Only */}
      {!isEditMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6" style={{ boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)' }}>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-blue-900">
                <strong>Nota:</strong> Esta es una vista de solo lectura. Para modificar la información del usuario,
                haz clic en el botón "Editar" en la tabla de usuarios.
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
