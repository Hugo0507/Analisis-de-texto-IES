/**
 * User Detail Page
 *
 * Display/Edit user information.
 * Supports both read-only and edit modes.
 * Only admins can edit users.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import authService, { User } from '../services/authService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

export const UserDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
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
    password: '',
    password_confirm: '',
  });

  useEffect(() => {
    if (!id) {
      navigate('/admin/configuracion/usuarios');
      return;
    }

    // Check admin permissions for edit mode
    if (isEditMode && currentUser && currentUser.role !== 'admin') {
      showError('No tienes permisos para editar usuarios');
      navigate(`/admin/configuracion/usuarios/${id}`);
      return;
    }

    loadUser();
  }, [id, isEditMode, currentUser]);

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
        password: '',
        password_confirm: '',
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

    // Validate password if provided
    if (formData.password) {
      if (formData.password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres');
        setIsSaving(false);
        return;
      }
      if (formData.password !== formData.password_confirm) {
        setError('Las contraseñas no coinciden');
        setIsSaving(false);
        return;
      }

      // Password strength validation
      const hasUpperCase = /[A-Z]/.test(formData.password);
      const hasLowerCase = /[a-z]/.test(formData.password);
      const hasNumber = /\d/.test(formData.password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);

      if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
        setError('La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales');
        setIsSaving(false);
        return;
      }
    }

    try {
      // Only include password in update if it was provided
      const updateData = formData.password
        ? formData
        : {
            username: formData.username,
            email: formData.email,
            name: formData.name,
            surname: formData.surname,
            role: formData.role,
            is_active: formData.is_active,
          };

      const updatedUser = await authService.updateUser(parseInt(id), updateData);
      showSuccess(`Usuario "${updatedUser.username}" actualizado exitosamente`);
      // Reload user data
      await loadUser();
      // Navigate back to view mode
      navigate(`/admin/configuracion/usuarios/${id}`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail ||
                          err.response?.data?.email?.[0] ||
                          err.response?.data?.username?.[0] ||
                          err.response?.data?.password?.[0] ||
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
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left: Back Button + Avatar + User Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/configuracion/usuarios')}
              className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              title="Volver a usuarios"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            {/* User Avatar - Emerald Gradient */}
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {user.name?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
              </span>
            </div>

            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {user.full_name || user.username}
              </h1>
              <p className="text-xs text-gray-600">@{user.username}</p>
            </div>
          </div>

          {/* Right: Save Button - Only in Edit Mode */}
          {isEditMode && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              title="Guardar cambios"
            >
              {isSaving ? (
                <Spinner size="sm" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
      <div className="space-y-5">

      {/* Personal Data Card */}
      <div className="bg-white p-7" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900">Datos Personales</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
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
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
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
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
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
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                disabled={isSaving}
              />
            ) : (
              <p className="text-sm text-gray-900">{user.surname || '—'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Permissions Card */}
      <div className="bg-white p-7" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        <div className="mb-5">
          <h2 className="text-base font-semibold text-gray-900">Permisos y Estado</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
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

      {/* Password Card - Edit Mode Only */}
      {isEditMode && (
        <div className="bg-white p-7" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Contraseña del usuario</h2>
            <p className="text-sm text-gray-600 mt-1">Asignar / Cambiar contraseña</p>
          </div>

          {/* Password Requirements Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700 font-medium mb-3">
              Por su seguridad, la contraseña debe cumplir con los siguientes requisitos:
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Tener al menos 8 caracteres.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Incluir al menos una letra mayúscula (A-Z).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Incluir al menos una letra minúscula (a-z).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Incluir al menos un número (0-9).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Incluir al menos un carácter especial como (!, @, #, $, %, etc.).</span>
              </li>
            </ul>
            <p className="text-sm text-gray-600 mt-3 italic">
              Le recomendamos no utilizar información personal fácilmente identificable como nombres, fechas o números de identificación en su contraseña.
            </p>
          </div>

          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Nota:</strong> Deja los campos vacíos si no deseas cambiar la contraseña actual.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Nueva Contraseña
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
                disabled={isSaving}
                autoComplete="new-password"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                id="password_confirm"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleChange}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
                disabled={isSaving}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>
      )}

      {/* Info Box - View Mode Only */}
      {!isEditMode && (
        <div className="bg-blue-50 border border-blue-200 p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
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
    </div>
  );
};
