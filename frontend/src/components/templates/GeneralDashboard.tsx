/**
 * GeneralDashboard - Summary/Overview dashboard
 *
 * Coming Soon page showing the vision for the consolidated dashboard.
 */

import React from 'react';
import { ChartCard } from '../molecules';

export const GeneralDashboard: React.FC = () => {
  const pipelinePhases = [
    {
      phase: 'Preprocesamiento',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'from-cyan-500 to-blue-500',
      borderColor: 'border-cyan-500/30',
      metrics: ['Archivos totales', 'Idiomas detectados', 'Tamaño del corpus'],
    },
    {
      phase: 'Vectorización',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      ),
      color: 'from-purple-500 to-violet-500',
      borderColor: 'border-purple-500/30',
      metrics: ['Vocabulario total', 'Top N-gramas', 'Cobertura TF-IDF'],
    },
    {
      phase: 'Modelado',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      color: 'from-emerald-500 to-teal-500',
      borderColor: 'border-emerald-500/30',
      metrics: ['Entidades NER', 'Tópicos identificados', 'Clusters BERTopic'],
    },
    {
      phase: 'Inteligencia Artificial',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: 'from-amber-500 to-orange-500',
      borderColor: 'border-amber-500/30',
      metrics: ['Sentimiento promedio', 'Documentos clasificados', 'Embeddings generados'],
    },
  ];

  const dashboardFeatures = [
    {
      title: 'Vista Ejecutiva',
      description: 'KPIs principales de todo el pipeline en un vistazo',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      title: 'Tendencias Históricas',
      description: 'Evolución de métricas a lo largo del tiempo',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
    {
      title: 'Comparativas',
      description: 'Análisis comparativo entre datasets y períodos',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: 'Exportación',
      description: 'Descarga de reportes en PDF y Excel',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
            <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-white mb-3">
            Resumen General
          </h2>
          <p className="text-lg text-slate-400 mb-6">
            Vista consolidada del pipeline completo de análisis de texto
          </p>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-emerald-400">En Desarrollo</span>
          </div>
        </div>
      </div>

      {/* Pipeline Phases */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Fases del Pipeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pipelinePhases.map((phase, index) => (
            <div
              key={index}
              className={`p-5 rounded-xl bg-slate-800/30 border ${phase.borderColor} hover:bg-slate-800/50 transition-all duration-300`}
            >
              <div className={`w-10 h-10 mb-4 rounded-lg bg-gradient-to-br ${phase.color} flex items-center justify-center text-white`}>
                {phase.icon}
              </div>
              <h4 className="text-white font-medium mb-3">{phase.phase}</h4>
              <ul className="space-y-1.5">
                {phase.metrics.map((metric, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-400">
                    <div className="w-1 h-1 rounded-full bg-slate-500" />
                    {metric}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard Features Preview */}
      <ChartCard
        title="Funcionalidades del Resumen"
        subtitle="Capacidades planificadas para el dashboard consolidado"
        accentColor="emerald"
        size="md"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2">
          {dashboardFeatures.map((feature, index) => (
            <div key={index} className="text-center p-4 rounded-lg bg-slate-800/30">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                {feature.icon}
              </div>
              <h5 className="text-sm font-medium text-white mb-1">{feature.title}</h5>
              <p className="text-xs text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Status Card */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-1">Mientras tanto...</h3>
            <p className="text-slate-400 text-sm">
              Explora las pestañas de <span className="text-cyan-400">Preprocesamiento</span>,{' '}
              <span className="text-purple-400">Vectorización</span> y{' '}
              <span className="text-emerald-400">Modelado</span> para ver los análisis disponibles para tus datasets.
              Cada sección muestra información detallada del pipeline de análisis de texto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
