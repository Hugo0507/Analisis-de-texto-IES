/**
 * Header Component (Organism)
 *
 * Main application header with navigation and user info.
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  return (
    <header className={`bg-white shadow-md ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link to="/admin/dashboard" className="flex items-center space-x-3">
            <div className="text-3xl">📊</div>
            <div>
              <h1 className="text-xl font-bold text-navy-900">
                Análisis de Transformación Digital
              </h1>
              <p className="text-xs text-gray-600">
                Plataforma NLP/ML para Educación Superior
              </p>
            </div>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-xs text-gray-600">
                    {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </p>
                </div>

                <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user.name?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600 transition-colors"
              title="Cerrar sesión"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
