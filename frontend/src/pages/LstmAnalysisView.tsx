/**
 * LstmAnalysisView — Resultados del modelo LSTM.
 *
 * Muestra:
 * - Métricas principales por documento (exactitud, F1 macro) contra la línea base
 *   de responder siempre la clase mayoritaria, con un veredicto basado en F1 macro
 * - Métricas por fragmento como dato secundario (si el análisis fragmentó documentos)
 * - Curva de aprendizaje (loss por época) — Nivo Line
 * - Matriz de confusión por documento — Nivo HeatMap
 * - Reporte de clasificación por documento — tabla
 * - Parámetros del modelo, incluyendo modo de etiquetas y palabras por fragmento
 *
 * Los análisis creados antes de estos campos llegan con valores null: cada bloque
 * los maneja de forma segura y solo muestra lo disponible.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import lstmService from '../services/lstmService';
import type { LstmAnalysis } from '../services/lstmService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';
import { LoadingPanel } from '../components/molecules';
import { usePolling } from '../hooks/usePolling';

// ── Helpers ───────────────────────────────────────────────────────────────────

const KpiCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}> = ({ label, value, sub, accent = 'bg-indigo-50 text-indigo-700' }) => (
  <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
    <p className={`text-2xl font-bold ${accent}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const InfoBoxNeutral: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-2 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
    <svg className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>{children}</span>
  </div>
);

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Pendiente' },
  processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Procesando' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Completado' },
  error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Error' },
};

// ── Main Component ────────────────────────────────────────────────────────────

export const LstmAnalysisView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();

  const [analysis, setAnalysis] = useState<LstmAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) load();
  }, [id]);

  // Poll while processing
  usePolling(() => poll(), analysis?.status === 'processing');

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await lstmService.getById(Number(id));
      setAnalysis(data);
    } catch (err: any) {
      showError('Error al cargar el análisis: ' + (err.response?.data?.error || err.message));
      navigate('/admin/modelado/lstm');
    } finally {
      setIsLoading(false);
    }
  };

  const poll = async () => {
    try {
      const p = await lstmService.getProgress(Number(id));
      setAnalysis(prev => {
        if (!prev) return prev;
        return { ...prev, ...p };
      });
      if (p.status === 'completed') await load();
    } catch { /* ignore */ }
  };

  const formatDate = (s: string | null) => {
    if (!s) return 'N/A';
    return new Date(s).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <LoadingPanel />
    );
  }

  if (!analysis) return null;

  const statusStyle = STATUS_STYLES[analysis.status] || STATUS_STYLES.pending;
  const isCompleted = analysis.status === 'completed';
  const isProcessing = analysis.status === 'processing';

  // ── Nivo Line data (loss history) ──────────────────────────────
  const lineData = analysis.loss_history.length > 0 ? [
    {
      id: 'Loss de Entrenamiento',
      color: '#6366f1',
      data: analysis.loss_history.map((v, i) => ({ x: i + 1, y: v })),
    },
  ] : [];

  // ── Nivo HeatMap data (confusion matrix) ───────────────────────
  const heatmapData = analysis.confusion_matrix.length > 0
    ? analysis.confusion_matrix.map((row, rowIdx) => ({
        id: analysis.class_labels[rowIdx] ?? `Clase ${rowIdx}`,
        data: row.map((val, colIdx) => ({
          x: analysis.class_labels[colIdx] ?? `Clase ${colIdx}`,
          y: val,
        })),
      }))
    : [];

  // ── f1 color helper ─────────────────────────────────────────────
  const f1Color = (f1: number) => {
    if (f1 >= 0.8) return 'text-emerald-600';
    if (f1 >= 0.5) return 'text-amber-600';
    return 'text-red-500';
  };

  // ── Formato de números en español ───────────────────────────────
  const formatPercent = (value: number | null, decimals = 1): string => {
    if (value === null || value === undefined) return '—';
    return `${(value * 100).toLocaleString('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}%`;
  };

  const formatDecimal = (value: number | null, decimals = 2): string => {
    if (value === null || value === undefined) return '—';
    return value.toLocaleString('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // ── Veredicto: F1 macro (por documento) contra la línea base ────
  const hasVerdict = analysis.macro_f1 !== null && analysis.baseline_macro_f1 !== null;
  const f1Diff = hasVerdict ? (analysis.macro_f1 as number) - (analysis.baseline_macro_f1 as number) : null;
  const VERDICT_EPSILON = 0.005;
  const verdict = (() => {
    if (f1Diff === null) return null;
    if (f1Diff > VERDICT_EPSILON) {
      return {
        tone: 'good' as const,
        text: `Supera la línea base por ${formatDecimal(f1Diff)} de F1 macro.`,
      };
    }
    if (f1Diff < -VERDICT_EPSILON) {
      return {
        tone: 'bad' as const,
        text: 'No supera la línea base: el modelo no aprendió más que la clase mayoritaria.',
      };
    }
    return {
      tone: 'neutral' as const,
      text: 'Empata con la línea base: el modelo no muestra una ventaja clara sobre la clase mayoritaria.',
    };
  })();
  const VERDICT_STYLES = {
    good: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-500' },
    bad: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-500' },
    neutral: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-500' },
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center gap-3 px-8 py-4">
          <button
            type="button"
            onClick={() => navigate('/admin/modelado/lstm')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Volver"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-900 flex-1 truncate">{analysis.name}</h1>
          <span className={`px-3 py-1 text-xs rounded-full font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto space-y-6">

        {/* Processing progress */}
        {isProcessing && (
          <div className="bg-white p-6 rounded-2xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div className="flex items-center gap-3 mb-4">
              <Spinner size="md" />
              <div>
                <h3 className="text-base font-semibold text-gray-900">Entrenando modelo LSTM...</h3>
                <p className="text-xs text-gray-500">{analysis.current_stage_display}</p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
              <div
                className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${analysis.progress_percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-right">{analysis.progress_percentage}%</p>
          </div>
        )}

        {/* Error */}
        {analysis.status === 'error' && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
            <h3 className="text-base font-semibold text-red-900 mb-1">Error en el entrenamiento</h3>
            <p className="text-sm text-red-700">{analysis.error_message}</p>
          </div>
        )}

        {/* Info */}
        <div className="bg-white p-6 rounded-2xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Información General</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Preparación de Datos</p>
              <p className="font-medium text-gray-800">{analysis.data_preparation_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Modelo de Temas</p>
              <p className="font-medium text-gray-800">{analysis.topic_modeling_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Creado por</p>
              <p className="font-medium text-gray-800">{analysis.created_by_username}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Creado</p>
              <p className="font-medium text-gray-800">{formatDate(analysis.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Qué se clasifica</p>
              <p className="font-medium text-gray-800">{analysis.label_mode_display}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Unidad de entrenamiento</p>
              <p className="font-medium text-gray-800">
                {analysis.fragment_words > 0
                  ? `Fragmentos de ${analysis.fragment_words.toLocaleString('es-ES')} palabras`
                  : 'Documento completo'}
              </p>
            </div>
          </div>
        </div>

        {isCompleted && (
          <>
            {/* Métricas principales — por documento vs. línea base */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Exactitud (por documento)"
                value={formatPercent(analysis.accuracy)}
                sub="Modelo LSTM en el conjunto de prueba"
                accent={analysis.accuracy !== null && analysis.accuracy >= 0.7 ? 'text-emerald-600' : 'text-amber-600'}
              />
              <KpiCard
                label="F1 Macro (por documento)"
                value={formatDecimal(analysis.macro_f1)}
                sub="Promedio simple de F1 entre clases — la métrica del veredicto"
                accent={analysis.macro_f1 !== null ? f1Color(analysis.macro_f1) : 'text-gray-400'}
              />
              <KpiCard
                label="Exactitud — Línea Base"
                value={formatPercent(analysis.baseline_accuracy)}
                sub="Responder siempre la clase mayoritaria"
              />
              <KpiCard
                label="F1 Macro — Línea Base"
                value={formatDecimal(analysis.baseline_macro_f1)}
                sub="Responder siempre la clase mayoritaria"
              />
            </div>

            {/* Veredicto */}
            {verdict ? (
              <div className={`flex items-start gap-3 p-5 rounded-2xl border ${VERDICT_STYLES[verdict.tone].bg} ${VERDICT_STYLES[verdict.tone].border}`}>
                <svg className={`w-5 h-5 shrink-0 mt-0.5 ${VERDICT_STYLES[verdict.tone].icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {verdict.tone === 'good' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : verdict.tone === 'bad' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <div>
                  <p className={`text-sm font-semibold ${VERDICT_STYLES[verdict.tone].text}`}>{verdict.text}</p>
                  <p className={`text-xs mt-1 ${VERDICT_STYLES[verdict.tone].text} opacity-80`}>
                    Se compara con F1 macro (no exactitud) porque promedia el desempeño entre todas las
                    clases por igual: la exactitud puede verse bien solo por acertar la clase mayoritaria.
                  </p>
                </div>
              </div>
            ) : (
              <InfoBoxNeutral>
                Este análisis no tiene línea base ni F1 macro por documento (fue entrenado antes de
                incorporar esta comparación). Solo se muestra la exactitud disponible.
              </InfoBoxNeutral>
            )}

            {/* Métricas por fragmento (secundarias) */}
            {(analysis.fragment_accuracy !== null || analysis.fragment_macro_f1 !== null) && (
              <div className="bg-white p-5 rounded-2xl border border-gray-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                  Dato secundario · Métricas por fragmento
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Exactitud por fragmento</p>
                    <p className="text-lg font-bold text-gray-700">{formatPercent(analysis.fragment_accuracy)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">F1 Macro por fragmento</p>
                    <p className="text-lg font-bold text-gray-700">{formatDecimal(analysis.fragment_macro_f1)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Se calculan sobre cada fragmento por separado, antes de promediar por documento. No son
                  comparables con las métricas principales de arriba ni con la línea base: úsalas solo como
                  referencia de cómo se comporta el modelo a nivel de fragmento.
                </p>
              </div>
            )}

            {/* Datos de ejecución */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Documentos Usados"
                value={analysis.documents_used}
                sub={`${analysis.num_classes} clases`}
              />
              <KpiCard
                label="Ejemplos de Entrenamiento"
                value={analysis.samples_used !== null ? analysis.samples_used.toLocaleString('es-ES') : '—'}
                sub={analysis.fragment_words > 0 ? 'Fragmentos generados' : 'Uno por documento'}
              />
              <KpiCard
                label="Tiempo de Entrenamiento"
                value={analysis.training_time_seconds !== null
                  ? analysis.training_time_seconds >= 60
                    ? `${formatDecimal(analysis.training_time_seconds / 60, 1)} min`
                    : `${analysis.training_time_seconds.toFixed(0)} s`
                  : '—'}
                sub="Duración total del pipeline"
              />
              <KpiCard
                label="Vocabulario"
                value={analysis.vocab_size_actual.toLocaleString('es-ES')}
                sub={`Épocas: ${analysis.num_epochs}`}
              />
            </div>

            {/* Loss curve */}
            {lineData.length > 0 && (
              <div className="bg-white p-6 rounded-2xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Curva de Aprendizaje</h2>
                <p className="text-xs text-gray-400 mb-4">Loss (CrossEntropyLoss) por época durante el entrenamiento</p>
                <div style={{ height: '280px' }}>
                  <ResponsiveLine
                    data={lineData}
                    margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
                    xScale={{ type: 'linear', min: 1, max: analysis.num_epochs }}
                    yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false }}
                    curve="monotoneX"
                    colors={['#6366f1']}
                    lineWidth={2}
                    pointSize={analysis.loss_history.length <= 30 ? 6 : 0}
                    pointColor="#ffffff"
                    pointBorderWidth={2}
                    pointBorderColor="#6366f1"
                    enableArea
                    areaOpacity={0.08}
                    axisBottom={{
                      legend: 'Época',
                      legendOffset: 38,
                      legendPosition: 'middle',
                      tickSize: 4,
                    }}
                    axisLeft={{
                      legend: 'Loss',
                      legendOffset: -50,
                      legendPosition: 'middle',
                      tickSize: 4,
                    }}
                    theme={{
                      axis: { ticks: { text: { fontSize: 10, fill: '#6b7280' } }, legend: { text: { fontSize: 11, fill: '#6b7280' } } },
                      grid: { line: { stroke: '#f3f4f6' } },
                    }}
                    tooltip={({ point }) => (
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-md text-gray-800">
                        {`Época ${point.data.x} · Loss: ${(point.data.y as number).toFixed(4)}`}
                      </div>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Confusion matrix */}
            {heatmapData.length > 0 && (
              <div className="bg-white p-6 rounded-2xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Matriz de Confusión (por documento)</h2>
                <p className="text-xs text-gray-400 mb-4">
                  Filas = clase real · Columnas = clase predicha · La diagonal indica predicciones correctas.
                  Cada documento de prueba se predice promediando sus fragmentos cuando aplica.
                </p>
                <div style={{ height: `${Math.max(280, heatmapData.length * 48 + 80)}px` }}>
                  <ResponsiveHeatMap
                    data={heatmapData}
                    margin={{ top: 20, right: 20, bottom: 80, left: 160 }}
                    valueFormat=">-.0f"
                    axisTop={null}
                    axisBottom={{
                      tickSize: 4,
                      legend: 'Predicho',
                      legendOffset: 60,
                      legendPosition: 'middle',
                    }}
                    axisLeft={{
                      tickSize: 4,
                      legend: 'Real',
                      legendOffset: -140,
                      legendPosition: 'middle',
                    }}
                    colors={{
                      type: 'sequential',
                      scheme: 'purples',
                    }}
                    emptyColor="#f8fafc"
                    borderWidth={1}
                    borderColor="#e2e8f0"
                    labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                    theme={{
                      axis: { ticks: { text: { fontSize: 10, fill: '#6b7280' } }, legend: { text: { fontSize: 11, fill: '#6b7280' } } },
                    }}
                    tooltip={({ cell }) => (
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-md">
                        <span className="font-medium">Real: {cell.serieId}</span>
                        <br />
                        <span>Predicho: {cell.data.x}</span>
                        <br />
                        <span className="text-indigo-600 font-bold">{cell.value} documentos</span>
                      </div>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Classification report */}
            {Object.keys(analysis.classification_report).length > 0 && (
              <div className="bg-white p-6 rounded-2xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Reporte de Clasificación (por documento)</h2>
                <p className="text-xs text-gray-400 mb-4">Métricas de evaluación por clase en el conjunto de prueba</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clase</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Precisión</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recall</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">F1-Score</th>
                        <th className="text-center py-2 pl-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Soporte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(analysis.classification_report).map(([label, m]) => (
                        <tr key={label} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 pr-4 text-gray-800 font-medium text-xs max-w-[240px] truncate" title={label}>
                            {label}
                          </td>
                          <td className="text-center py-2.5 px-3 text-gray-700">{formatPercent(m.precision)}</td>
                          <td className="text-center py-2.5 px-3 text-gray-700">{formatPercent(m.recall)}</td>
                          <td className={`text-center py-2.5 px-3 font-semibold ${f1Color(m.f1_score)}`}>
                            {formatPercent(m.f1_score)}
                          </td>
                          <td className="text-center py-2.5 pl-3 text-gray-500">{m.support}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Model params */}
            <div className="bg-white p-6 rounded-2xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <h2 className="text-base font-semibold text-gray-900 mb-4">Parámetros del Modelo</h2>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { label: 'Qué se clasifica', value: analysis.label_mode_display },
                  { label: 'Palabras/Fragmento', value: analysis.fragment_words > 0 ? analysis.fragment_words : 'Documento completo' },
                  { label: 'Embedding Dim', value: analysis.embedding_dim },
                  { label: 'Hidden Dim', value: analysis.hidden_dim },
                  { label: 'Capas LSTM', value: analysis.num_layers },
                  { label: 'Épocas', value: analysis.num_epochs },
                  { label: 'Learning Rate', value: analysis.learning_rate },
                  { label: 'Batch Size', value: analysis.batch_size },
                  { label: 'Train Split', value: `${Math.round(analysis.train_split * 100)}%` },
                  { label: 'Max Vocab', value: analysis.max_vocab_size.toLocaleString('es-ES') },
                  { label: 'Max Seq Len', value: analysis.max_seq_length },
                ].map(p => (
                  <div key={p.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{p.label}</p>
                    <p className="text-base font-bold text-gray-900">{p.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LstmAnalysisView;
