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
  onClose?: () => void;
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
    label: 'Preprocesamiento',
    icon: '📊',
    description: 'Métricas de limpieza',
  },
  {
    path: '/dashboard/vectorizacion',
    label: 'Vectorización',
    icon: '🔢',
    description: 'Análisis de vectores',
  },
  {
    path: '/dashboard/modelado',
    label: 'Modelado',
    icon: '🧠',
    description: 'Modelos NLP',
  },
  {
    path: '/dashboard/ia',
    label: 'IA',
    icon: '🤖',
    description: 'Análisis IA',
  },
  {
    path: '/dashboard/resumen',
    label: 'Resumen',
    icon: '📈',
    description: 'Vista general',
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

const preprocessingNavItems: NavItem[] = [
  {
    path: '/admin/preprocesamiento/preparacion-datos',
    label: 'Preparación de los Datos',
    icon: 'prepare',
    description: 'Limpieza y transformación',
  },
];

const vectorizationNavItems: NavItem[] = [
  {
    path: '/admin/vectorizacion/bolsa-palabras',
    label: 'Bolsa de Palabras',
    icon: 'bag-of-words',
    description: 'Análisis BoW vectorizado',
  },
  {
    path: '/admin/vectorizacion/n-gramas',
    label: 'Análisis de N-gramas',
    icon: 'n-grams',
    description: 'Comparación de configuraciones',
  },
  {
    path: '/admin/vectorizacion/tf-idf',
    label: 'Matriz TF-IDF',
    icon: 'tfidf',
    description: 'Frecuencia término-documento',
  },
];

const analysisAdminNavItems: NavItem[] = [
  {
    path: '/admin/analisis/analisis-de-factores',
    label: 'Análisis de Factores',
    icon: 'factors',
    description: 'Factores de transformación digital',
  },
];

const modelingNavItems: NavItem[] = [
  {
    path: '/admin/modelado/ner',
    label: 'NER (Entidades)',
    icon: 'ner',
    description: 'Reconocimiento de entidades nombradas',
  },
  {
    path: '/admin/modelado/topic-modeling',
    label: 'Topic Modeling',
    icon: 'topic-modeling',
    description: 'Modelado de tópicos (LSA, NMF, PLSA, LDA)',
  },
  {
    path: '/admin/modelado/bertopic',
    label: 'BERTopic',
    icon: 'bertopic',
    description: 'Topic Modeling con BERT (UMAP + HDBSCAN)',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ className = '', onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin/');

  // Handle navigation click - close sidebar on mobile
  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };


  // For dashboard routes, use analysisNavItems
  const navItems = analysisNavItems;

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

  // Sidebar for Admin Routes (Configuration & Preprocessing) - Dark Design
  if (isAdminRoute && location.pathname !== '/admin' && location.pathname !== '/admin/forgot-password') {
    return (
      <aside className={`w-64 bg-slate-900 h-screen flex flex-col relative flex-shrink-0 overflow-y-auto scrollbar-hide ${className}`}>
        {/* Logo Institucional Top */}
        <div className="p-6 flex items-center justify-between">
          {/* Close button - Mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors mr-2"
            aria-label="Cerrar menú"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
          {/* CONFIGURACIÓN Section */}
          <div className="mb-6">
            <h2 className="text-emerald-400 font-bold text-sm uppercase tracking-wider px-3 mb-4">
              CONFIGURACIÓN
            </h2>

            {configNavItems.map((item) => {
              const isActiveRoute = location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
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
          </div>

          {/* PREPROCESAMIENTO Section */}
          <div className="mb-6">
            <h2 className="text-emerald-400 font-bold text-sm uppercase tracking-wider px-3 mb-4">
              PREPROCESAMIENTO
            </h2>

            {preprocessingNavItems.map((item) => {
              const isActiveRoute = location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
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
                    {item.icon === 'prepare' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    )}
                  </svg>
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* VECTORIZACIÓN Section */}
          <div className="mb-6">
            <h2 className="text-emerald-400 font-bold text-sm uppercase tracking-wider px-3 mb-4">
              VECTORIZACIÓN
            </h2>

            {vectorizationNavItems.map((item) => {
              const isActiveRoute = location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
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
                    {item.icon === 'bag-of-words' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    ) : item.icon === 'n-grams' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    ) : item.icon === 'tfidf' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    ) : null}
                  </svg>
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* ANÁLISIS Section */}
          <div className="mb-6">
            <h2 className="text-emerald-400 font-bold text-sm uppercase tracking-wider px-3 mb-4">
              ANÁLISIS
            </h2>

            {analysisAdminNavItems.map((item) => {
              const isActiveRoute = location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={() =>
                    `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 mb-2 ${
                      isActiveRoute
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon === 'factors' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    )}
                  </svg>
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* MODELADO Section */}
          <div className="mb-6">
            <h2 className="text-emerald-400 font-bold text-sm uppercase tracking-wider px-3 mb-4">
              MODELADO
            </h2>

            {modelingNavItems.map((item) => {
              const isActiveRoute = location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
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
                    {item.icon === 'ner' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    ) : item.icon === 'topic-modeling' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    ) : item.icon === 'bertopic' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    ) : null}
                  </svg>
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </div>

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
    <aside className={`w-64 bg-white shadow-lg h-screen flex-shrink-0 flex flex-col overflow-y-auto scrollbar-hide ${className}`}>
      {/* Close button - Mobile only */}
      <div className="lg:hidden p-4 flex items-center justify-between border-b border-gray-200">
        <img
          src="/Logo_tesis.png"
          alt="IES Logo"
          className="h-8 w-auto"
        />
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Cerrar menú"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="p-4 space-y-2 flex-1">
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
            Navegación Principal
          </h2>
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={handleNavClick}
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

        {/* Link to Configuration */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
            Ir a
          </h2>

          <NavLink
            to="/admin"
            onClick={handleNavClick}
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
