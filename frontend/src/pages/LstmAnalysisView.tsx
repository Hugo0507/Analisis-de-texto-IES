/**
 * LstmAnalysisView — Resultados del modelo LSTM.
 *
 * Muestra:
 * - KPIs: accuracy, tiempo de entrenamiento, documentos, temas
 * - Curva de aprendizaje (loss por época) — Nivo Line
 * - Matriz de confusión — Nivo HeatMap
 * - Reporte de clasificación por tema — tabla
 * - Parámetros del modelo
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import lstmService from '../services/lstmService';
import type { LstmAnalysis } from '../services/lstmService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

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
  useEffect(() => {
    if (analysis?.status !== 'processing') return;
    const timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  }, [analysis?.status]);

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
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
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
          </div>
        </div>

        {isCompleted && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Accuracy (Test)"
                value={analysis.accuracy !== null ? `${(analysis.accuracy * 100).toFixed(2)}%` : '—'}
                sub="Exactitud en el conjunto de prueba"
                accent={analysis.accuracy !== null && analysis.accuracy >= 0.7 ? 'text-emerald-600' : 'text-amber-600'}
              />
              <KpiCard
                label="Tiempo de Entrenamiento"
                value={analysis.training_time_seconds !== null
                  ? analysis.training_time_seconds >= 60
                    ? `${(analysis.training_time_seconds / 60).toFixed(1)} min`
                    : `${analysis.training_time_seconds.toFixed(0)} s`
                  : '—'}
                sub="Duración total del pipeline"
              />
              <KpiCard
                label="Documentos Usados"
                value={analysis.documents_used}
                sub={`${analysis.num_classes} clases de temas`}
              />
              <KpiCard
                label="Vocabulario"
                value={analysis.vocab_size_actual.toLocaleString()}
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
                <h2 className="text-base font-semibold text-gray-900 mb-1">Matriz de Confusión</h2>
                <p className="text-xs text-gray-400 mb-4">
                  Filas = clase real · Columnas = clase predicha · La diagonal indica predicciones correctas
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
                <h2 className="text-base font-semibold text-gray-900 mb-1">Reporte de Clasificación</h2>
                <p className="text-xs text-gray-400 mb-4">Métricas de evaluación por tema en el conjunto de prueba</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tema</th>
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
                          <td className="text-center py-2.5 px-3 text-gray-700">{(m.precision * 100).toFixed(1)}%</td>
                          <td className="text-center py-2.5 px-3 text-gray-700">{(m.recall * 100).toFixed(1)}%</td>
                          <td className={`text-center py-2.5 px-3 font-semibold ${f1Color(m.f1_score)}`}>
                            {(m.f1_score * 100).toFixed(1)}%
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
                  { label: 'Embedding Dim', value: analysis.embedding_dim },
                  { label: 'Hidden Dim', value: analysis.hidden_dim },
                  { label: 'Capas LSTM', value: analysis.num_layers },
                  { label: 'Épocas', value: analysis.num_epochs },
                  { label: 'Learning Rate', value: analysis.learning_rate },
                  { label: 'Batch Size', value: analysis.batch_size },
                  { label: 'Train Split', value: `${(analysis.train_split * 100).toFixed(0)}%` },
                  { label: 'Max Vocab', value: analysis.max_vocab_size.toLocaleString() },
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
