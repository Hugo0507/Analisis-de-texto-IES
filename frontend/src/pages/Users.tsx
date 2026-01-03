/**
 * Users Page - New Clean Design
 *
 * Simplified user management interface with modern, minimal aesthetics.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import authService, { User } from '../services/authService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

export const Users: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isSelfDelete, setIsSelfDelete] = useState(false);

  // Check admin permissions on mount
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role !== 'admin') {
      showError('No tienes permisos para acceder a esta página');
      navigate('/dashboard');
      return;
    }

    loadUsers();
  }, [currentUser, navigate, showError]);

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

  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setIsSelfDelete(currentUser?.id === user.id);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
    setIsSelfDelete(false);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await authService.deleteUser(userToDelete.id);

      // If user deleted themselves, logout and redirect to login
      if (isSelfDelete) {
        showSuccess('Tu cuenta ha sido eliminada. Serás redirigido al login.');
        closeDeleteModal();

        // Wait for toast to show, then logout
        setTimeout(() => {
          logout();
          navigate('/admin');
        }, 1500);
      } else {
        showSuccess(`Usuario "${userToDelete.full_name || userToDelete.username}" eliminado exitosamente`);
        closeDeleteModal();
        await loadUsers();
      }
    } catch (err: any) {
      const errorMessage = 'Error al eliminar usuario: ' + (err.response?.data?.detail || err.message);
      setError(errorMessage);
      showError('Error al eliminar usuario');
      closeDeleteModal();
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
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left: Icon + Title */}
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <h1 className="text-xl font-semibold text-gray-900">Configuración de Usuarios</h1>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={loadUsers}
              disabled={isLoading}
              className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refrescar lista"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Add Button - Only for admins */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin/configuracion/usuarios/nuevo')}
                className="p-3 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-all shadow-md hover:shadow-lg"
                title="Crear usuario"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

      {/* Data Table Container - Rounded White Box */}
      <div className="bg-white p-7" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        {users.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay usuarios registrados
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {currentUser?.role === 'admin'
                ? 'Comienza creando tu primer usuario'
                : 'No tienes permisos para gestionar usuarios'}
            </p>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin/configuracion/usuarios/nuevo')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Usuario
              </button>
            )}
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

                    {/* Acciones Column - Only for admins */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {currentUser?.role === 'admin' ? (
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {/* Editar Button */}
                          <button
                            onClick={() => navigate(`/admin/configuracion/usuarios/${user.id}/editar`)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Editar usuario"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Eliminar Button */}
                          <button
                            onClick={() => openDeleteModal(user)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar usuario"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sin permisos</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-md w-full mx-4" style={{ borderRadius: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isSelfDelete ? '⚠️ ¿Eliminar tu propia cuenta?' : '¿Eliminar usuario?'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {isSelfDelete ? (
                <>
                  Esta acción no se puede deshacer. <strong>Serás desconectado del sistema</strong> y tu cuenta{' '}
                  <strong>{userToDelete.full_name || userToDelete.username}</strong> será eliminada permanentemente.
                  <br /><br />
                  ¿Estás seguro de que quieres continuar?
                </>
              ) : (
                <>
                  Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar a{' '}
                  <strong>{userToDelete.full_name || userToDelete.username}</strong>?
                </>
              )}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium text-sm"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
