/**
 * Sidebar Component (Organism)
 *
 * Navigation sidebar with main menu items.
 * Shows different menus based on current route:
 * - /dashboard/* -> Analysis tools menu
 * - /admin/configuracion/* -> Configuration menu (Dark blue design)
 */

import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export interface SidebarProps {
  className?: string;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  description: string;
}

const analysisNavItems: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: '🏠',
    description: 'Vista general',
  },
  {
    path: '/dashboard/documents',
    label: 'Documentos',
    icon: '📄',
    description: 'Gestión de archivos',
  },
  {
    path: '/dashboard/bow',
    label: 'Bag of Words',
    icon: '📝',
    description: 'Análisis BoW',
  },
  {
    path: '/dashboard/tfidf',
    label: 'TF-IDF',
    icon: '📊',
    description: 'Vectores TF-IDF',
  },
  {
    path: '/dashboard/topics',
    label: 'Topic Modeling',
    icon: '🔍',
    description: 'LDA, NMF, LSA, pLSA',
  },
  {
    path: '/dashboard/factors',
    label: 'Análisis de Factores',
    icon: '🎯',
    description: '8 categorías',
  },
  {
    path: '/dashboard/statistics',
    label: 'Estadísticas',
    icon: '📈',
    description: 'Corpus y métricas',
  },
];

const configNavItems: NavItem[] = [
  {
    path: '/admin/configuracion/usuarios',
    label: 'Usuarios',
    icon: 'users',
    description: 'Gestión de usuarios',
  },
  {
    path: '/admin/configuracion/datasets',
    label: 'Conjunto de Datos',
    icon: 'database',
    description: 'Gestión de datasets',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isConfigRoute = location.pathname.startsWith('/admin/configuracion');
  const navItems = isConfigRoute ? configNavItems : analysisNavItems;

  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const logoutMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (logoutMenuRef.current && !logoutMenuRef.current.contains(event.target as Node)) {
        setShowLogoutMenu(false);
      }
    };

    if (showLogoutMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogoutMenu]);

  // Sidebar for Configuration Routes - New Dark Design
  if (isConfigRoute) {
    return (
      <aside className={`w-64 bg-slate-900 min-h-screen flex flex-col relative flex-shrink-0 ${className}`}>
        {/* Logo Institucional Top */}
        <div className="p-6 flex items-center justify-between">
          <img
            src="/Logo_tesis.png"
            alt="IES Logo"
            className="h-12 w-auto"
          />

          {/* Profile Icon - Top Right Corner */}
          {user && (
            <div className="relative" ref={logoutMenuRef}>
              <button
                onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                className="w-8 h-8 rounded-full border-2 border-slate-600 flex items-center justify-center hover:border-emerald-400 transition-colors"
                title="Menú de usuario"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              {/* Logout Dropdown Menu */}
              {showLogoutMenu && (
                <div
                  className="fixed bg-white rounded-lg border border-gray-200 py-2 z-[9999]"
                  style={{
                    top: '4.5rem',
                    left: '13rem',
                    width: '16rem',
                    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-xs text-gray-500">Logueado como</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors text-red-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-sm font-medium">Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        {user && (
          <div className="p-6">
            <div className="flex flex-col items-center">
              {/* Avatar Circle */}
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mb-3">
                <span className="text-white font-bold text-2xl">
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              {/* Username */}
              <h3 className="text-white font-semibold text-sm mb-1">
                {user.username}
              </h3>
              {/* Email */}
              <p className="text-slate-400 text-xs truncate w-full text-center">
                {user.email}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4">
          {/* CONFIGURACIÓN Title */}
          <h2 className="text-emerald-400 font-bold text-sm uppercase tracking-wider px-3 mb-4">
            CONFIGURACIÓN
          </h2>

          {/* Config Nav Items */}
          {configNavItems.map((item) => {
            // Check if current path starts with item path to highlight sub-routes
            const isActiveRoute = location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={() =>
                  `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 mb-2 ${
                    isActiveRoute
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                {/* Icon */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon === 'users' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  ) : item.icon === 'database' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  ) : null}
                </svg>
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            );
          })}

        </nav>

        {/* Logo Transformación Digital Bottom - Watermark */}
        <div className="p-6 mt-auto">
          <img
            src="/Logo_tesis.png"
            alt="Transformación Digital"
            className="h-14 w-auto mx-auto opacity-30"
          />
        </div>
      </aside>
    );
  }

  // Original Sidebar for Dashboard Routes
  return (
    <aside className={`w-64 bg-white shadow-lg min-h-screen flex-shrink-0 ${className}`}>
      <nav className="p-4 space-y-2">
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
            Navegación Principal
          </h2>
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <span className="text-2xl">{item.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          </NavLink>
        ))}

        {/* Pipeline Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
            Procesamiento
          </h2>

          <NavLink
            to="/dashboard/pipeline"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-green-50 text-green-700 font-medium shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <span className="text-2xl">⚙️</span>
            <div className="flex-1">
              <div className="text-sm font-medium">Pipeline NLP</div>
              <div className="text-xs text-gray-500">Ejecución completa</div>
            </div>
          </NavLink>
        </div>

        {/* Link to Configuration */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
            Ir a
          </h2>

          <NavLink
            to="/admin"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            <span className="text-2xl">⚙️</span>
            <div className="flex-1">
              <div className="text-sm font-medium">Configuración</div>
              <div className="text-xs text-gray-500">Iniciar sesión</div>
            </div>
          </NavLink>
        </div>
      </nav>
    </aside>
  );
};
