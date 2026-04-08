/**
 * IADashboard - Dashboard público de resultados de análisis inteligente
 *
 * Muestra información sobre las técnicas de modelado de tópicos y análisis
 * NLP aplicadas al corpus de transformación digital.
 */

import React from 'react';
import { ChartCard } from '../molecules';

// ── Sub-components ────────────────────────────────────────────────────────────

interface TechCardProps {
  title: string;
  desc: string;
  badge: string;
  badgeColor: string;
}

const TechCard: React.FC<TechCardProps> = ({ title, desc, badge, badgeColor }) => (
  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
    <div className="flex items-start justify-between gap-2 mb-2">
      <p className="text-sm font-semibold text-white">{title}</p>
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${badgeColor}`}>
        {badge}
      </span>
    </div>
    <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

export const IADashboard: React.FC = () => {
  const techniques = [
    {
      title: 'LDA — Latent Dirichlet Allocation',
      desc: 'Modelo probabilístico generativo que asume que cada documento es una mezcla de temas y cada tema es una distribución de palabras.',
      badge: 'Bayesiano',
      badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    },
    {
      title: 'NMF — Non-negative Matrix Factorization',
      desc: 'Factorización de la matriz TF-IDF en componentes no negativos, produciendo temas con interpretabilidad alta.',
      badge: 'Algebraico',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      title: 'LSA — Latent Semantic Analysis',
      desc: 'Descomposición SVD del espacio TF-IDF para capturar relaciones semánticas latentes entre términos y documentos.',
      badge: 'SVD',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    {
      title: 'pLSA — Probabilistic LSA',
      desc: 'Versión probabilística de LSA que modela explícitamente la generación conjunta de documentos y palabras.',
      badge: 'Probabilístico',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    },
    {
      title: 'BERTopic',
      desc: 'Pipeline moderno que combina embeddings de oraciones (sentence-transformers), reducción dimensional UMAP y clustering HDBSCAN para descubrir temas coherentes.',
      badge: 'Transformers',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
  ];

  const pipeline = [
    { step: '1', label: 'Embeddings', detail: 'sentence-transformers (paraphrase-multilingual-MiniLM-L12-v2)' },
    { step: '2', label: 'Reducción UMAP', detail: 'n_neighbors=15, n_components=5, métrica coseno' },
    { step: '3', label: 'Clustering HDBSCAN', detail: 'min_cluster_size=10, detección automática de outliers' },
    { step: '4', label: 'Representación c-TF-IDF', detail: 'TF-IDF a nivel de tema (class-based TF-IDF)' },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Análisis Inteligente</h2>
        <p className="text-slate-400 text-sm mt-1">
          Técnicas de modelado de temas aplicadas al corpus de transformación digital en IES
        </p>
      </div>

      {/* Técnicas de modelado */}
      <ChartCard
        title="Técnicas de modelado de temas"
        subtitle="Algoritmos comparados para identificar temas en el corpus académico"
        accentColor="purple"
        size="lg"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2">
          {techniques.map((t) => (
            <TechCard key={t.title} {...t} />
          ))}
        </div>
      </ChartCard>

      {/* Pipeline BERTopic */}
      <ChartCard
        title="Pipeline BERTopic"
        subtitle="Pasos del análisis semántico con transformers"
        accentColor="amber"
        size="md"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      >
        <div className="space-y-0 divide-y divide-slate-700/40 p-2">
          {pipeline.map(({ step, label, detail }) => (
            <div key={step} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
              <span className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                {step}
              </span>
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Métricas de evaluación */}
      <ChartCard
        title="Métricas de evaluación"
        subtitle="Criterios utilizados para comparar el rendimiento de los modelos"
        accentColor="emerald"
        size="sm"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
      >
        <div className="flex flex-wrap gap-2 p-2">
          {[
            'Coherencia de temas (C_v)',
            'Perplejidad (LDA)',
            'Error de reconstrucción (NMF)',
            'Varianza explicada (LSA)',
            'Ratio de outliers (BERTopic)',
            'Cobertura de factores',
          ].map((m) => (
            <span key={m} className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {m}
            </span>
          ))}
        </div>
      </ChartCard>

    </div>
  );
};
