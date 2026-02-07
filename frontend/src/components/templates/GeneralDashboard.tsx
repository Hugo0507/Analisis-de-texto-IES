/**
 * GeneralDashboard - Summary/Overview dashboard
 *
 * Aggregated view of all pipeline phases.
 */

import React from 'react';
import { DashboardGrid, MetricCardDark } from '../organisms';
import { ChartCard } from '../molecules';

export const GeneralDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-white">Resumen General</h2>
        <p className="text-slate-400 text-sm mt-1">
          Vista consolidada de todas las fases del pipeline de análisis
        </p>
      </div>

      {/* Coming Soon */}
      <ChartCard
        title="En Desarrollo"
        subtitle="Esta sección estará disponible próximamente"
        accentColor="emerald"
        size="lg"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
      >
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Dashboard de Resumen</h3>
          <p className="text-slate-400 max-w-md">
            Vista ejecutiva con KPIs principales de todo el pipeline,
            tendencias históricas, y métricas agregadas de todas las fases.
          </p>
        </div>
      </ChartCard>

      {/* Summary Cards */}
      <DashboardGrid columns={4} gap="md">
        <MetricCardDark
          title="Preprocesamiento"
          value="—"
          subtitle="Archivos procesados"
          accentColor="cyan"
        />
        <MetricCardDark
          title="Vectorización"
          value="—"
          subtitle="Términos únicos"
          accentColor="blue"
        />
        <MetricCardDark
          title="Modelado"
          value="—"
          subtitle="Modelos creados"
          accentColor="purple"
        />
        <MetricCardDark
          title="IA"
          value="—"
          subtitle="Análisis completados"
          accentColor="amber"
        />
      </DashboardGrid>
    </div>
  );
};
