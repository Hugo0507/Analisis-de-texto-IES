/**
 * Pipeline Page
 *
 * Executes the complete NLP pipeline in a single click with default values.
 * Shows each stage with its configuration, status and duration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  SkipForward,
  Zap,
  History,
  Info,
} from 'lucide-react';
import pipelineService from '../services/pipelineService';
import type { ExecutePipelineResponse, PipelineStatusResponse } from '../services/pipelineService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

// ── Stage metadata ─────────────────────────────────────────────────────────

interface StageMeta {
  label: string;
  group: string;
  defaults: string[];
}

const STAGE_META: Record<string, StageMeta> = {
  language_detection: {
    label: 'Detección de idioma',
    group: 'Preprocesamiento',
    defaults: ['Detección automática por documento', 'Soporte: EN, ES, FR, PT'],
  },
  txt_conversion: {
    label: 'Conversión a TXT',
    group: 'Preprocesamiento',
    defaults: ['Descarga desde Google Drive', 'Soporta: PDF, DOCX, TXT'],
  },
  preprocessing: {
    label: 'Preprocesamiento de texto',
    group: 'Preprocesamiento',
    defaults: [
      'Eliminar stopwords: sí',
      'Eliminar puntuación: sí',
      'Eliminar números: sí',
      'Stemming: no',
      'Longitud mínima de palabra: 3',
      'Longitud máxima de palabra: 30',
    ],
  },
  bow_generation: {
    label: 'Bolsa de Palabras (BoW)',
    group: 'Vectorización',
    defaults: [
      'Vocabulario máximo: 5,000 términos',
      'Frecuencia mínima: 2 documentos',
      'Frecuencia máxima: 85% del corpus',
      'N-gramas: unigramas (1,1)',
    ],
  },
  tfidf_calculation: {
    label: 'Matriz TF-IDF',
    group: 'Vectorización',
    defaults: [
      'Vocabulario máximo: 5,000 términos',
      'Normalización: L2',
      'IDF activado: sí',
      'TF sublineal: no',
    ],
  },
  lda_training: {
    label: 'Topic Modeling — LDA',
    group: 'Modelado',
    defaults: ['Modelo: Latent Dirichlet Allocation', 'Número de tópicos: 10'],
  },
  nmf_training: {
    label: 'Topic Modeling — NMF',
    group: 'Modelado',
    defaults: ['Modelo: Non-negative Matrix Factorization', 'Número de tópicos: 10'],
  },
  lsa_training: {
    label: 'Topic Modeling — LSA',
    group: 'Modelado',
    defaults: ['Modelo: Latent Semantic Analysis (SVD)', 'Número de tópicos: 10'],
  },
  plsa_training: {
    label: 'Topic Modeling — pLSA',
    group: 'Modelado',
    defaults: ['Modelo: Probabilistic Latent Semantic Analysis', 'Número de tópicos: 10'],
  },
  topic_comparison: {
    label: 'Comparación de modelos de tópicos',
    group: 'Modelado',
    defaults: ['Compara LDA · NMF · LSA · pLSA', 'Métrica: coherencia + perplejidad'],
  },
  factor_analysis: {
    label: 'Análisis de factores',
    group: 'Análisis',
    defaults: [
      'Normalización por longitud: sí',
      '16 factores predefinidos',
      '8 categorías de transformación digital',
    ],
  },
  consolidation: {
    label: 'Consolidación de resultados',
    group: 'Reporte',
    defaults: ['Agregación de métricas globales'],
  },
  cache_validation: {
    label: 'Validación de caché',
    group: 'Reporte',
    defaults: ['Verifica consistencia caché triple capa'],
  },
  final_report: {
    label: 'Reporte final',
    group: 'Reporte',
    defaults: ['Genera resumen ejecutivo del análisis'],
  },
};

const STAGE_ORDER = [
  'language_detection',
  'txt_conversion',
  'preprocessing',
  'bow_generation',
  'tfidf_calculation',
  'lda_training',
  'nmf_training',
  'lsa_training',
  'plsa_training',
  'topic_comparison',
  'factor_analysis',
  'consolidation',
  'cache_validation',
  'final_report',
];

const GROUP_COLORS: Record<string, string> = {
  'Preprocesamiento': 'text-blue-600 bg-blue-50 border-blue-200',
  'Vectorización':    'text-violet-600 bg-violet-50 border-violet-200',
  'Modelado':         'text-amber-600 bg-amber-50 border-amber-200',
  'Análisis':         'text-emerald-600 bg-emerald-50 border-emerald-200',
  'Reporte':          'text-slate-600 bg-slate-50 border-slate-200',
};

function formatDuration(seconds?: number): string {
  if (!seconds && seconds !== 0) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

// ── Stage row component ────────────────────────────────────────────────────

type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

interface StageRowProps {
  stageName: string;
  status: StageStatus;
  duration?: number;
  cached?: boolean;
  error?: string | null;
  expanded: boolean;
  onToggle: () => void;
}

const StageRow: React.FC<StageRowProps> = ({ stageName, status, duration, cached, error, expanded, onToggle }) => {
  const meta = STAGE_META[stageName] ?? { label: stageName, group: 'Otro', defaults: [] };
  const groupColor = GROUP_COLORS[meta.group] ?? 'text-slate-600 bg-slate-50 border-slate-200';

  const statusIcon = {
    pending:   <div className="w-5 h-5 rounded-full border-2 border-slate-200 bg-white shrink-0" />,
    running:   <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />,
    completed: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    failed:    <XCircle className="w-5 h-5 text-red-500 shrink-0" />,
    skipped:   <SkipForward className="w-5 h-5 text-slate-300 shrink-0" />,
  }[status];

  const rowBg = {
    pending:   'bg-white',
    running:   'bg-blue-50/60',
    completed: 'bg-white',
    failed:    'bg-red-50/40',
    skipped:   'bg-slate-50/60',
  }[status];

  return (
    <div className={`rounded-xl border border-slate-100 overflow-hidden transition-colors ${rowBg}`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={onToggle}
      >
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${status === 'skipped' ? 'text-slate-400' : 'text-slate-800'}`}>
              {meta.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${groupColor}`}>
              {meta.group}
            </span>
            {cached && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-medium">
                caché
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {duration !== undefined && (
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(duration)}
            </span>
          )}
          <div className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-slate-100 bg-white/70">
          <div className="flex flex-wrap gap-2 mt-2">
            {meta.defaults.map((d, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                {d}
              </span>
            ))}
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              Error: {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ── History card ──────────────────────────────────────────────────────────

const HistoryCard: React.FC<{ execution: PipelineStatusResponse; index: number }> = ({ execution, index }) => {
  const totalTime = execution.stages.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);
  const date = execution.stages[0]?.started_at
    ? new Date(execution.stages[0].started_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        execution.has_errors ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
      }`}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 truncate font-mono">{execution.execution_id?.slice(0, 16)}…</p>
        <p className="text-xs text-slate-400">{date}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-slate-700">{execution.completed}/{execution.total_stages} etapas</p>
        <p className="text-xs text-slate-400">{formatDuration(totalTime)}</p>
      </div>
      {execution.has_errors
        ? <XCircle className="w-5 h-5 text-red-400 shrink-0" />
        : <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
      }
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

  const loadHistory = useCallback(async () => {
    try {
      const data = await pipelineService.getHistory(5);
      if (data.success) setHistory(data.executions);
    } catch {
      // historial no disponible, silencioso
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const toggleStage = (name: string) =>
    setExpandedStages(prev => ({ ...prev, [name]: !prev[name] }));

  const runPipeline = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const data = await pipelineService.execute({
        use_cache: false,
        skip_stages: [],
      });
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

  // Build stage statuses from result or pending
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center justify-between px-4 sm:px-8 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Zap className="w-5 h-5 text-emerald-600 shrink-0" />
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Pipeline NLP Completo</h1>
          </div>
          <button
            onClick={runPipeline}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shrink-0 ml-4"
          >
            {isRunning ? <><Spinner /><span className="hidden sm:inline">Ejecutando…</span></> : <><Play className="w-4 h-4" /><span className="hidden sm:inline">Ejecutar pipeline</span></>}
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">

        {/* ── Info ── */}
        <div className="flex gap-2.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <span className="leading-relaxed">
            Ejecuta las <strong>14 etapas del flujo NLP</strong> de forma automática y secuencial usando los valores
            por defecto de cada módulo. Incluye preprocesamiento, vectorización (BoW + TF-IDF),
            modelado de tópicos (LDA · NMF · LSA · pLSA) y análisis de factores de transformación digital.
            El proceso puede tardar varios minutos dependiendo del tamaño del corpus.
          </span>
        </div>

        {/* ── Result summary (when available) ── */}
        {result && (
          <div className={`rounded-xl p-5 border-l-4 ${
            result.failed_stages === 0
              ? 'bg-emerald-50 border-emerald-500'
              : 'bg-amber-50 border-amber-500'
          }`}>
            <div className="flex items-center gap-3 flex-wrap">
              {result.failed_stages === 0
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                : <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
              }
              <div>
                <p className={`font-semibold text-sm ${result.failed_stages === 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {result.failed_stages === 0
                    ? `Pipeline completado exitosamente`
                    : `Pipeline completado con ${result.failed_stages} error(es)`
                  }
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {result.completed_stages} completadas · {result.failed_stages} fallidas · {result.skipped_stages} omitidas · Duración total: {formatDuration(totalDuration ?? 0)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Pipeline stages ── */}
        <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 className="text-base font-semibold text-slate-800 mb-1">Etapas del pipeline</h2>
          <p className="text-xs text-slate-400 mb-4">
            Haz clic en cada etapa para ver los valores por defecto que usa.
          </p>
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
                  expanded={expandedStages[stageName] ?? false}
                  onToggle={() => toggleStage(stageName)}
                />
              );
            })}
          </div>

          {!result && !isRunning && (
            <div className="mt-5 text-center">
              <button
                onClick={runPipeline}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-medium shadow-md transition-all"
              >
                <Play className="w-4 h-4" />
                Ejecutar pipeline completo
              </button>
            </div>
          )}

          {isRunning && (
            <div className="mt-5 flex items-center justify-center gap-3 text-sm text-slate-500 py-4">
              <Spinner />
              <span>Ejecutando pipeline… esto puede tardar varios minutos</span>
            </div>
          )}
        </div>

        {/* ── History ── */}
        <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            Últimas ejecuciones
          </h2>
          <p className="text-xs text-slate-400 mb-4">Historial de las 5 ejecuciones más recientes.</p>

          {loadingHistory ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">
              No hay ejecuciones previas registradas.
            </p>
          ) : (
            <div>
              {history.map((exec, i) => (
                <HistoryCard key={exec.execution_id} execution={exec} index={i} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
