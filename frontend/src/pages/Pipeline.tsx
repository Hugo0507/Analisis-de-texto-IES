/**
 * Pipeline Page
 *
 * Executes the complete NLP pipeline in a single click with default values.
 * Shows each stage with its configuration, status and duration.
 * Includes a full execution history table.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Play, CheckCircle2, XCircle, Clock, SkipForward, Zap, Info,
  RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import pipelineService from '../services/pipelineService';
import type { ExecutePipelineResponse, PipelineStatusResponse } from '../services/pipelineService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

// ── Stage metadata ─────────────────────────────────────────────────────────

const STAGE_META: Record<string, { label: string; group: string; defaults: string[] }> = {
  language_detection: { label: 'Detección de idioma', group: 'Preprocesamiento', defaults: ['Detección automática por documento', 'Soporte: EN, ES, FR, PT'] },
  txt_conversion:     { label: 'Conversión a TXT', group: 'Preprocesamiento', defaults: ['Descarga desde Google Drive', 'Soporta: PDF, DOCX, TXT'] },
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

// ── Stage row ──────────────────────────────────────────────────────────────

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

  const rowBg = { pending: 'bg-white', running: 'bg-blue-50/60', completed: 'bg-white', failed: 'bg-red-50/40', skipped: 'bg-slate-50/60' }[status];

  return (
    <div className={`rounded-xl border border-slate-100 overflow-hidden transition-colors ${rowBg}`}>
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left" onClick={onToggle}>
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${status === 'skipped' ? 'text-slate-400' : 'text-slate-800'}`}>{meta.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${groupColor}`}>{meta.group}</span>
            {cached && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-medium">caché</span>}
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
        <div className="px-4 pb-3 pt-0 border-t border-slate-100 bg-white/70">
          <div className="flex flex-wrap gap-2 mt-2">
            {meta.defaults.map((d, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">{d}</span>
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">Error: {error}</p>}
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

  // Build stages display for a selected historical execution
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

        {/* Pipeline stages — show when running or after a run */}
        {(isRunning || result) && (
          <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 className="text-base font-semibold text-slate-800 mb-1">
              {isRunning ? 'Ejecución en curso' : `Resultado — ${result?.execution_id?.slice(0, 8)}…`}
            </h2>
            <p className="text-xs text-slate-400 mb-4">Haz clic en cada etapa para ver detalles.</p>
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
          <p className="text-xs text-slate-400 mb-4">Haz clic en una fila para ver las etapas de esa ejecución.</p>

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

        {/* Empty state run button when no current result */}
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
