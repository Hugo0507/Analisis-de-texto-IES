/**
 * Pipeline Page
 *
 * Executes the complete NLP pipeline in a single click with default values.
 * Shows each stage with its configuration, status, duration and detailed results.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Play, CheckCircle2, XCircle, Clock, SkipForward, Zap, Info,
  RefreshCw, ChevronDown, ChevronUp, BookOpen, Hash, BarChart2,
  Tag, Layers,
} from 'lucide-react';
import pipelineService from '../services/pipelineService';
import type { ExecutePipelineResponse, PipelineStatusResponse } from '../services/pipelineService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

// ── Stage metadata ─────────────────────────────────────────────────────────

const STAGE_META: Record<string, { label: string; group: string; defaults: string[] }> = {
  language_detection: { label: 'Verificar documentos', group: 'Preprocesamiento', defaults: ['Confirma documentos disponibles en BD', 'Extracción manejada por Conjunto de Datos'] },
  txt_conversion:     { label: 'Verificar texto extraído', group: 'Preprocesamiento', defaults: ['Confirma texto preprocesado en BD', 'Extracción manejada por Preparación de Datos'] },
  preprocessing:      { label: 'Preprocesamiento de texto', group: 'Preprocesamiento', defaults: ['Eliminar stopwords: sí', 'Eliminar puntuación: sí', 'Eliminar números: sí', 'Stemming: no', 'Longitud mínima: 3', 'Longitud máxima: 30'] },
  bow_generation:     { label: 'Bolsa de Palabras (BoW)', group: 'Vectorización', defaults: ['Vocabulario máximo: 5,000 términos', 'Frecuencia mínima: 2 docs', 'Frecuencia máxima: 85%', 'N-gramas: (1,1)'] },
  tfidf_calculation:  { label: 'Matriz TF-IDF', group: 'Vectorización', defaults: ['Vocabulario máximo: 5,000 términos', 'Normalización: L2', 'IDF activado: sí'] },
  lda_training:       { label: 'Topic Modeling — LDA', group: 'Modelado', defaults: ['Latent Dirichlet Allocation', 'Tópicos: 10'] },
  nmf_training:       { label: 'Topic Modeling — NMF', group: 'Modelado', defaults: ['Non-negative Matrix Factorization', 'Tópicos: 10'] },
  lsa_training:       { label: 'Topic Modeling — LSA', group: 'Modelado', defaults: ['Latent Semantic Analysis (SVD)', 'Tópicos: 10'] },
  plsa_training:      { label: 'Topic Modeling — pLSA', group: 'Modelado', defaults: ['Probabilistic Latent Semantic Analysis', 'Tópicos: 10'] },
  topic_comparison:   { label: 'Comparación de modelos', group: 'Modelado', defaults: ['Compara LDA · NMF · LSA · pLSA', 'Métrica: coherencia + perplejidad'] },
  factor_analysis:    { label: 'Análisis de factores', group: 'Análisis', defaults: ['Normalización por longitud: sí', '16 factores predefinidos', '8 categorías'] },
  consolidation:      { label: 'Consolidación de resultados', group: 'Reporte', defaults: ['Agregación de métricas globales'] },
  cache_validation:   { label: 'Validación de caché', group: 'Reporte', defaults: ['Verifica consistencia caché triple capa'] },
  final_report:       { label: 'Reporte final', group: 'Reporte', defaults: ['Genera resumen ejecutivo del análisis'] },
};

const STAGE_ORDER = [
  'language_detection', 'txt_conversion', 'preprocessing',
  'bow_generation', 'tfidf_calculation',
  'lda_training', 'nmf_training', 'lsa_training', 'plsa_training', 'topic_comparison',
  'factor_analysis', 'consolidation', 'cache_validation', 'final_report',
];

const GROUP_COLORS: Record<string, string> = {
  'Preprocesamiento': 'text-blue-600 bg-blue-50 border-blue-200',
  'Vectorización':    'text-violet-600 bg-violet-50 border-violet-200',
  'Modelado':         'text-amber-600 bg-amber-50 border-amber-200',
  'Análisis':         'text-emerald-600 bg-emerald-50 border-emerald-200',
  'Reporte':          'text-slate-600 bg-slate-50 border-slate-200',
};

function formatDuration(seconds?: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

function fmt(n: unknown): string {
  if (n == null) return '—';
  if (typeof n === 'number') return n % 1 === 0 ? n.toLocaleString('es-CO') : n.toFixed(4);
  return String(n);
}

// ── Stage result panels ─────────────────────────────────────────────────────

const ResultBadge: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-w-[90px]">
    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{label}</span>
    <span className="text-sm font-semibold text-slate-700">{value}</span>
  </div>
);

const TermPills: React.FC<{ terms: Array<{ term: string; tfidf_score?: number; frequency?: number }> }> = ({ terms }) => (
  <div className="flex flex-wrap gap-1.5 mt-2">
    {terms.slice(0, 20).map((t, i) => (
      <span key={i} className="text-xs px-2 py-0.5 bg-violet-50 border border-violet-200 text-violet-700 rounded-full font-mono">
        {t.term}
        {(t.tfidf_score != null || t.frequency != null) && (
          <span className="ml-1 text-violet-400">{fmt(t.tfidf_score ?? t.frequency)}</span>
        )}
      </span>
    ))}
  </div>
);

const TopicCard: React.FC<{ topic: Record<string, unknown>; idx: number }> = ({ topic, idx }) => {
  const words = (topic.words ?? topic.top_words ?? []) as Array<[string, number] | string>;
  const wordList = words.slice(0, 8).map(w => Array.isArray(w) ? w[0] : w);
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      <p className="text-xs font-semibold text-amber-700 mb-1">Tópico {(topic.topic_number as number ?? idx) + 1}</p>
      <div className="flex flex-wrap gap-1">
        {wordList.map((w, i) => (
          <span key={i} className="text-xs px-1.5 py-0.5 bg-white border border-amber-200 text-amber-800 rounded font-mono">{w}</span>
        ))}
      </div>
    </div>
  );
};

const StageResultPanel: React.FC<{ stageName: string; data: Record<string, unknown> }> = ({ stageName, data }) => {
  if (!data || Object.keys(data).length === 0) return null;

  // Message-only stages (language_detection, txt_conversion, preprocessing)
  if (data.message) {
    return (
      <div className="mt-3 flex items-start gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
        <span>{String(data.message)}</span>
      </div>
    );
  }

  // Preprocessing result
  if (stageName === 'preprocessing') {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {data.preprocessed != null && <ResultBadge label="Preprocesados" value={fmt(data.preprocessed)} />}
        {data.total != null && <ResultBadge label="Total" value={fmt(data.total)} />}
        {data.failed != null && <ResultBadge label="Fallidos" value={fmt(data.failed)} />}
      </div>
    );
  }

  // BoW / TF-IDF
  if (stageName === 'bow_generation' || stageName === 'tfidf_calculation') {
    const terms = (data.top_terms ?? []) as Array<{ term: string; tfidf_score?: number; frequency?: number }>;
    return (
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          <ResultBadge label="Vocabulario" value={fmt(data.vocabulary_size)} />
          <ResultBadge label="Documentos" value={fmt(data.document_count)} />
          {data.avg_tfidf_score != null && <ResultBadge label="TF-IDF promedio" value={fmt(data.avg_tfidf_score)} />}
          {data.sparsity != null && <ResultBadge label="Dispersión" value={`${(Number(data.sparsity) * 100).toFixed(1)}%`} />}
        </div>
        {terms.length > 0 && (
          <>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><Hash className="w-3 h-3" />Top términos</p>
            <TermPills terms={terms} />
          </>
        )}
      </div>
    );
  }

  // Topic models (lda, nmf, lsa, plsa)
  if (['lda_training', 'nmf_training', 'lsa_training', 'plsa_training'].includes(stageName)) {
    const topics = (data.topics ?? []) as Array<Record<string, unknown>>;
    return (
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          <ResultBadge label="Modelo" value={String(data.model_type ?? '').toUpperCase()} />
          <ResultBadge label="Tópicos" value={fmt(data.n_topics)} />
          {data.coherence != null && <ResultBadge label="Coherencia" value={fmt(data.coherence)} />}
          {data.perplexity != null && <ResultBadge label="Perplejidad" value={fmt(data.perplexity)} />}
          {data.reconstruction_error != null && <ResultBadge label="Error reconstrucción" value={fmt(data.reconstruction_error)} />}
          {data.explained_variance != null && <ResultBadge label="Varianza explicada" value={fmt(data.explained_variance)} />}
        </div>
        {topics.length > 0 && (
          <>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><Layers className="w-3 h-3" />Primeros tópicos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {topics.slice(0, 6).map((t, i) => <TopicCard key={i} topic={t} idx={i} />)}
            </div>
          </>
        )}
      </div>
    );
  }

  // Topic comparison
  if (stageName === 'topic_comparison') {
    const models = (data.models ?? {}) as Record<string, Record<string, unknown>>;
    return (
      <div className="mt-3 space-y-3">
        {data.best_model != null ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Mejor modelo: <strong>{String(data.best_model).toUpperCase()}</strong></span>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2 text-left text-slate-500 font-semibold">Modelo</th>
                <th className="px-3 py-2 text-right text-slate-500 font-semibold">Coherencia</th>
                <th className="px-3 py-2 text-right text-slate-500 font-semibold">Perplejidad</th>
                <th className="px-3 py-2 text-right text-slate-500 font-semibold">Error recons.</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(models).map(([name, m]) => (
                <tr key={name} className={`border-b border-slate-100 ${name === data.best_model ? 'bg-emerald-50' : ''}`}>
                  <td className="px-3 py-2 font-semibold text-slate-700">{name.toUpperCase()}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-600">{fmt(m.coherence)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-600">{fmt(m.perplexity)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-600">{fmt(m.reconstruction_error)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Factor analysis
  if (stageName === 'factor_analysis') {
    const factors = (data.factors ?? data.factor_ranking ?? []) as Array<Record<string, unknown>>;
    const byCategory = (data.by_category ?? data.category_breakdown ?? {}) as Record<string, unknown>;
    return (
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {data.document_count != null && <ResultBadge label="Documentos" value={fmt(data.document_count)} />}
          {data.total_mentions != null && <ResultBadge label="Menciones" value={fmt(data.total_mentions)} />}
          {(data.factor_count ?? factors.length) > 0 && <ResultBadge label="Factores" value={fmt(data.factor_count ?? factors.length)} />}
        </div>
        {factors.length > 0 && (
          <>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><Tag className="w-3 h-3" />Top factores</p>
            <div className="space-y-1">
              {factors.slice(0, 8).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-right text-slate-400 font-mono shrink-0">{i + 1}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${Math.min(100, (Number(f.normalized_score ?? f.mention_count ?? 0) / (Number(factors[0]?.normalized_score ?? factors[0]?.mention_count ?? 1) || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-slate-700 font-medium min-w-[100px]">{String(f.name ?? f.factor_name ?? '')}</span>
                  <span className="font-mono text-slate-400">{fmt(f.normalized_score ?? f.mention_count)}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {Object.keys(byCategory).length > 0 && (
          <>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-2"><BarChart2 className="w-3 h-3" />Por categoría</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(byCategory).map(([cat, val]) => (
                <span key={cat} className="text-xs px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full">
                  {cat}: {typeof val === 'object' && val !== null ? fmt((val as Record<string, unknown>).total_mentions ?? (val as Record<string, unknown>).mention_count) : fmt(val)}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
};

// ── Stage row ──────────────────────────────────────────────────────────────

type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

interface StageRowProps {
  stageName: string;
  status: StageStatus;
  duration?: number;
  cached?: boolean;
  error?: string | null;
  resultData?: Record<string, unknown>;
  expanded: boolean;
  onToggle: () => void;
}

const StageRow: React.FC<StageRowProps> = ({ stageName, status, duration, cached, error, resultData, expanded, onToggle }) => {
  const meta = STAGE_META[stageName] ?? { label: stageName, group: 'Otro', defaults: [] };
  const groupColor = GROUP_COLORS[meta.group] ?? 'text-slate-600 bg-slate-50 border-slate-200';

  const statusIcon = {
    pending:   <div className="w-5 h-5 rounded-full border-2 border-slate-200 bg-white shrink-0" />,
    running:   <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />,
    completed: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    failed:    <XCircle className="w-5 h-5 text-red-500 shrink-0" />,
    skipped:   <SkipForward className="w-5 h-5 text-slate-300 shrink-0" />,
  }[status];

  const rowBg = { pending: 'bg-white', running: 'bg-blue-50/60', completed: 'bg-white', failed: 'bg-red-50/40', skipped: 'bg-slate-50/60' }[status];
  const hasResults = resultData && Object.keys(resultData).length > 0;

  return (
    <div className={`rounded-xl border border-slate-100 overflow-hidden transition-colors ${rowBg}`}>
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={onToggle}>
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${status === 'skipped' ? 'text-slate-400' : 'text-slate-800'}`}>{meta.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${groupColor}`}>{meta.group}</span>
            {cached && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-medium">caché</span>}
            {hasResults && status === 'completed' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 font-medium flex items-center gap-1">
                <BookOpen className="w-3 h-3" />Ver resultados
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {duration !== undefined && (
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />{formatDuration(duration)}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-white/80">
          {/* Config defaults */}
          <div className="flex flex-wrap gap-2 mt-3">
            {meta.defaults.map((d, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">{d}</span>
            ))}
          </div>
          {/* Error */}
          {error && <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">Error: {error}</p>}
          {/* Results */}
          {hasResults && <StageResultPanel stageName={stageName} data={resultData!} />}
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

export const Pipeline: React.FC = () => {
  const { showError, showSuccess } = useToast();

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutePipelineResponse | null>(null);
  const [history, setHistory] = useState<PipelineStatusResponse[]>([]);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<PipelineStatusResponse | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const data = await pipelineService.getHistory(20);
      if (data.success) setHistory(data.executions);
    } catch {
      // silencioso
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const toggleStage = (name: string) =>
    setExpandedStages(prev => ({ ...prev, [name]: !prev[name] }));

  const runPipeline = async () => {
    setIsRunning(true);
    setResult(null);
    setSelectedExecution(null);
    setExpandedStages({});
    try {
      const data = await pipelineService.execute({ use_cache: false, skip_stages: [] });
      setResult(data);
      await loadHistory();
      if (data.failed_stages === 0) {
        showSuccess(`Pipeline completado: ${data.completed_stages}/${data.total_stages} etapas exitosas`);
      } else {
        showError(`Pipeline completado con ${data.failed_stages} etapa(s) fallida(s)`);
      }
    } catch (err: any) {
      showError('Error al ejecutar el pipeline: ' + (err.response?.data?.error ?? err.message));
    } finally {
      setIsRunning(false);
    }
  };

  const getStageStatus = (stageName: string): StageStatus => {
    if (isRunning) return 'running';
    if (!result) return 'pending';
    const s = result.stages[stageName];
    if (!s) return 'pending';
    if (s.success) return 'completed';
    return 'failed';
  };

  const totalDuration = result
    ? Object.values(result.stages).reduce((sum, s: any) => sum + (s.duration_seconds ?? 0), 0)
    : null;

  const historyStageStatus = (exec: PipelineStatusResponse, stageName: string): StageStatus => {
    const s = exec.stages.find(st => st.stage_name === stageName);
    if (!s) return 'pending';
    if (s.status === 'completed') return 'completed';
    if (s.status === 'failed') return 'failed';
    if (s.status === 'skipped') return 'skipped';
    return 'pending';
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center justify-between px-4 sm:px-8 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Zap className="w-5 h-5 text-emerald-600 shrink-0" />
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Pipeline NLP Completo</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <button onClick={loadHistory} className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors" title="Refrescar historial">
              <RefreshCw className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={runPipeline}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isRunning
                ? <><Spinner /><span className="hidden sm:inline">Ejecutando…</span></>
                : <><Play className="w-4 h-4" /><span className="hidden sm:inline">Ejecutar pipeline</span></>}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">

        {/* Info */}
        <div className="flex gap-2.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <span className="leading-relaxed">
            Ejecuta las <strong>14 etapas del flujo NLP</strong> de forma automática con los valores por defecto.
            Incluye preprocesamiento, vectorización (BoW + TF-IDF), modelado de tópicos (LDA · NMF · LSA · pLSA) y análisis de factores.
            Haz clic en cada etapa para ver los resultados detallados.
          </span>
        </div>

        {/* Current run result summary */}
        {result && (
          <div className={`rounded-xl p-5 border-l-4 ${result.failed_stages === 0 ? 'bg-emerald-50 border-emerald-500' : 'bg-amber-50 border-amber-500'}`}>
            <div className="flex items-center gap-3 flex-wrap">
              {result.failed_stages === 0
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                : <XCircle className="w-5 h-5 text-amber-600 shrink-0" />}
              <div>
                <p className={`font-semibold text-sm ${result.failed_stages === 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {result.failed_stages === 0 ? 'Pipeline completado exitosamente' : `Pipeline completado con ${result.failed_stages} error(es)`}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {result.completed_stages} completadas · {result.failed_stages} fallidas · {result.skipped_stages} omitidas · {formatDuration(totalDuration)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pipeline stages — current run */}
        {(isRunning || result) && (
          <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 className="text-base font-semibold text-slate-800 mb-1">
              {isRunning ? 'Ejecución en curso' : `Resultado — ${result?.execution_id?.slice(0, 8)}…`}
            </h2>
            <p className="text-xs text-slate-400 mb-4">Haz clic en cada etapa para ver configuración y resultados detallados.</p>
            <div className="space-y-2">
              {STAGE_ORDER.map((stageName) => {
                const stageResult = result?.stages[stageName];
                return (
                  <StageRow
                    key={stageName}
                    stageName={stageName}
                    status={getStageStatus(stageName)}
                    duration={stageResult?.duration_seconds}
                    cached={stageResult?.cached}
                    error={stageResult?.error}
                    resultData={stageResult?.result_data as Record<string, unknown> | undefined}
                    expanded={expandedStages[stageName] ?? false}
                    onToggle={() => toggleStage(stageName)}
                  />
                );
              })}
            </div>
            {isRunning && (
              <div className="mt-5 flex items-center justify-center gap-3 text-sm text-slate-500 py-4">
                <Spinner />
                <span>Ejecutando pipeline… esto puede tardar varios minutos</span>
              </div>
            )}
          </div>
        )}

        {/* Selected historical execution detail */}
        {selectedExecution && (
          <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-slate-800">
                Ejecución — {selectedExecution.execution_id?.slice(0, 8)}…
              </h2>
              <button onClick={() => setSelectedExecution(null)} className="text-xs text-slate-400 hover:text-slate-600">
                Cerrar
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {selectedExecution.completed}/{selectedExecution.total_stages} etapas completadas
              {selectedExecution.has_errors && ' · Con errores'}
            </p>
            <div className="space-y-2">
              {STAGE_ORDER.map((stageName) => {
                const s = selectedExecution.stages.find(st => st.stage_name === stageName);
                return (
                  <StageRow
                    key={stageName}
                    stageName={stageName}
                    status={historyStageStatus(selectedExecution, stageName)}
                    duration={s?.duration_seconds ?? undefined}
                    cached={s?.cache_hit ?? undefined}
                    error={s?.error_message ?? undefined}
                    resultData={s?.result_data}
                    expanded={expandedStages[`hist_${stageName}`] ?? false}
                    onToggle={() => toggleStage(`hist_${stageName}`)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* History table */}
        <div className="bg-white p-5 sm:p-7" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 className="text-base font-semibold text-slate-800 mb-1">Historial de ejecuciones</h2>
          <p className="text-xs text-slate-400 mb-4">Haz clic en una fila para ver las etapas y resultados de esa ejecución.</p>

          {loadingHistory ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500 mb-6">No hay ejecuciones registradas.</p>
              <button
                onClick={runPipeline}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium shadow-md"
              >
                <Play className="w-4 h-4" />
                Ejecutar pipeline completo
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID de ejecución</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Etapas</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Progreso</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duración</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((exec, i) => {
                    const totalSecs = exec.stages.reduce((s, st) => s + (st.duration_seconds ?? 0), 0);
                    const startedAt = exec.stages[0]?.started_at;
                    const isSelected = selectedExecution?.execution_id === exec.execution_id;
                    return (
                      <tr
                        key={exec.execution_id}
                        onClick={() => setSelectedExecution(isSelected ? null : exec)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-4 text-sm font-medium text-gray-500">
                          {String(i + 1).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-mono text-gray-700">{exec.execution_id?.slice(0, 16)}…</span>
                        </td>
                        <td className="px-4 py-4">
                          {exec.has_errors ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              <XCircle className="w-3 h-3" />Con errores
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />Exitoso
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {exec.completed}/{exec.total_stages}
                          {exec.failed > 0 && <span className="ml-1 text-red-500">({exec.failed} fallidas)</span>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${exec.has_errors ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                style={{ width: `${exec.progress_percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 font-mono">{exec.progress_percentage}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 font-mono">
                          {formatDuration(totalSecs)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {startedAt ? formatDate(startedAt) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!result && !isRunning && history.length > 0 && (
          <div className="text-center pb-4">
            <button
              onClick={runPipeline}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium shadow-md transition-all"
            >
              <Play className="w-4 h-4" />
              Nueva ejecución
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
