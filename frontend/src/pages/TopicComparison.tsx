/**
 * TopicComparison
 *
 * Benchmark de modelos de topic modeling: LDA, NMF, LSA, pLSA, BERTopic.
 * Muestra métricas comparativas y destaca el mejor modelo.
 * Llama a /api/v1/analysis/topics/compare/
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  RefreshCw,
  Trophy,
  Info,
  AlertTriangle,
} from 'lucide-react';
import analysisService from '../services/analysisService';
import type { CompareModelsResponse } from '../services/analysisService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

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

// ── Main Component ────────────────────────────────────────────────────────────

export const TopicComparison: React.FC = () => {
  const { showError } = useToast();

  const [data, setData] = useState<CompareModelsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nTopics, setNTopics] = useState(10);

  const load = useCallback(async (topics: number) => {
    setIsLoading(true);
    try {
      const result = await analysisService.compareModels(topics);
      if (result.success) setData(result);
    } catch (err: any) {
      const msg: string = err.response?.data?.error ?? err.message ?? '';
      if (!msg.toLowerCase().includes('no model')) {
        showError('Error al cargar la comparación: ' + msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    load(nTopics);
  }, [load, nTopics]);

  // ── Compute max values for bar charts ─────────────────────────────────────

  const models = data ? Object.entries(data.models) : [];
  const maxCoherence = Math.max(...models.map(([, m]) => m.coherence ?? 0), 0.001);
  const maxPerplexity = Math.max(...models.map(([, m]) => m.perplexity ?? 0), 0.001);
  const maxReconError = Math.max(...models.map(([, m]) => m.reconstruction_error ?? 0), 0.001);

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
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Benchmark de Modelos de Tópicos</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            {/* N-topics selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="n-topics" className="text-xs text-slate-500 hidden sm:inline">N temas</label>
              <select
                id="n-topics"
                value={nTopics}
                onChange={(e) => setNTopics(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {[5, 8, 10, 12, 15, 20].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => load(nTopics)}
              className="p-2 sm:p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              title="Actualizar benchmark"
            >
              <RefreshCw className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">

        {/* Info */}
        <div className="flex gap-2.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <span className="leading-relaxed">
            Comparación de métricas para LDA, NMF, LSA, pLSA y BERTopic con <strong>{nTopics} temas</strong>.
            La coherencia es la métrica principal: valores más altos indican temas más interpretables.
            El mejor modelo se resalta en verde.
          </span>
        </div>

        {!data || models.length === 0 ? (
          <div className="bg-white p-8 sm:p-10 text-center" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin modelos entrenados</h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Entrena al menos un modelo de Modelado de Temas (LDA, NMF, LSA o pLSA) desde la sección de Modelado
              para ver la comparación de benchmarks.
            </p>
          </div>
        ) : (
          <>
            {/* Mejor modelo destacado */}
            {data.best_model && (
              <div className={`border rounded-xl p-4 sm:p-5 ${modelMeta(data.best_model).bg}`}>
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mejor modelo</p>
                    <p className={`text-xl font-bold ${modelMeta(data.best_model).color}`}>
                      {modelMeta(data.best_model).label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Coherencia: {fmt(data.models[data.best_model]?.coherence)}
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
                      <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">N Temas</th>
                      <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">Coherencia</th>
                      <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">Perplejidad</th>
                      <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">Error Reconstrucción</th>
                      <th className="text-center text-xs font-medium text-slate-500 py-2">Mejor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {models.map(([key, model]) => {
                      const meta = modelMeta(key);
                      const isBest = data.best_model === key;
                      return (
                        <tr key={key} className={`hover:bg-slate-50 ${isBest ? 'bg-emerald-50/50' : ''}`}>
                          <td className="py-3 pr-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${meta.bg} ${meta.color}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right font-mono text-slate-600 text-sm">{model.n_topics}</td>
                          <td className={`py-3 pr-4 text-right font-mono text-sm font-semibold ${isBest ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {fmt(model.coherence)}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono text-slate-600 text-sm">
                            {model.perplexity != null ? model.perplexity.toFixed(2) : '—'}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono text-slate-600 text-sm">
                            {model.reconstruction_error != null ? model.reconstruction_error.toFixed(2) : '—'}
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
                {models
                  .sort(([, a], [, b]) => (b.coherence ?? 0) - (a.coherence ?? 0))
                  .map(([key, model]) => (
                    <MetricBar
                      key={key}
                      label={modelMeta(key).label}
                      value={model.coherence}
                      max={maxCoherence}
                      barColor={modelMeta(key).bar}
                      isBest={data.best_model === key}
                    />
                  ))}
              </div>
            </div>

            {/* Perplejidad (solo si hay datos) */}
            {models.some(([, m]) => m.perplexity != null) && (
              <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h2 className="text-base font-semibold text-slate-800 mb-1">Perplejidad por modelo</h2>
                <p className="text-xs text-slate-400 mb-4">
                  Solo disponible para LDA. Valores más bajos indican mejor ajuste al corpus.
                </p>
                <div className="space-y-2">
                  {models
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

            {/* Error de reconstrucción (solo si hay datos) */}
            {models.some(([, m]) => m.reconstruction_error != null) && (
              <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h2 className="text-base font-semibold text-slate-800 mb-1">Error de reconstrucción</h2>
                <p className="text-xs text-slate-400 mb-4">
                  Disponible para NMF, LSA y pLSA. Valores más bajos indican mejor factorización.
                </p>
                <div className="space-y-2">
                  {models
                    .filter(([, m]) => m.reconstruction_error != null)
                    .sort(([, a], [, b]) => (b.reconstruction_error ?? 0) - (a.reconstruction_error ?? 0))
                    .map(([key, model]) => (
                      <MetricBar
                        key={key}
                        label={modelMeta(key).label}
                        value={model.reconstruction_error}
                        max={maxReconError}
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
