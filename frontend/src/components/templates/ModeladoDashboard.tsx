/**
 * ModeladoDashboard - Modeling visualization dashboard
 *
 * Placeholder for NLP modeling metrics and network graphs.
 * Will use react-force-graph for node network visualization.
 */

import React from 'react';
import { DashboardGrid, MetricCardDark } from '../organisms';
import { ChartCard } from '../molecules';

export const ModeladoDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-white">Modelado</h2>
        <p className="text-slate-400 text-sm mt-1">
          Métricas y análisis de modelos NLP: NER, Topic Modeling, BERTopic
        </p>
      </div>

      {/* Coming Soon */}
      <ChartCard
        title="En Desarrollo"
        subtitle="Esta sección estará disponible próximamente"
        accentColor="purple"
        size="lg"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        }
      >
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Dashboard de Modelado</h3>
          <p className="text-slate-400 max-w-md">
            Visualizaciones de entidades NER, redes de tópicos interconectados,
            y clusters de BERTopic. Incluirá grafos de fuerza con react-force-graph
            para mapear relaciones entre conceptos.
          </p>
        </div>
      </ChartCard>

      {/* Preview Metrics */}
      <DashboardGrid columns={4} gap="md">
        <MetricCardDark
          title="Análisis NER"
          value="—"
          subtitle="Entidades reconocidas"
          accentColor="purple"
        />
        <MetricCardDark
          title="Topic Models"
          value="—"
          subtitle="Modelos LSA/NMF/LDA"
          accentColor="rose"
        />
        <MetricCardDark
          title="BERTopic"
          value="—"
          subtitle="Modelos transformer"
          accentColor="amber"
        />
        <MetricCardDark
          title="Entidades"
          value="—"
          subtitle="Tipos únicos"
          accentColor="emerald"
        />
      </DashboardGrid>
    </div>
  );
};
