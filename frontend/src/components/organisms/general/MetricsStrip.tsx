/**
 * Franja de metricas de calidad de los modelos.
 */

import React from 'react';
import type { EnrichedTopic, PrepSummary, MetricItem } from './types';
import type { TopicModeling } from '../../../services/topicModelingService';
import type { BERTopicAnalysis } from '../../../services/bertopicService';
import { LANGUAGE_NAMES } from '../../../services/dataPreparationService';

// Estado de calidad: punto de color + palabra, nunca solo el color. La cifra va
// siempre en texto principal.
export const Q = {
  good:    { border: 'border-l-emerald-400', text: 'text-emerald-300', dot: 'bg-stage-sum',  chip: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/40', word: 'Bueno' },
  average: { border: 'border-l-amber-400',   text: 'text-amber-300',   dot: 'bg-stage-mod',  chip: 'bg-amber-400/10   text-amber-300   border-amber-400/40',   word: 'Aceptable' },
  poor:    { border: 'border-l-rose-400',    text: 'text-rose-300',    dot: 'bg-stage-lab',  chip: 'bg-rose-400/10    text-rose-300    border-rose-400/40',    word: 'Revisar' },
  neutral: { border: 'border-l-ink-600',     text: 'text-paper',       dot: 'bg-fog',        chip: 'bg-ink-800        text-paper       border-fog',            word: '' },
  info:    { border: 'border-l-blue-400',    text: 'text-blue-300',    dot: 'bg-stage-prep', chip: 'bg-blue-400/10    text-blue-300    border-blue-400/40',    word: '' },
};

export interface MetricsStripProps {
  topicModel: TopicModeling | null;
  bertopic: BERTopicAnalysis | null;
  enrichedTopics: EnrichedTopic[];
  prepSummary: PrepSummary | null;
}

export const MetricChip: React.FC<{ metric: MetricItem; flipTooltip?: boolean }> = ({ metric, flipTooltip }) => {
  const q = Q[metric.quality];
  return (
    <div tabIndex={0} className="group relative min-w-0 rounded-xl bg-ink-850 border border-ink-700 px-4 py-3.5 cursor-default select-none transition-colors hover:border-ink-600 focus-visible:border-ink-600">

      {/* Icono + estado de calidad */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-fog">{metric.icon}</span>
        {q.word ? (
          <span className="flex items-center gap-1.5 text-[11px] text-mist">
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${q.dot}`} />
            {q.word}
          </span>
        ) : (
          <svg className="w-3.5 h-3.5 text-fog" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      {/* Valor */}
      <div className="num font-display text-2xl font-semibold leading-none tracking-[-0.02em] text-paper mb-2 truncate" aria-label={metric.label}>
        {metric.value}
      </div>

      {/* Etiqueta */}
      <div className="text-xs text-mist leading-snug">{metric.label}</div>

      {/* Tooltip — visible al hacer hover, posición adaptativa */}
      <div
        role="tooltip"
        className={`
          hidden group-hover:block group-focus-visible:block absolute z-50 w-72
          ${flipTooltip ? 'bottom-full mb-2' : 'top-full mt-2'}
          left-0 rounded-xl border border-ink-600 bg-ink-850 shadow-2xl shadow-black/50 p-4 pointer-events-none
        `}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2.5 h-2.5 rounded-full ${q.dot} shrink-0`} />
          {/* Título tooltip: slate-100 → ≈ 14:1 */}
          <p className="text-sm font-semibold text-paper">{metric.tooltip.title}</p>
        </div>
        {/* Cuerpo: slate-300 (#cbd5e1) sobre bg-ink-900 (#0f172a) → ≈ 7.5:1 */}
        <p className="text-sm text-haze leading-relaxed mb-2.5">{metric.tooltip.body}</p>
        {metric.tooltip.range && (
          <div className="text-xs rounded-lg bg-ink-900 border border-ink-700 px-3 py-2 mb-2">
            <span className="text-haze font-medium">Rango: </span>
            <span className="text-paper font-medium">{metric.tooltip.range}</span>
          </div>
        )}
        {metric.tooltip.source && (
          <div className="text-xs text-haze mt-1">
            Fuente: <span className="text-paper font-medium">{metric.tooltip.source}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const MetricsStrip: React.FC<MetricsStripProps> = ({ topicModel, bertopic, enrichedTopics, prepSummary }) => {
  const coherence = topicModel?.coherence_score ?? bertopic?.coherence_score ?? null;
  const coherenceQ: MetricItem['quality'] =
    coherence == null ? 'neutral' : coherence >= 0.65 ? 'good' : coherence >= 0.40 ? 'average' : 'poor';

  const totalDocs   = topicModel?.documents_processed ?? bertopic?.documents_processed ?? 0;
  const vocabSize   = topicModel?.vocabulary_size ?? bertopic?.vocabulary_size ?? 0;
  const numTopics   = enrichedTopics.length;
  const outliers    = bertopic?.num_outliers ?? 0;
  const perplexity  = topicModel?.perplexity_score ?? null;

  // Cobertura: % docs asignados a un tópico (no outlier)
  const coverage = totalDocs > 0 && bertopic != null
    ? ((totalDocs - outliers) / totalDocs) * 100
    : totalDocs > 0 && topicModel != null ? 100 : null;
  const coverageQ: MetricItem['quality'] =
    coverage == null ? 'neutral' : coverage >= 85 ? 'good' : coverage >= 65 ? 'average' : 'poor';

  // Densidad léxica: términos únicos por documento
  const lexDensity = totalDocs > 0 && vocabSize > 0 ? vocabSize / totalDocs : null;

  // Preprocesamiento
  const langCode = prepSummary?.predominant_language ?? null;
  const langName  = langCode ? (LANGUAGE_NAMES[langCode]?.name ?? langCode.toUpperCase()) : null;
  const langFlag  = langCode ? (LANGUAGE_NAMES[langCode]?.flag ?? '🌐') : null;
  const langPct   = prepSummary?.predominant_language_percentage ?? null;

  const dupRemoved  = prepSummary?.duplicates_removed ?? null;
  const filesProc   = prepSummary?.files_processed ?? null;
  const dupRate     = dupRemoved != null && filesProc != null && (filesProc + dupRemoved) > 0
    ? (dupRemoved / (filesProc + dupRemoved)) * 100
    : null;
  const dupQ: MetricItem['quality'] =
    dupRate == null ? 'neutral' : dupRate < 5 ? 'good' : dupRate < 20 ? 'average' : 'info';

  const modelName = topicModel?.algorithm_display ?? topicModel?.algorithm?.toUpperCase()
    ?? (bertopic ? 'BERTopic' : null);

  const metrics: MetricItem[] = [
    {
      id: 'coherence',
      show: coherence != null,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>,
      value: coherence != null ? coherence.toFixed(2) : '—',
      label: 'Coherencia C_V',
      quality: coherenceQ,
      tooltip: {
        title: 'Coherencia C_V del modelo de temas',
        body: 'Mide qué tan semánticamente relacionadas están las palabras principales de cada tema. Un valor alto indica temas más interpretables y con significado real para el investigador.',
        range: '≥ 0.65 excelente · 0.40–0.64 aceptable · < 0.40 revisar',
        source: modelName ?? undefined,
      },
    },
    {
      id: 'corpus',
      show: totalDocs > 0,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
      value: totalDocs.toLocaleString('es-CO'),
      label: 'Documentos analizados',
      quality: 'neutral',
      tooltip: {
        title: 'Tamaño del corpus analizado',
        body: 'Número total de documentos que el modelo procesó para extraer los temas. Un corpus más grande generalmente produce modelos más robustos y representativos.',
        range: 'Mínimo recomendado: 50 documentos para LDA · 200+ para BERTopic',
        source: modelName ?? undefined,
      },
    },
    {
      id: 'vocab',
      show: vocabSize > 0,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
      value: vocabSize.toLocaleString('es-CO'),
      label: 'Vocabulario único',
      quality: 'neutral',
      tooltip: {
        title: 'Tamaño del vocabulario único',
        body: 'Número de términos distintos que el modelo consideró tras aplicar preprocesamiento (stopwords, stemming, etc.). Refleja la riqueza léxica del corpus.',
        source: 'Preprocesamiento + Vectorización',
      },
    },
    {
      id: 'topics',
      show: numTopics > 0,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v3m0 14v3M4.22 4.22l2.12 2.12m11.32 11.32l2.12 2.12M2 12h3m14 0h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></svg>,
      value: String(numTopics),
      label: 'Temas identificados',
      quality: 'neutral',
      tooltip: {
        title: 'Número de temas extraídos',
        body: 'Grupos temáticos distintos identificados en el corpus. Cada tema representa un conjunto de términos semánticamente relacionados que co-ocurren en los documentos.',
        range: 'Óptimo: validar con índice de coherencia y revisión experta',
        source: modelName ?? undefined,
      },
    },
    {
      id: 'coverage',
      show: coverage != null && bertopic != null,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      value: coverage != null ? `${coverage.toFixed(1)}%` : '—',
      label: 'Cobertura del corpus',
      quality: coverageQ,
      tooltip: {
        title: 'Cobertura temática del corpus',
        body: 'Porcentaje de documentos que fueron asignados a algún tema (no clasificados como outliers). Un valor bajo puede indicar que el corpus es muy heterogéneo o que el modelo necesita ajuste.',
        range: '≥ 85% excelente · 65–84% aceptable · < 65% revisar parámetros',
        source: 'BERTopic (HDBSCAN clustering)',
      },
    },
    {
      id: 'lex_density',
      show: lexDensity != null,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
      value: lexDensity != null ? `${lexDensity.toFixed(1)}` : '—',
      label: 'Términos únicos/doc',
      quality: 'neutral',
      tooltip: {
        title: 'Densidad léxica del corpus',
        body: 'Promedio de términos únicos por documento tras preprocesamiento. Indica la variedad de vocabulario por documento. Valores muy bajos pueden indicar documentos cortos o un preprocesamiento muy agresivo.',
        source: 'Vectorización',
      },
    },
    {
      id: 'perplexity',
      show: perplexity != null,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
      value: perplexity != null ? perplexity.toFixed(1) : '—',
      label: 'Perplejidad (LDA)',
      quality: 'neutral',
      tooltip: {
        title: 'Perplejidad del modelo LDA',
        body: 'Medida estadística de qué tan bien el modelo predice una muestra. A menor perplejidad, mejor ajuste del modelo a los datos. Comparar entre modelos del mismo corpus.',
        range: 'No hay rango universal — comparar entre iteraciones del mismo corpus',
        source: `LDA · ${topicModel?.num_topics ?? '?'} temas`,
      },
    },
    {
      id: 'outliers',
      show: bertopic != null && outliers > 0,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
      value: `${outliers.toLocaleString('es-CO')}`,
      label: 'Outliers (sin tema)',
      quality: outliers / Math.max(totalDocs, 1) < 0.10 ? 'good' : outliers / Math.max(totalDocs, 1) < 0.25 ? 'average' : 'poor',
      tooltip: {
        title: 'Documentos sin tema asignado (BERTopic)',
        body: 'Documentos que HDBSCAN no pudo asignar a ningún clúster (tema -1). Un número alto puede indicar documentos muy cortos, muy específicos, o que el parámetro min_cluster_size es demasiado grande.',
        range: '< 10% del corpus: aceptable · > 25%: revisar parámetros HDBSCAN',
        source: 'BERTopic · HDBSCAN clustering',
      },
    },
    {
      id: 'language',
      show: langName != null,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>,
      value: `${langFlag ?? ''} ${langName ?? '—'}`,
      label: langPct != null ? `Idioma predominante (${langPct.toFixed(0)}%)` : 'Idioma predominante',
      quality: 'info',
      tooltip: {
        title: 'Idioma predominante del corpus',
        body: 'Idioma detectado en la mayor parte de los documentos tras el análisis de preprocesamiento. Fundamental para elegir el modelo de spaCy correcto en NER y los stopwords en vectorización.',
        source: 'Preprocesamiento (detección automática)',
      },
    },
    {
      id: 'duplicates',
      show: dupRemoved != null && dupRemoved > 0,
      icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
      value: dupRemoved != null ? dupRemoved.toLocaleString('es-CO') : '—',
      label: dupRate != null ? `Duplicados eliminados (${dupRate.toFixed(0)}%)` : 'Duplicados eliminados',
      quality: dupQ,
      tooltip: {
        title: 'Duplicados eliminados en preprocesamiento',
        body: 'Número de documentos detectados como duplicados y removidos del corpus antes del análisis. Eliminar duplicados mejora la calidad del modelo al evitar sobrerepresentación de contenidos.',
        range: '< 5% del corpus: normal · > 20%: revisar fuente de datos',
        source: 'Preprocesamiento',
      },
    },
  ];

  const visibleMetrics = metrics.filter(m => m.show);
  if (visibleMetrics.length === 0) return null;

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h3 className="font-display text-[16px] font-semibold tracking-[-0.01em] text-paper">
          Indicadores de calidad del análisis
        </h3>
        <p className="hidden text-xs text-fog sm:block">Pasa el cursor sobre un indicador para ver cómo leerlo.</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        {visibleMetrics.map((m, i) => (
          <MetricChip
            key={m.id}
            metric={m}
            flipTooltip={i >= visibleMetrics.length - 3}
          />
        ))}
      </div>
    </div>
  );
};
