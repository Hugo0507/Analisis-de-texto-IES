/**
 * Sidebar Component (Organism)
 *
 * Navigation sidebar with main menu items.
 * Shows different menus based on current route:
 * - /dashboard/* -> Analysis tools menu
 * - /admin/configuracion/* -> Configuration menu (Dark blue design)
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
    icon: '👥',
    description: 'Gestión de usuarios',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const location = useLocation();
  const { user } = useAuth();
  const isConfigRoute = location.pathname.startsWith('/admin/configuracion');
  const navItems = isConfigRoute ? configNavItems : analysisNavItems;

  // Sidebar for Configuration Routes - New Dark Design
  if (isConfigRoute) {
    return (
      <aside className={`w-64 bg-slate-900 min-h-screen flex flex-col ${className}`}>
        {/* Logo Institucional Top */}
        <div className="p-6 border-b border-slate-700">
          <div className="bg-white rounded-lg p-3 flex items-center justify-center">
            <span className="text-slate-900 font-bold text-lg">LOGO IES</span>
          </div>
        </div>

        {/* User Profile */}
        {user && (
          <div className="p-6 border-b border-slate-700">
            <div className="flex flex-col items-center">
              {/* Avatar Circle */}
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mb-3">
                <span className="text-white font-bold text-2xl">
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              {/* Username */}
              <h3 className="text-white font-semibold text-base mb-1">
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
          {configNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 mb-2 ${
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {/* User Group Icon */}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}

          {/* Link to Analysis Tools */}
          <div className="mt-auto pt-8">
            <NavLink
              to="/dashboard"
              className="flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium">Herramientas de Análisis</span>
            </NavLink>
          </div>
        </nav>

        {/* Logo Transformación Digital Bottom */}
        <div className="p-6 border-t border-slate-700">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg p-3 text-center">
            <span className="text-white font-bold text-xs uppercase tracking-wide">
              Transformación Digital
            </span>
          </div>
        </div>
      </aside>
    );
  }

  // Original Sidebar for Dashboard Routes
  return (
    <aside className={`w-64 bg-white shadow-lg min-h-screen ${className}`}>
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
