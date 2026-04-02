/**
 * TopicComparison
 *
 * Benchmark de modelos de topic modeling: LDA, NMF, LSA, pLSA, BERTopic.
 * Muestra métricas comparativas de modelos entrenados y destaca el mejor modelo.
 * Lee directamente de los modelos completados en topic-modeling y bertopic.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  RefreshCw,
  Trophy,
  Info,
  AlertTriangle,
} from 'lucide-react';
import topicModelingService from '../services/topicModelingService';
import { bertopicService } from '../services/bertopicService';
import type { TopicModelingListItem } from '../services/topicModelingService';
import type { BERTopicListItem } from '../services/bertopicService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

// ── Types ────────────────────────────────────────────────────────────────────

interface ModelEntry {
  n_topics: number;
  coherence: number;
  perplexity?: number;
  reconstruction_error?: number;
  name: string;
  id: number;
}

// ── Model display metadata ────────────────────────────────────────────────────

const MODEL_META: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  lda:      { label: 'LDA',      color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   bar: 'bg-blue-500' },
  nmf:      { label: 'NMF',      color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', bar: 'bg-violet-500' },
  lsa:      { label: 'LSA',      color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  bar: 'bg-amber-500' },
  plsa:     { label: 'pLSA',     color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200',bar: 'bg-emerald-500' },
  bertopic: { label: 'BERTopic', color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200',    bar: 'bg-rose-500' },
};

function modelMeta(key: string) {
  return MODEL_META[key.toLowerCase()] ?? { label: key.toUpperCase(), color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200', bar: 'bg-slate-400' };
}

function fmt(value: number | undefined | null, decimals: number = 2): string {
  if (value == null) return '—';
  return value.toFixed(decimals);
}

// ── Bar chart component ───────────────────────────────────────────────────────

interface MetricBarProps {
  label: string;
  value: number | undefined | null;
  max: number;
  barColor: string;
  isBest: boolean;
}

const MetricBar: React.FC<MetricBarProps> = ({ label, value, max, barColor, isBest }) => {
  const width = (value != null && max > 0) ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div className="flex items-center gap-2 py-1 min-w-0">
      <span className={`w-16 text-xs font-medium shrink-0 ${isBest ? 'text-emerald-700' : 'text-slate-600'}`}>{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden min-w-0">
        <div
          className={`${isBest ? 'bg-emerald-500' : barColor} h-full rounded-full transition-all duration-500`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-16 text-xs font-mono text-right text-slate-500 shrink-0">
        {value != null ? value.toFixed(2) : '—'}
      </span>
      {isBest && (
        <Trophy className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-label="Mejor modelo" />
      )}
    </div>
  );
};

// ── Helper: build benchmark data from completed models ────────────────────────

function buildBenchmarkData(
  tmModels: TopicModelingListItem[],
  btModels: BERTopicListItem[],
): { models: Record<string, ModelEntry>; best_model: string | null } {
  const completed = tmModels.filter((m) => m.status === 'completed' && m.coherence_score != null);
  const completedBt = btModels.filter((m) => m.status === 'completed' && m.coherence_score != null);

  const models: Record<string, ModelEntry> = {};

  // For each algorithm, pick the model with the highest coherence
  const byAlgorithm: Record<string, TopicModelingListItem[]> = {};
  for (const m of completed) {
    const algo = m.algorithm.toLowerCase();
    if (!byAlgorithm[algo]) byAlgorithm[algo] = [];
    byAlgorithm[algo].push(m);
  }

  for (const [algo, group] of Object.entries(byAlgorithm)) {
    const best = group.reduce((a, b) =>
      (a.coherence_score ?? 0) >= (b.coherence_score ?? 0) ? a : b
    );
    models[algo] = {
      n_topics: best.num_topics,
      coherence: best.coherence_score ?? 0,
      perplexity: algo === 'lda' ? (best as any).perplexity_score ?? undefined : undefined,
      name: best.name,
      id: best.id,
    };
  }

  // BERTopic — pick best by coherence
  if (completedBt.length > 0) {
    const bestBt = completedBt.reduce((a, b) =>
      (a.coherence_score ?? 0) >= (b.coherence_score ?? 0) ? a : b
    );
    models['bertopic'] = {
      n_topics: bestBt.num_topics_found,
      coherence: bestBt.coherence_score ?? 0,
      name: bestBt.name,
      id: bestBt.id,
    };
  }

  // Determine best model by coherence
  const entries = Object.entries(models);
  const best_model = entries.length > 0
    ? entries.reduce((a, b) => (a[1].coherence >= b[1].coherence ? a : b))[0]
    : null;

  return { models, best_model };
}

// ── Main Component ────────────────────────────────────────────────────────────

export const TopicComparison: React.FC = () => {
  const { showError } = useToast();

  const [models, setModels] = useState<Record<string, ModelEntry>>({});
  const [bestModel, setBestModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tmList, btList] = await Promise.all([
        topicModelingService.getTopicModelings(),
        bertopicService.getBERTopicAnalyses(),
      ]);
      const data = buildBenchmarkData(tmList, btList);
      setModels(data.models);
      setBestModel(data.best_model);
    } catch (err: any) {
      showError('Error al cargar modelos: ' + (err.message ?? ''));
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Compute max values for bar charts ─────────────────────────────────────

  const entries = Object.entries(models);
  const maxCoherence = Math.max(...entries.map(([, m]) => m.coherence ?? 0), 0.001);
  const maxPerplexity = Math.max(...entries.map(([, m]) => m.perplexity ?? 0), 0.001);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F7FE' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>

      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center justify-between px-4 sm:px-8 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <BarChart2 className="w-5 h-5 text-gray-700 shrink-0" />
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Benchmark de Modelos de Temas</h1>
          </div>
          <button
            onClick={load}
            className="p-2 sm:p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400"
            title="Actualizar benchmark"
          >
            <RefreshCw className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">

        {/* Info */}
        <div className="flex gap-2.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <span className="leading-relaxed">
            Comparación automática de los mejores modelos entrenados para LDA, NMF, LSA, pLSA y BERTopic.
            Se selecciona el modelo con mayor coherencia de cada algoritmo.
            El mejor modelo global se resalta en verde.
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="bg-white p-8 sm:p-10 text-center" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin modelos entrenados</h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Entrena al menos un modelo de Modelado de Temas (LDA, NMF, LSA o pLSA) o BERTopic
              desde la sección de Modelado para ver la comparación de benchmarks.
            </p>
          </div>
        ) : (
          <>
            {/* Mejor modelo destacado */}
            {bestModel && (
              <div className={`border rounded-xl p-4 sm:p-5 ${modelMeta(bestModel).bg}`}>
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mejor modelo</p>
                    <p className={`text-xl font-bold ${modelMeta(bestModel).color}`}>
                      {modelMeta(bestModel).label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Coherencia: {fmt(models[bestModel]?.coherence)} — {models[bestModel]?.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabla comparativa */}
            <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <h2 className="text-base font-semibold text-slate-800 mb-4">Métricas comparativas</h2>
              <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
                <table className="w-full text-sm min-w-[560px]" role="table" aria-label="Comparación de modelos de temas">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Modelo</th>
                      <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Nombre</th>
                      <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">N Temas</th>
                      <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">Coherencia</th>
                      <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">Perplejidad</th>
                      <th className="text-center text-xs font-medium text-slate-500 py-2">Mejor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {entries.map(([key, model]) => {
                      const meta = modelMeta(key);
                      const isBest = bestModel === key;
                      return (
                        <tr key={key} className={`hover:bg-slate-50 ${isBest ? 'bg-emerald-50/50' : ''}`}>
                          <td className="py-3 pr-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${meta.bg} ${meta.color}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-sm text-slate-600 max-w-[200px] truncate">
                            {model.name}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono text-slate-600 text-sm">{model.n_topics}</td>
                          <td className={`py-3 pr-4 text-right font-mono text-sm font-semibold ${isBest ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {fmt(model.coherence)}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono text-slate-600 text-sm">
                            {model.perplexity != null ? model.perplexity.toFixed(2) : '—'}
                          </td>
                          <td className="py-3 text-center">
                            {isBest ? (
                              <Trophy className="w-4 h-4 text-emerald-500 mx-auto" aria-label="Mejor modelo" />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gráfico de barras: coherencia */}
            <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <h2 className="text-base font-semibold text-slate-800 mb-1">Coherencia por modelo</h2>
              <p className="text-xs text-slate-400 mb-4">
                Valores más altos indican temas más interpretables semánticamente.
                El verde indica el mejor modelo.
              </p>
              <div className="space-y-2">
                {entries
                  .sort(([, a], [, b]) => (b.coherence ?? 0) - (a.coherence ?? 0))
                  .map(([key, model]) => (
                    <MetricBar
                      key={key}
                      label={modelMeta(key).label}
                      value={model.coherence}
                      max={maxCoherence}
                      barColor={modelMeta(key).bar}
                      isBest={bestModel === key}
                    />
                  ))}
              </div>
            </div>

            {/* Perplejidad (solo si hay datos) */}
            {entries.some(([, m]) => m.perplexity != null) && (
              <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h2 className="text-base font-semibold text-slate-800 mb-1">Perplejidad por modelo</h2>
                <p className="text-xs text-slate-400 mb-4">
                  Solo disponible para LDA. Valores más bajos indican mejor ajuste al corpus.
                </p>
                <div className="space-y-2">
                  {entries
                    .filter(([, m]) => m.perplexity != null)
                    .sort(([, a], [, b]) => (b.perplexity ?? 0) - (a.perplexity ?? 0))
                    .map(([key, model]) => (
                      <MetricBar
                        key={key}
                        label={modelMeta(key).label}
                        value={model.perplexity}
                        max={maxPerplexity}
                        barColor={modelMeta(key).bar}
                        isBest={false}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};
