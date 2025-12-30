/**
 * Sidebar Component (Organism)
 *
 * Navigation sidebar with main menu items.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';

export interface SidebarProps {
  className?: string;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    path: '/admin/dashboard',
    label: 'Dashboard',
    icon: '🏠',
    description: 'Vista general',
  },
  {
    path: '/admin/dashboard/documents',
    label: 'Documentos',
    icon: '📄',
    description: 'Gestión de archivos',
  },
  {
    path: '/admin/dashboard/bow',
    label: 'Bag of Words',
    icon: '📝',
    description: 'Análisis BoW',
  },
  {
    path: '/admin/dashboard/tfidf',
    label: 'TF-IDF',
    icon: '📊',
    description: 'Vectores TF-IDF',
  },
  {
    path: '/admin/dashboard/topics',
    label: 'Topic Modeling',
    icon: '🔍',
    description: 'LDA, NMF, LSA, pLSA',
  },
  {
    path: '/admin/dashboard/factors',
    label: 'Análisis de Factores',
    icon: '🎯',
    description: '8 categorías',
  },
  {
    path: '/admin/dashboard/statistics',
    label: 'Estadísticas',
    icon: '📈',
    description: 'Corpus y métricas',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
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
            to="/admin/dashboard/pipeline"
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

        {/* Admin Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
            Configuración
          </h2>

          <NavLink
            to="/configuracion/usuarios"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <span className="text-2xl">👥</span>
            <div className="flex-1">
              <div className="text-sm font-medium">Usuarios</div>
              <div className="text-xs text-gray-500">Gestión de usuarios</div>
            </div>
          </NavLink>
        </div>
      </nav>
    </aside>
  );
};
