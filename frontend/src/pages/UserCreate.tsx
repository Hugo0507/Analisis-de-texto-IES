/**
 * User Create Page
 *
 * Form to create a new user with validation.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { Spinner } from '../components/atoms';

export const UserCreate: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    name: '',
    surname: '',
    password: '',
    password_confirm: '',
    role: 'user' as 'admin' | 'user',
    is_active: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = (): string | null => {
    if (!formData.username.trim()) return 'El nombre de usuario es requerido';
    if (!formData.email.trim()) return 'El correo electrónico es requerido';
    if (!formData.password) return 'La contraseña es requerida';
    if (formData.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (formData.password !== formData.password_confirm) return 'Las contraseñas no coinciden';

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumber = /\d/.test(formData.password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      await authService.createUser(formData);
      navigate('/admin/configuracion/usuarios');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail ||
                          err.response?.data?.email?.[0] ||
                          err.response?.data?.username?.[0] ||
                          err.response?.data?.password?.[0] ||
                          err.message ||
                          'Error al crear usuario';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
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
          <h1 className="text-2xl font-bold text-gray-900">Crear Usuario</h1>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Data Card */}
        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)' }}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Datos Personales</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de Usuario <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="usuario123"
                required
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="usuario@ejemplo.com"
                required
                disabled={isLoading}
              />
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="Juan"
                disabled={isLoading}
              />
            </div>

            {/* Surname */}
            <div>
              <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-2">
                Apellido
              </label>
              <input
                type="text"
                id="surname"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="Pérez"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Permissions Card */}
        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)' }}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Permisos</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Rol <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                required
                disabled={isLoading}
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* Active Status */}
            <div className="flex items-center h-full pt-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  disabled={isLoading}
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Usuario activo
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Password Card */}
        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)' }}>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Contraseña</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isLoading}
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Mínimo 8 caracteres con mayúsculas, minúsculas, números y caracteres especiales
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Contraseña <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password_confirm"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 bg-white rounded-3xl p-8" style={{ boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)' }}>
          <button
            type="button"
            onClick={() => navigate('/admin/configuracion/usuarios')}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-medium"
            disabled={isLoading}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-md"
          >
            {isLoading ? (
              <>
                <Spinner size="sm" />
                Creando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Crear Usuario
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
