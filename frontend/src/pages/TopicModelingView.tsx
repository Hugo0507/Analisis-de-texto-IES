/**
 * TopicModelingView Page - Visualización de Resultados Topic Modeling
 *
 * Vista de resultados completos con 4 visualizaciones:
 * 1. Distribución de Tópicos (Donut Chart)
 * 2. Detalles de Tópicos (Grid con palabras)
 * 3. Tabla de Documentos por Tópico
 * 4. Palabras Clave por Tópico (Barras)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import topicModelingService from '../services/topicModelingService';
import type { TopicModeling } from '../services/topicModelingService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

// Register ChartJS components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export const TopicModelingView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();

  const [analysis, setAnalysis] = useState<TopicModeling | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<number>(0);

  // Polling para progreso
  useEffect(() => {
    if (!id) return;

    loadAnalysis();

    // Polling cada 2 segundos si está procesando
    const interval = setInterval(() => {
      if (analysis?.status === 'processing') {
        loadProgress();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [id, analysis?.status]);

  const loadAnalysis = async () => {
    setIsLoading(true);
    try {
      const data = await topicModelingService.getTopicModelingById(Number(id));
      setAnalysis(data);
    } catch (error: any) {
      showError('Error al cargar análisis: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const progressData = await topicModelingService.getProgress(Number(id));
      if (analysis) {
        setAnalysis({
          ...analysis,
          status: progressData.status,
          status_display: progressData.status_display,
          progress_percentage: progressData.progress_percentage,
          current_stage: progressData.current_stage,
          current_stage_display: progressData.current_stage_display,
          error_message: progressData.error_message,
        });
      }
    } catch (error) {
      // Silently fail for progress updates
      console.error('Error updating progress:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-emerald-100 text-emerald-700',
      error: 'bg-red-100 text-red-700',
    };

    const labels = {
      pending: 'Pendiente',
      processing: 'Procesando',
      completed: 'Completado',
      error: 'Error',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getAlgorithmBadge = (category: string) => {
    const isProbabilistic = category === 'Probabilistic';
    const bgColor = isProbabilistic ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bgColor}`}>
        {category === 'Probabilistic' ? 'Probabilístico' : 'No Probabilístico'}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Prepare donut chart data for topic distribution
  const donutData = analysis?.topic_distribution ? {
    labels: analysis.topic_distribution.map(d => d.topic_label),
    datasets: [
      {
        data: analysis.topic_distribution.map(d => d.document_count),
        backgroundColor: [
          '#10B981', // emerald-500
          '#3B82F6', // blue-500
          '#F59E0B', // amber-500
          '#EF4444', // red-500
          '#8B5CF6', // violet-500
          '#EC4899', // pink-500
          '#06B6D4', // cyan-500
          '#F97316', // orange-500
          '#14B8A6', // teal-500
          '#84CC16', // lime-500
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  } : null;

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const dist = analysis?.topic_distribution.find(d => d.topic_label === label);
            const percentage = dist?.percentage || 0;
            return `${label}: ${value} docs (${percentage.toFixed(1)}%)`;
          },
        },
      },
    },
  };

  // Prepare bar chart data for selected topic
  const selectedTopicData = analysis?.topics[selectedTopic];
  const barData = selectedTopicData ? {
    labels: selectedTopicData.words.slice(0, 10).map(w => w.word),
    datasets: [
      {
        label: 'Peso',
        data: selectedTopicData.words.slice(0, 10).map(w => w.weight),
        backgroundColor: '#10B981',
        borderColor: '#059669',
        borderWidth: 1,
      },
    ],
  } : null;

  const barOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Peso: ${context.parsed.x.toFixed(4)}`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600">Análisis no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left: Back Button + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/modelado/topic-modeling')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{analysis.name}</h1>
              <p className="text-sm text-gray-600 mt-0.5">Topic Modeling - {analysis.algorithm_display}</p>
            </div>
          </div>

          {/* Right: Status Badge */}
          <div className="flex items-center gap-3">
            {getStatusBadge(analysis.status)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* PROGRESO (si está procesando) */}
        {analysis.status === 'processing' && (
          <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <div className="flex items-center gap-4 mb-4">
              <Spinner size="md" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Procesando Análisis</h2>
                <p className="text-sm text-gray-600 mt-1">{analysis.current_stage_display}</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${analysis.progress_percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2 text-right">{analysis.progress_percentage}%</p>
          </div>
        )}

        {/* ERROR (si falló) */}
        {analysis.status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold mb-2">Error en el Procesamiento</h3>
            <p className="text-sm text-red-700">{analysis.error_message}</p>
          </div>
        )}

        {/* INFORMACIÓN GENERAL */}
        <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Fuente</p>
              <p className="text-sm text-gray-900 mt-1">{analysis.source_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {analysis.source_type === 'data_preparation' ? 'Preprocesado' : 'Dataset Raw'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Algoritmo</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-900">{analysis.algorithm_display}</p>
                {getAlgorithmBadge(analysis.algorithm_category)}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Configuración</p>
              <p className="text-sm text-gray-900 mt-1">
                {analysis.num_topics} tópicos, {analysis.num_words} palabras/tópico
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Max iteraciones: {analysis.max_iterations}
              </p>
            </div>
          </div>

          {analysis.description && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">Descripción</p>
              <p className="text-sm text-gray-600">{analysis.description}</p>
            </div>
          )}
        </div>

        {/* Solo mostrar resultados si está completado */}
        {analysis.status === 'completed' && (
          <>
            {/* ESTADÍSTICAS */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white" style={{ borderRadius: '20px', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)' }}>
              <h2 className="text-lg font-semibold mb-4">Estadísticas del Análisis</h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                  <p className="text-sm opacity-90">Documentos</p>
                  <p className="text-3xl font-bold mt-2">{analysis.documents_processed}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                  <p className="text-sm opacity-90">Vocabulario</p>
                  <p className="text-3xl font-bold mt-2">{analysis.vocabulary_size.toLocaleString()}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                  <p className="text-sm opacity-90">Coherencia</p>
                  <p className="text-3xl font-bold mt-2">
                    {analysis.coherence_score !== null ? analysis.coherence_score.toFixed(4) : 'N/A'}
                  </p>
                </div>
                <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                  <p className="text-sm opacity-90">Perplejidad</p>
                  <p className="text-3xl font-bold mt-2">
                    {analysis.perplexity_score !== null ? analysis.perplexity_score.toFixed(2) : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                <p className="text-xs opacity-90">
                  <strong>Coherencia:</strong> Mide qué tan relacionadas están las palabras en cada tópico (mayor es mejor).
                  {analysis.is_probabilistic && <> <strong>Perplejidad:</strong> Mide qué tan bien el modelo predice nuevos datos (menor es mejor).</>}
                </p>
              </div>
            </div>

            {/* VISUALIZACIÓN 1: DISTRIBUCIÓN DE TÓPICOS (DONUT) */}
            {donutData && (
              <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Documentos por Tópico</h2>
                <div style={{ height: '400px' }}>
                  <Doughnut data={donutData} options={donutOptions} />
                </div>
              </div>
            )}

            {/* VISUALIZACIÓN 2: DETALLES DE TÓPICOS (GRID) */}
            <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Todos los Tópicos</h2>
              <div className="grid grid-cols-2 gap-4">
                {analysis.topics.map((topic, index) => (
                  <div
                    key={topic.topic_id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTopic === index
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTopic(index)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{topic.topic_label}</h3>
                      <span className="text-xs text-gray-500">
                        {analysis.topic_distribution[index]?.document_count || 0} docs
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {topic.words.slice(0, 10).map((word, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                          title={`Peso: ${word.weight.toFixed(4)}`}
                        >
                          {word.word}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* VISUALIZACIÓN 3: PALABRAS CLAVE DEL TÓPICO SELECCIONADO (BAR CHART) */}
            {barData && selectedTopicData && (
              <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Palabras Clave por Tópico</h2>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(Number(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-medium"
                  >
                    {analysis.topics.map((topic, index) => (
                      <option key={index} value={index}>
                        {topic.topic_label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ height: '400px' }}>
                  <Bar data={barData} options={barOptions} />
                </div>
              </div>
            )}

            {/* VISUALIZACIÓN 4: TABLA DE DOCUMENTOS POR TÓPICO */}
            <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Documentos por Tópico</h2>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-medium"
                >
                  {analysis.topics.map((topic, index) => (
                    <option key={index} value={index}>
                      {topic.topic_label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Documento</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tópico Dominante</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Peso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.document_topics
                      .filter(dt => dt.dominant_topic === selectedTopic)
                      .slice(0, 50)
                      .map((docTopic, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {docTopic.document_name || `Documento ${docTopic.document_id}`}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                              {analysis.topics[docTopic.dominant_topic]?.topic_label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {(docTopic.dominant_topic_weight * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Mostrando hasta 50 documentos asignados a este tópico
              </p>
            </div>

            {/* TIMESTAMPS */}
            <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <p className="text-sm text-gray-600">
                    <strong>Creado:</strong> {formatDate(analysis.created_at)}
                  </p>
                </div>
                {analysis.processing_started_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <p className="text-sm text-gray-600">
                      <strong>Inicio Procesamiento:</strong> {formatDate(analysis.processing_started_at)}
                    </p>
                  </div>
                )}
                {analysis.processing_completed_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <p className="text-sm text-gray-600">
                      <strong>Finalizado:</strong> {formatDate(analysis.processing_completed_at)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
