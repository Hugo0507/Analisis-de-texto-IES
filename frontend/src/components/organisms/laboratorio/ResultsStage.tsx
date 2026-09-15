/**
 * Etapa de resultados: visualizaciones de la inferencia.
 */

import React, { useState } from 'react';
import publicWorkspaceService, {
  Workspace,
} from '../../../services/publicWorkspaceService';
import { Doughnut, Bar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

import { BoWWordCloud } from './BoWWordCloud';
import { DocumentTopicBreakdown } from './DocumentTopicBreakdown';
import { getNerChartColor } from './nerColors';

// El registro vive aqui porque es este componente el que pinta los graficos.
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  ChartTooltip,
  Legend,
);

export interface ResultsStageProps {
  workspace: Workspace;
  onReset: () => void;
  isImported?: boolean;
}

export const ResultsStage: React.FC<ResultsStageProps> = ({ workspace, onReset, isImported = false }) => {
  const { results } = workspace;
  const [downloading, setDownloading] = useState<{ excel: boolean; config: boolean }>({
    excel: false,
    config: false,
  });

  const handleExportExcel = async () => {
    setDownloading(d => ({ ...d, excel: true }));
    try {
      await publicWorkspaceService.exportExcel(workspace.id);
    } catch {
      // Silencioso — el botón vuelve a estar disponible
    } finally {
      setDownloading(d => ({ ...d, excel: false }));
    }
  };

  const handleExportConfig = async () => {
    setDownloading(d => ({ ...d, config: true }));
    try {
      await publicWorkspaceService.exportConfig(workspace.id);
    } catch {
      // Silencioso
    } finally {
      setDownloading(d => ({ ...d, config: false }));
    }
  };

  const Section: React.FC<{ title: string; color: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, color, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div className="rounded-2xl border bg-ink-850/40 overflow-hidden" style={{ borderColor: `${color}33` }}>
        <button
          onClick={() => setOpen(!open)}
          className="w-full px-5 py-3 border-b flex items-center justify-between cursor-pointer hover:brightness-110 transition-all"
          style={{ borderColor: `${color}33`, backgroundColor: `${color}11` }}
        >
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          <svg className={`w-4 h-4 text-mist transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && <div className="p-5">{children}</div>}
      </div>
    );
  };

  // Generar resumen interpretativo de temas
  const topicSummary = (() => {
    if (!results.topics?.all_topics_affinity?.length) return null;
    const sorted = [...results.topics.all_topics_affinity].sort((a, b) => b.weight - a.weight);
    const primary = sorted[0];
    const secondary = sorted.length > 1 ? sorted[1] : null;
    if (!primary) return null;

    let text = `El documento trata principalmente sobre "${primary.topic_label}" (${primary.percentage}%)`;
    if (secondary && secondary.percentage > 5) {
      text += `, con afinidad secundaria a "${secondary.topic_label}" (${secondary.percentage}%)`;
    }
    text += '.';
    return text;
  })();

  // Stats de preprocesamiento
  const stats = results.preprocessing_stats;
  const noiseFiltered = stats ? stats.total_raw_tokens - stats.total_clean_tokens : 0;
  const noisePercent = stats && stats.total_raw_tokens > 0
    ? ((noiseFiltered / stats.total_raw_tokens) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* ── Barra de acciones ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-white">Resultados de inferencia</h3>
          <p className="text-sm text-haze mt-0.5">
            {results.document_count ?? 0} documento{(results.document_count ?? 0) !== 1 ? 's' : ''} analizado{(results.document_count ?? 0) !== 1 ? 's' : ''}
            {' '}usando los modelos del corpus de referencia.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={onReset}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-ink-800 hover:bg-ink-700 text-white text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-mist focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            ← Nueva análisis
          </button>
          {!isImported && (
            <button
              onClick={handleExportExcel}
              disabled={downloading.excel}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {downloading.excel ? '…' : '↓ Excel'}
            </button>
          )}
          <button
            onClick={handleExportConfig}
            disabled={downloading.config}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-ink-800 hover:bg-ink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-mist focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {downloading.config ? '…' : '↓ Config JSON'}
          </button>
        </div>
      </div>

      {/* Resumen interpretativo */}
      {topicSummary && (
        <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/30">
          <p className="text-sm text-violet-200 font-medium">{topicSummary}</p>
        </div>
      )}

      {/* Indicador de calidad de preprocesamiento */}
      {stats && stats.total_raw_tokens > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-ink-850/60 border border-ink-700/40 text-center">
            <p className="text-lg font-bold text-emerald-400">{stats.total_clean_tokens.toLocaleString()}</p>
            <p className="text-xs text-haze mt-0.5">Tokens útiles</p>
          </div>
          <div className="p-3 rounded-xl bg-ink-850/60 border border-ink-700/40 text-center">
            <p className="text-lg font-bold text-haze">{stats.total_raw_tokens.toLocaleString()}</p>
            <p className="text-xs text-haze mt-0.5">Tokens extraídos</p>
          </div>
          <div className="p-3 rounded-xl bg-ink-850/60 border border-ink-700/40 text-center">
            <p className="text-lg font-bold text-amber-400">{noisePercent}%</p>
            <p className="text-xs text-haze mt-0.5">Ruido filtrado</p>
          </div>
          <div className="p-3 rounded-xl bg-ink-850/60 border border-ink-700/40 text-center">
            <p className="text-lg font-bold text-white">{stats.documents_processed}</p>
            <p className="text-xs text-haze mt-0.5">Docs procesados</p>
          </div>
        </div>
      )}

      {/* Documentos rechazados por idioma */}
      {results.rejected_documents && results.rejected_documents.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm font-semibold text-amber-300 mb-2">
            {results.rejected_documents.length} documento{results.rejected_documents.length !== 1 ? 's' : ''} rechazado{results.rejected_documents.length !== 1 ? 's' : ''} por idioma
          </p>
          <div className="space-y-1">
            {results.rejected_documents.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-amber-400 font-medium truncate max-w-[200px]">{d.filename}</span>
                <span className="text-fog">—</span>
                <span className="text-haze">
                  detectado: <span className="text-white font-medium">{d.detected_language}</span>
                  {' '}(esperado: {d.expected_language}, confianza: {(d.confidence * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BoW */}
      {results.bow && !results.bow.error && (
        <Section title="Bolsa de palabras" color="#8b5cf6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Vocabulario ref.', value: results.bow.vocabulary_size.toLocaleString() },
              { label: 'Total ocurrencias', value: results.bow.total_term_occurrences.toLocaleString() },
              { label: 'Términos/doc (prom.)', value: results.bow.avg_terms_per_document.toFixed(1) },
              { label: 'Dispersión', value: `${(results.bow.matrix_sparsity * 100).toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl bg-ink-900/50 text-center">
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-xs text-haze mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {/* Nube de palabras — SVG espiral, colores por frecuencia */}
          <div className="mb-5 p-4 rounded-xl bg-ink-900/40 border border-violet-800/20">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <p className="text-xs text-mist font-medium">
                Nube de palabras — top {Math.min(results.bow!.top_terms.length, 60)} términos
              </p>
              <div className="flex items-center gap-3 text-xs text-fog">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#f97316' }} />
                  Alta
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#eab308' }} />
                  Media-alta
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#22d3ee' }} />
                  Media
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#a78bfa' }} />
                  Baja
                </span>
              </div>
            </div>
            <BoWWordCloud terms={results.bow!.top_terms} maxWords={60} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-haze font-medium mb-2">Top 15 términos por frecuencia</p>
            {results.bow.top_terms.slice(0, 15).map((t, i) => {
              const maxScore = results.bow!.top_terms[0]?.score || 1;
              const pct = (t.score / maxScore) * 100;
              return (
                <div key={t.term} className="flex items-center gap-2">
                  <span className="text-xs text-fog w-5 text-right">{i + 1}</span>
                  <div className="flex-1 h-5 bg-ink-800/50 rounded overflow-hidden relative">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, rgba(139,92,246,0.7), rgba(139,92,246,${0.3 + (pct / 100) * 0.5}))`,
                      }}
                    />
                    <span className="absolute inset-y-0 left-2 flex items-center text-xs text-white font-medium">{t.term}</span>
                  </div>
                  <span className="text-xs text-mist w-12 text-right font-mono">{t.score.toFixed(0)}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* TF-IDF */}
      {results.tfidf && !results.tfidf.error && (
        <Section title="TF-IDF (pesos del corpus)" color="#06b6d4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {[
              { label: 'TF-IDF prom./doc', value: results.tfidf.avg_tfidf_per_document.toFixed(2) },
              { label: 'Dispersión', value: `${(results.tfidf.matrix_sparsity * 100).toFixed(1)}%` },
              { label: 'Documentos', value: results.tfidf.matrix_shape.rows.toString() },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl bg-ink-900/50 text-center">
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-xs text-haze mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {/* Scatter: rango vs. peso TF-IDF */}
          <div className="mb-5 p-3 rounded-xl bg-ink-900/40 border border-cyan-800/20" style={{ height: 260 }}>
            <p className="text-xs text-mist font-medium mb-2">Rango vs. peso TF-IDF (scatter)</p>
            <div style={{ height: 210 }}>
              <Scatter
                data={{
                  datasets: [{
                    label: 'TF-IDF',
                    data: results.tfidf!.top_terms.map((t, i) => ({ x: i + 1, y: t.score })),
                    backgroundColor: 'rgba(6,182,212,0.75)',
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBorderColor: 'transparent',
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const idx = ctx.dataIndex;
                          const term = results.tfidf!.top_terms[idx]?.term ?? '';
                          return ` ${term}: ${(ctx.parsed.y as number).toFixed(4)}`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      title: { display: true, text: 'Rango', color: '#94a3b8', font: { size: 10 } },
                      ticks: { color: '#94a3b8', font: { size: 10 } },
                      grid: { color: 'rgba(148,163,184,0.08)' },
                    },
                    y: {
                      title: { display: true, text: 'Peso TF-IDF', color: '#94a3b8', font: { size: 10 } },
                      ticks: { color: '#94a3b8', font: { size: 10 } },
                      grid: { color: 'rgba(148,163,184,0.08)' },
                    },
                  },
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-haze font-medium mb-2">Top 15 términos por TF-IDF</p>
            {results.tfidf.top_terms.slice(0, 15).map((t, i) => {
              const maxScore = results.tfidf!.top_terms[0]?.score || 1;
              const pct = (t.score / maxScore) * 100;
              const isHighScore = pct > 70;
              return (
                <div key={t.term} className="flex items-center gap-2">
                  <span className="text-xs text-fog w-5 text-right">{i + 1}</span>
                  <div className="flex-1 h-5 bg-ink-800/50 rounded overflow-hidden relative">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${pct}%`,
                        background: isHighScore
                          ? 'linear-gradient(90deg, rgba(6,182,212,0.8), rgba(34,211,238,0.9))'
                          : `linear-gradient(90deg, rgba(6,182,212,0.5), rgba(6,182,212,${0.2 + (pct / 100) * 0.4}))`,
                      }}
                    />
                    <span className={`absolute inset-y-0 left-2 flex items-center text-xs font-medium ${isHighScore ? 'text-white' : 'text-paper'}`}>
                      {t.term}
                    </span>
                  </div>
                  <span className={`text-xs w-14 text-right font-mono ${isHighScore ? 'text-cyan-300 font-semibold' : 'text-mist'}`}>
                    {t.score.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Topics */}
      {results.topics && !results.topics.error && (
        <Section title={`Modelado de Temas — ${results.topics.algorithm.toUpperCase()}`} color="#f59e0b">
          {/* Donut: afinidad promedio por tema (usa all_topics_affinity, no topic_distribution) */}
          {results.topics!.all_topics_affinity && results.topics!.all_topics_affinity.filter(a => a.percentage > 0).length > 0 && (() => {
            const visibleTopics = results.topics!.all_topics_affinity.filter(a => a.percentage > 0);
            const PALETTE = [
              'rgba(245,158,11,0.85)', 'rgba(251,191,36,0.85)', 'rgba(217,119,6,0.85)',
              'rgba(234,88,12,0.85)',  'rgba(180,83,9,0.85)',   'rgba(239,68,68,0.85)',
              'rgba(161,98,7,0.85)',   'rgba(194,65,12,0.85)',  'rgba(253,186,116,0.85)',
              'rgba(252,211,77,0.85)', 'rgba(167,243,208,0.75)','rgba(110,231,183,0.75)',
              'rgba(147,197,253,0.75)','rgba(196,181,253,0.75)','rgba(249,168,212,0.75)',
              'rgba(134,239,172,0.75)',
            ];
            const colors = visibleTopics.map((_, i) => PALETTE[i % PALETTE.length]);
            return (
              <div className="mb-5 p-3 rounded-xl bg-ink-900/40 border border-amber-800/20" style={{ height: 260 }}>
                <p className="text-xs text-mist font-medium mb-2">Afinidad promedio por tema (%)</p>
                <div style={{ height: 210 }}>
                  <Doughnut
                    data={{
                      labels: visibleTopics.map(a => a.topic_label || `Tema ${a.topic_id}`),
                      datasets: [{
                        data: visibleTopics.map(a => a.percentage),
                        backgroundColor: colors,
                        borderColor: 'rgba(15,23,42,0.6)',
                        borderWidth: 2,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '58%',
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: { color: '#cbd5e1', font: { size: 10 }, boxWidth: 12, padding: 6 },
                        },
                        tooltip: {
                          callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}%` },
                        },
                      },
                    }}
                  />
                </div>
              </div>
            );
          })()}
          {/* Distribución de temas dominantes */}
          <div className="space-y-3 mb-6">
            <p className="text-xs text-haze font-medium">Distribución de temas dominantes en los nuevos documentos</p>
            {results.topics.topic_distribution.map(t => (
              <div key={t.topic_id} className="flex items-center gap-3">
                <span className="text-xs text-mist w-24 truncate shrink-0" title={t.topic_label || `Tema ${t.topic_id}`}>
                  {t.topic_label || `Tema ${t.topic_id}`}
                </span>
                <div className="flex-1 h-5 bg-ink-800/50 rounded overflow-hidden">
                  <div
                    className="h-full bg-amber-500/60 rounded flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(t.percentage, 3)}%` }}
                  >
                    {t.percentage >= 10 && (
                      <span className="text-xs text-amber-200 font-medium">{t.percentage}%</span>
                    )}
                  </div>
                </div>
                {t.percentage < 10 && (
                  <span className="text-xs text-amber-300 font-medium w-10">{t.percentage}%</span>
                )}
                <span className="text-xs text-fog w-8 text-right shrink-0">{t.document_count}</span>
              </div>
            ))}
          </div>

          {/* Afinidad completa: Heatmap de todos los temas */}
          {results.topics.all_topics_affinity && results.topics.all_topics_affinity.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-ink-700/50">
              <p className="text-xs text-haze font-medium">Afinidad promedio con todos los temas del corpus</p>
              <div className="grid gap-2">
                {results.topics.all_topics_affinity.map(a => {
                  const maxWeight = results.topics!.all_topics_affinity[0]?.weight || 1;
                  const intensity = a.weight / maxWeight;
                  return (
                    <div key={a.topic_id} className="flex items-center gap-3">
                      <span className="text-xs text-mist w-24 truncate shrink-0" title={a.topic_label}>
                        {a.topic_label}
                      </span>
                      <div className="flex-1 h-6 bg-ink-800/30 rounded overflow-hidden relative">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${Math.max(a.percentage, 2)}%`,
                            background: `rgba(245,158,11,${0.3 + intensity * 0.6})`,
                          }}
                        />
                        <span className="absolute inset-y-0 left-2 flex items-center text-xs text-paper">
                          {a.percentage}%
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {a.top_words?.slice(0, 3).map((w, wi) => (
                          <span key={wi} className="text-xs px-1.5 py-0.5 rounded bg-ink-800/60 text-haze">
                            {typeof w === 'string' ? w : w.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Desglose por documento */}
          {results.topics.document_topics && results.topics.document_topics.length > 0 && (
            <DocumentTopicBreakdown
              documentTopics={results.topics.document_topics}
              corpusTopics={results.topics.corpus_topics}
              documents={workspace.documents}
            />
          )}
        </Section>
      )}

      {/* NER */}
      {results.ner && !results.ner.error && (
        <Section title={`NER — ${results.ner.reference_ner_name}`} color="#10b981">
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total entidades', value: results.ner.total_entities_found.toLocaleString(), color: 'text-emerald-400' },
              { label: 'Entidades únicas', value: results.ner.unique_entities_count.toLocaleString(), color: 'text-white' },
              { label: 'Tipos analizados', value: results.ner.entity_types_used.length.toString(), color: 'text-white' },
              { label: 'Modelo spaCy', value: results.ner.spacy_model.replace('_', ' '), color: 'text-haze' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3 rounded-xl bg-ink-900/50 text-center">
                <p className={`text-base font-bold ${color}`}>{value}</p>
                <p className="text-xs text-haze mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Donut: distribución por tipo de entidad */}
          {results.ner!.entity_distribution.length > 0 && (
            <div className="mb-5 p-3 rounded-xl bg-ink-900/40 border border-emerald-800/20" style={{ height: 260 }}>
              <p className="text-xs text-mist font-medium mb-2">Distribución por tipo de entidad</p>
              <div style={{ height: 210 }}>
                <Doughnut
                  data={{
                    labels: results.ner!.entity_distribution.map(e => e.type),
                    datasets: [{
                      data: results.ner!.entity_distribution.map(e => e.count),
                      backgroundColor: results.ner!.entity_distribution.map(e => getNerChartColor(e.type)),
                      borderColor: 'rgba(15,23,42,0.6)',
                      borderWidth: 2,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '58%',
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          color: '#cbd5e1',
                          font: { size: 10 },
                          boxWidth: 12,
                          padding: 6,
                          generateLabels: (chart) => {
                            const ds = chart.data.datasets[0];
                            return (chart.data.labels as string[]).map((label, i) => ({
                              text: label,
                              fillStyle: (ds.backgroundColor as string[])[i],
                              strokeStyle: 'rgba(15,23,42,0.6)',
                              lineWidth: 1,
                              hidden: false,
                              index: i,
                            }));
                          },
                        },
                      },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => ` ${ctx.label}: ${ctx.raw} ocurrencias`,
                          labelColor: (ctx) => ({
                            borderColor: 'transparent',
                            backgroundColor: getNerChartColor(results.ner!.entity_distribution[ctx.dataIndex]?.type ?? ''),
                          }),
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}
          {/* Distribución por tipo */}
          {results.ner.entity_distribution.length > 0 && (
            <div className="space-y-2 mb-5">
              <p className="text-xs text-haze font-medium mb-2">Distribución por tipo de entidad</p>
              {results.ner.entity_distribution.map(item => {
                const maxPct = results.ner!.entity_distribution[0]?.percentage || 1;
                const barWidth = (item.percentage / maxPct) * 100;
                return (
                  <div key={item.type} className="flex items-center gap-3">
                    <span className="text-xs text-haze w-20 shrink-0 font-medium">{item.type}</span>
                    <div className="flex-1 h-5 bg-ink-800/50 rounded overflow-hidden relative">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${barWidth}%`, background: 'rgba(16,185,129,0.55)' }}
                      />
                      <span className="absolute inset-y-0 left-2 flex items-center text-xs text-white font-medium">
                        {item.unique_entities} únicas · {item.count} ocurrencias
                      </span>
                    </div>
                    <span className="text-xs text-emerald-300 font-mono w-10 text-right">{item.percentage.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top entidades por tipo */}
          {Object.keys(results.ner.top_entities_by_type).length > 0 && (
            <div className="border-t border-ink-700/50 pt-4">
              <p className="text-xs text-haze font-medium mb-3">Top entidades por tipo</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(results.ner.top_entities_by_type).slice(0, 6).map(([type, entities]) => (
                  <div key={type} className="p-3 rounded-xl bg-ink-900/50">
                    <p className="text-xs font-semibold text-emerald-400 mb-2">{type}</p>
                    <div className="space-y-1">
                      {entities.slice(0, 5).map((e, i) => (
                        <div key={i} className="flex items-center justify-between gap-1">
                          <span className="text-xs text-paper truncate">{e.text}</span>
                          <span className="text-xs text-fog shrink-0 font-mono">{e.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* BERTopic Similarity */}
      {results.bertopic && !results.bertopic.error && (
        <Section title={`BERTopic — ${results.bertopic.reference_bertopic_name}`} color="#0ea5e9">
          {/* Badge de método */}
          <div className="flex items-start gap-3 mb-5 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
            <span className="text-xs font-semibold text-sky-300 bg-sky-900/60 px-2 py-0.5 rounded-full shrink-0 border border-sky-700/50">
              keyword matching
            </span>
            <p className="text-xs text-mist">{results.bertopic.method_note}</p>
          </div>

          {/* Horizontal bar: distribución de documentos por tema */}
          {results.bertopic!.topic_distribution.length > 0 && (
            <div
              className="mb-5 p-3 rounded-xl bg-ink-900/40 border border-sky-800/20"
              style={{ height: Math.max(180, results.bertopic!.topic_distribution.length * 38 + 50) }}
            >
              <p className="text-xs text-mist font-medium mb-2">Documentos por tema (BERTopic)</p>
              <div style={{ height: Math.max(140, results.bertopic!.topic_distribution.length * 38) }}>
                <Bar
                  data={{
                    labels: results.bertopic!.topic_distribution.map(t => t.topic_label),
                    datasets: [{
                      label: 'Documentos',
                      data: results.bertopic!.topic_distribution.map(t => t.document_count),
                      backgroundColor: 'rgba(14,165,233,0.72)',
                      borderColor: 'rgba(56,189,248,0.9)',
                      borderWidth: 1,
                      borderRadius: 4,
                    }],
                  }}
                  options={{
                    indexAxis: 'y' as const,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: { label: (ctx) => ` ${ctx.raw} documento${(ctx.raw as number) !== 1 ? 's' : ''}` },
                      },
                    },
                    scales: {
                      x: {
                        ticks: { color: '#94a3b8', font: { size: 10 } },
                        grid: { color: 'rgba(148,163,184,0.08)' },
                      },
                      y: {
                        ticks: { color: '#cbd5e1', font: { size: 10 } },
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}
          {/* Distribución por tema */}
          {results.bertopic.topic_distribution.length > 0 && (
            <div className="space-y-2 mb-5">
              <p className="text-xs text-haze font-medium mb-2">
                Distribución de documentos por tema ({results.bertopic.total_documents} docs)
              </p>
              {results.bertopic.topic_distribution.map(t => (
                <div key={t.topic_id} className="flex items-center gap-3">
                  <span className="text-xs text-haze w-28 truncate shrink-0" title={t.topic_label}>
                    {t.topic_label}
                  </span>
                  <div className="flex-1 h-5 bg-ink-800/50 rounded overflow-hidden relative">
                    <div
                      className="h-full rounded transition-all"
                      style={{ width: `${Math.max(t.percentage, 3)}%`, background: 'rgba(14,165,233,0.55)' }}
                    />
                    {t.percentage >= 10 && (
                      <span className="absolute inset-y-0 left-2 flex items-center text-xs text-white font-medium">
                        {t.percentage}%
                      </span>
                    )}
                  </div>
                  {t.percentage < 10 && (
                    <span className="text-xs text-sky-300 font-mono w-10 text-right">{t.percentage}%</span>
                  )}
                  {t.percentage >= 10 && (
                    <span className="text-xs text-fog w-10 text-right font-mono">{t.percentage}%</span>
                  )}
                  <span className="text-xs text-fog w-6 text-right shrink-0">{t.document_count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Asignaciones por documento */}
          {results.bertopic.document_assignments.length > 0 && (
            <div className="border-t border-ink-700/50 pt-4">
              <p className="text-xs text-haze font-medium mb-3">Similitud por documento (temas con similitud &gt; 0)</p>
              <div className="space-y-3">
                {results.bertopic.document_assignments.map((da) => {
                  const relevantTopics = (da.top_topics ?? [])
                    .filter(t => t.similarity_score > 0)
                    .sort((a, b) => b.similarity_score - a.similarity_score);
                  if (relevantTopics.length === 0) return null;
                  return (
                    <div key={da.document_index} className="p-3 rounded-xl bg-ink-900/40 border border-ink-700/30">
                      <p className="text-xs text-fog font-mono mb-2">Doc {da.document_index + 1}</p>
                      <div className="space-y-1.5">
                        {relevantTopics.map((t) => {
                          const simPct = Math.round(t.similarity_score * 100);
                          const isDominant = t.topic_id === da.dominant_topic;
                          return (
                            <div key={t.topic_id} className="flex items-center gap-2">
                              <span className={`text-xs w-28 truncate shrink-0 ${isDominant ? 'text-sky-300 font-semibold' : 'text-mist'}`} title={t.topic_label}>
                                {t.topic_label}
                              </span>
                              <div className="flex-1 h-2 bg-ink-800 rounded overflow-hidden">
                                <div
                                  className="h-full rounded"
                                  style={{ width: `${simPct}%`, background: isDominant ? '#38bdf8' : simPct >= 25 ? '#7dd3fc' : '#475569' }}
                                />
                              </div>
                              <span className={`text-xs font-mono w-8 text-right shrink-0 ${isDominant ? 'text-sky-300' : 'text-fog'}`}>
                                {simPct}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Error notices */}
      {[
        results.bow?.error && `BoW: ${results.bow.error}`,
        results.tfidf?.error && `TF-IDF: ${results.tfidf.error}`,
        results.topics?.error && `Temas: ${results.topics.error}`,
        results.ner?.error && `NER: ${results.ner.error}`,
        results.bertopic?.error && `BERTopic: ${results.bertopic.error}`,
      ].filter(Boolean).map((err, i) => (
        <div key={i} className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{err}</div>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
