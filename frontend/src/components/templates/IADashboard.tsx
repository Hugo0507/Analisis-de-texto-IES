/**
 * IADashboard - AI/ML visualization dashboard
 *
 * Placeholder for AI-powered analysis metrics.
 */

import React from 'react';
import { DashboardGrid, MetricCardDark } from '../organisms';
import { ChartCard } from '../molecules';

export const IADashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-white">Inteligencia Artificial</h2>
        <p className="text-slate-400 text-sm mt-1">
          Métricas y análisis de modelos de IA y aprendizaje automático
        </p>
      </div>

      {/* Coming Soon */}
      <ChartCard
        title="En Desarrollo"
        subtitle="Esta sección estará disponible próximamente"
        accentColor="amber"
        size="lg"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
      >
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Dashboard de IA</h3>
          <p className="text-slate-400 max-w-md">
            Visualizaciones de resultados de modelos de IA, métricas de confianza,
            análisis de sentimiento, y resúmenes automáticos generados por LLMs.
          </p>
        </div>
      </ChartCard>

      {/* Preview Metrics */}
      <DashboardGrid columns={4} gap="md">
        <MetricCardDark
          title="Modelos"
          value="—"
          subtitle="Procesados"
          accentColor="amber"
        />
        <MetricCardDark
          title="Confianza"
          value="—"
          subtitle="Promedio %"
          accentColor="amber"
        />
        <MetricCardDark
          title="Entidades IA"
          value="—"
          subtitle="Extraídas"
          accentColor="rose"
        />
        <MetricCardDark
          title="Tópicos IA"
          value="—"
          subtitle="Descubiertos"
          accentColor="emerald"
        />
      </DashboardGrid>
    </div>
  );
};
