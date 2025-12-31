/**
 * Users Page - New Clean Design
 *
 * Simplified user management interface with modern, minimal aesthetics.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService, { User } from '../services/authService';
import { Spinner } from '../components/atoms';

export const Users: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await authService.getUsers();
      setUsers(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail ||
                          err.message ||
                          'Error al cargar usuarios';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      return;
    }

    try {
      await authService.deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      alert('Error al eliminar usuario: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getRoleBadge = (role: string) => {
    return role === 'admin'
      ? <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">Admin</span>
      : <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">User</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        {/* Title with List Icon */}
        <div className="flex items-center gap-3">
          {/* List Icon - Three horizontal lines (minimalist) */}
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de Usuarios</h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Refresh Button - Circular (minimalist) */}
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="p-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refrescar lista"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Add Button - Circular Green with Plus */}
          <button
            onClick={() => navigate('/admin/configuracion/usuarios/nuevo')}
            className="p-3 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-all shadow-md hover:shadow-lg"
            title="Crear usuario"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Data Table Container - Rounded White Box */}
      <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)' }}>
        {users.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay usuarios registrados
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Comienza creando tu primer usuario
            </p>
            <button
              onClick={() => navigate('/admin/configuracion/usuarios/nuevo')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Usuario
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/configuracion/usuarios/${user.id}`)}
                  >
                    {/* ID Column - Formatted with leading zero */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </td>

                    {/* Nombre Column - Clean text only */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {user.full_name || user.username}
                      </span>
                    </td>

                    {/* Email Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {user.email}
                      </span>
                    </td>

                    {/* Rol Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>

                    {/* Acciones Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/admin/configuracion/usuarios/${user.id}`)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Ver detalles"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
