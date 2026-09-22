/**
 * CommandCenterLayout - Dashboard visualization layout
 *
 * Light-themed WCAG-compliant layout with:
 * - FilterSidebar on the left
 * - Header with navigation tabs
 * - Main content area for dashboard grids
 */

import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { FilterProvider, useFilter } from '../contexts/FilterContext';
import { FilterSidebar } from '../components/organisms';
import { DASHBOARD_STAGES, DashboardStage, stageForPath } from '../utils/dashboardStages';

// Etapas en secuencia (llevan índice) y secciones fuera de la secuencia.
const pipelineStages = DASHBOARD_STAGES.filter((s) => s.index);
const extraStages = DASHBOARD_STAGES.filter((s) => !s.index);

const stageIcon: Record<DashboardStage['key'], string> = {
  prep: 'prep',
  vec: 'vec',
  mod: 'model',
  cls: 'cls',
  lab: 'lab',
  sum: 'sum',
};

// Icons for each section
const NavIcon: React.FC<{ type: string; className?: string }> = ({ type, className = '' }) => {
  const icons: Record<string, React.ReactNode> = {
    prep: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    vec: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    model: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    cls: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    lab: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    sum: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  };

  return <>{icons[type] || null}</>;
};

// Banner shown when the backend is waking up (HF Spaces cold start)
const BackendUnavailableBanner: React.FC = () => {
  const { backendUnavailable, refreshDatasets, isLoadingDatasets } = useFilter();
  if (!backendUnavailable) return null;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stage-mod/20 bg-stage-mod/[0.06] px-4 md:px-8 py-2.5 text-sm">
      <div className="flex items-center gap-2.5 text-stage-mod">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-stage-mod opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-stage-mod" />
        </span>
        <span>El servidor está iniciando (puede tardar ~60 s). Los datos se cargarán automáticamente.</span>
      </div>
      <button
        onClick={() => refreshDatasets()}
        disabled={isLoadingDatasets}
        className="shrink-0 rounded-lg border border-stage-mod/30 px-3 py-1 font-medium text-stage-mod transition-colors hover:bg-stage-mod/10 disabled:opacity-50"
      >
        {isLoadingDatasets ? 'Conectando…' : 'Reintentar'}
      </button>
    </div>
  );
};

// Pestaña del riel de etapas
const StageTab: React.FC<{ stage: DashboardStage; compact?: boolean }> = ({ stage, compact = false }) => (
  <NavLink
    to={stage.path}
    end={stage.end}
    className={({ isActive }) => `
      group relative flex items-center gap-2 whitespace-nowrap rounded-lg
      ${compact ? 'px-3 py-1.5' : 'px-2.5 xl:px-3 py-1.5'}
      text-sm transition-colors duration-200
      ${isActive ? `text-paper ${stage.tone.activeTab}` : 'text-mist hover:text-paper hover:bg-ink-800/70'}
    `}
  >
    {({ isActive }) => (
      <>
        {stage.index ? (
          <span className={`num font-mono text-[11px] font-medium ${isActive ? stage.tone.text : 'text-fog group-hover:text-mist'}`}>
            {stage.index}
          </span>
        ) : (
          <NavIcon
            type={stageIcon[stage.key]}
            className={`h-3.5 w-3.5 ${isActive ? stage.tone.text : 'text-fog group-hover:text-mist'}`}
          />
        )}
        <span>{stage.label}</span>
      </>
    )}
  </NavLink>
);

export const CommandCenterLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const etapaActual = stageForPath(useLocation().pathname);

  return (
    <FilterProvider>
      <div className="dashboard-shell flex h-screen overflow-hidden font-sans text-paper">
        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Filter Sidebar - Hidden on mobile, visible on desktop */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
            lg:relative lg:translate-x-0 lg:z-auto
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <FilterSidebar
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-ink-700 bg-ink-950/85 backdrop-blur-xl">
            <div className="flex h-16 items-center gap-3 px-4 md:px-8">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg p-2 text-mist transition-colors hover:bg-ink-800 hover:text-paper lg:hidden"
                aria-label="Abrir filtros"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Marca */}
              <div className="flex shrink-0 items-center gap-2.5">
                <img src="/Logo_tesis.png" alt="" className="h-7 w-auto" />
                <h1 className="hidden whitespace-nowrap font-display text-[15px] font-semibold tracking-[-0.01em] text-paper sm:block md:hidden xl:block">
                  Centro de Comando
                </h1>
              </div>

              {/* Riel de etapas */}
              <nav aria-label="Secciones del dashboard" className="ml-2 hidden min-w-0 items-center md:flex xl:ml-6">
                {pipelineStages.map((stage, i) => (
                  <React.Fragment key={stage.key}>
                    {i > 0 && <span aria-hidden="true" className="mx-0.5 h-px w-3 bg-ink-600 xl:w-5" />}
                    <StageTab stage={stage} />
                  </React.Fragment>
                ))}
                <span aria-hidden="true" className="mx-2 h-5 w-px bg-ink-600 xl:mx-3" />
                {extraStages.map((stage) => (
                  <StageTab key={stage.key} stage={stage} />
                ))}
              </nav>

              {/* Acciones */}
              <div className="ml-auto flex items-center">
                <NavLink
                  to="/admin/configuracion/datasets"
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-mist transition-colors hover:bg-ink-800 hover:text-paper"
                  title="Ir a Administración"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="hidden 2xl:inline">Administración</span>
                </NavLink>
              </div>
            </div>

            {/* Mobile navigation */}
            <nav aria-label="Secciones del dashboard" className="scrollbar-hide flex items-center gap-1 overflow-x-auto px-4 pb-3 md:hidden">
              {DASHBOARD_STAGES.map((stage) => (
                <StageTab key={stage.key} stage={stage} compact />
              ))}
            </nav>

            {/* Línea con el tono de la sección activa */}
            <div aria-hidden="true" className={`h-px bg-gradient-to-r from-transparent to-transparent ${etapaActual.tone.rule}`} />
          </header>

          {/* Backend unavailable banner */}
          <BackendUnavailableBanner />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </FilterProvider>
  );
};
