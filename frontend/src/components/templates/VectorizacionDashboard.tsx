/**
 * VectorizacionDashboard - Vectorization visualization dashboard
 *
 * Placeholder for vectorization metrics and charts.
 */

import React from 'react';
import { DashboardGrid, MetricCardDark } from '../organisms';
import { ChartCard } from '../molecules';

export const VectorizacionDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-white">Vectorización</h2>
        <p className="text-slate-400 text-sm mt-1">
          Métricas y análisis de la fase de vectorización de texto
        </p>
      </div>

      {/* Coming Soon */}
      <ChartCard
        title="En Desarrollo"
        subtitle="Esta sección estará disponible próximamente"
        accentColor="cyan"
        size="lg"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        }
      >
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Dashboard de Vectorización</h3>
          <p className="text-slate-400 max-w-md">
            Aquí podrás visualizar métricas de Bag of Words, TF-IDF, N-gramas y más.
            Incluyendo distribución de vocabulario, frecuencias de términos y análisis comparativos.
          </p>
        </div>
      </ChartCard>

      {/* Preview Metrics */}
      <DashboardGrid columns={4} gap="md">
        <MetricCardDark
          title="Análisis BoW"
          value="—"
          subtitle="Bolsas de palabras"
          accentColor="cyan"
        />
        <MetricCardDark
          title="Análisis TF-IDF"
          value="—"
          subtitle="Ponderación de términos"
          accentColor="blue"
        />
        <MetricCardDark
          title="N-gramas"
          value="—"
          subtitle="Secuencias de tokens"
          accentColor="purple"
        />
        <MetricCardDark
          title="Vocabulario"
          value="—"
          subtitle="Términos únicos"
          accentColor="emerald"
        />
      </DashboardGrid>
    </div>
  );
};
