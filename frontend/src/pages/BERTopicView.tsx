/**
 * BERTopicView Page - Visualización de Análisis BERTopic
 *
 * Vista detallada de resultados de análisis BERTopic.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import bertopicService from '../services/bertopicService';
import type { BERTopicAnalysis } from '../services/bertopicService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

export const BERTopicView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();

  const [analysis, setAnalysis] = useState<BERTopicAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<number>(0);

  useEffect(() => {
    if (id) {
      loadAnalysis();
    }
  }, [id]);

  // Poll progress if processing
  useEffect(() => {
    if (analysis && analysis.status === 'processing') {
      const interval = setInterval(() => {
        pollProgress();
      }, 2000); // Every 2 seconds

      return () => clearInterval(interval);
    }
  }, [analysis]);

  const loadAnalysis = async () => {
    setIsLoading(true);
    try {
      const data = await bertopicService.getBERTopicById(Number(id));
      setAnalysis(data);

      // Set first topic as selected if available
      if (data.topics && data.topics.length > 0) {
        setSelectedTopic(data.topics[0].topic_id);
      }
    } catch (error: any) {
      showError('Error al cargar análisis: ' + (error.response?.data?.error || error.message));
      navigate('/admin/modelado/bertopic');
    } finally {
      setIsLoading(false);
    }
  };

  const pollProgress = async () => {
    try {
      const progressData = await bertopicService.getProgress(Number(id));

      setAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: progressData.status,
          status_display: progressData.status_display,
          current_stage: progressData.current_stage,
          current_stage_display: progressData.current_stage_display,
          progress_percentage: progressData.progress_percentage,
          error_message: progressData.error_message,
        };
      });

      // Reload full data if completed
      if (progressData.status === 'completed') {
        await loadAnalysis();
      }
    } catch (error) {
      console.error('Error polling progress:', error);
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
      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner size="lg" />
        <span className="ml-3 text-lg text-gray-600">Cargando análisis...</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-8">
        <p className="text-red-600">Análisis no encontrado</p>
      </div>
    );
  }

  // Prepare doughnut chart data
  const doughnutData = {
    labels: analysis.topic_distribution.map((td) => td.topic_label),
    datasets: [
      {
        data: analysis.topic_distribution.map((td) => td.count),
        backgroundColor: [
          '#8b5cf6',
          '#6366f1',
          '#3b82f6',
          '#06b6d4',
          '#10b981',
          '#84cc16',
          '#eab308',
          '#f59e0b',
          '#f97316',
          '#ef4444',
          '#ec4899',
          '#d946ef',
        ],
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage =
              analysis.topic_distribution[context.dataIndex]?.percentage || 0;
            return `${label}: ${value} docs (${percentage.toFixed(2)}%)`;
          },
        },
      },
    },
  };

  const selectedTopicData = analysis.topics.find((t) => t.topic_id === selectedTopic);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/admin/modelado/bertopic')}
            className="text-indigo-600 hover:text-indigo-800 font-semibold mb-4 flex items-center"
          >
            ← Volver a lista
          </button>
          <h1 className="text-3xl font-bold text-gray-800">{analysis.name}</h1>
          {analysis.description && <p className="text-gray-600 mt-2">{analysis.description}</p>}
        </div>
        <div>{getStatusBadge(analysis.status)}</div>
      </div>

      {/* Progress Section (if processing) */}
      {analysis.status === 'processing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center">
            <Spinner size="sm" />
            <span className="ml-3">Procesamiento en curso...</span>
          </h2>

          <div className="mb-4">
            <div className="flex justify-between text-sm text-blue-700 mb-2">
              <span>{analysis.current_stage_display}</span>
              <span className="font-semibold">{analysis.progress_percentage}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${analysis.progress_percentage}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-blue-700">
            El análisis se está procesando. Esta página se actualizará automáticamente.
          </p>
        </div>
      )}

      {/* Error Section */}
      {analysis.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-red-900 mb-2">Error en procesamiento</h2>
          <p className="text-red-700">{analysis.error_message}</p>
        </div>
      )}

      {/* General Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-1">Fuente de Datos</h3>
          <p className="text-lg font-bold text-gray-900">{analysis.source_name}</p>
          <p className="text-sm text-gray-500">{analysis.source_type === 'data_preparation' ? 'Preparación' : 'Dataset'}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-1">Modelo de Embeddings</h3>
          <p className="text-lg font-bold text-gray-900">{analysis.embedding_model_display}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-1">Creado por</h3>
          <p className="text-lg font-bold text-gray-900">{analysis.created_by_username}</p>
          <p className="text-sm text-gray-500">{formatDate(analysis.created_at)}</p>
        </div>
      </div>

      {/* Statistics (only if completed) */}
      {analysis.status === 'completed' && (
        <>
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl shadow-lg p-8 mb-8 text-white">
            <h2 className="text-2xl font-bold mb-6">Estadísticas Generales</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-purple-200 text-sm mb-1">Documentos Procesados</p>
                <p className="text-4xl font-bold">{analysis.documents_processed.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-purple-200 text-sm mb-1">Tópicos Encontrados</p>
                <p className="text-4xl font-bold">{analysis.num_topics_found}</p>
              </div>
              <div>
                <p className="text-purple-200 text-sm mb-1">Outliers</p>
                <p className="text-4xl font-bold">{analysis.num_outliers}</p>
              </div>
              <div>
                <p className="text-purple-200 text-sm mb-1">Coherencia C_V</p>
                <p className="text-4xl font-bold">
                  {analysis.coherence_score !== null ? analysis.coherence_score.toFixed(4) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Visualization 1: Topic Distribution (Doughnut Chart) */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Distribución de Tópicos</h2>
            <div style={{ height: '400px' }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </div>

          {/* Visualization 2: Topic Words */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Tópicos y Palabras Clave</h2>

            <div className="space-y-6">
              {analysis.topics.map((topic) => (
                <div key={topic.topic_id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{topic.topic_label}</h3>
                    <span className="text-sm text-gray-500">{topic.num_documents} documentos</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {topic.words.map((word, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                      >
                        {word.word} ({word.weight.toFixed(4)})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visualization 3: Documents by Topic */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Documentos por Tópico</h2>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {analysis.topics.map((topic) => (
                  <option key={topic.topic_id} value={topic.topic_id}>
                    {topic.topic_label}
                  </option>
                ))}
              </select>
            </div>

            {selectedTopicData && (
              <div className="space-y-3">
                {analysis.document_topics
                  .filter((dt) => dt.topic_id === selectedTopic)
                  .slice(0, 20)
                  .map((dt, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Documento #{dt.document_id}</p>
                      <p className="text-gray-800">{dt.text_preview}...</p>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Configuration Details */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Configuración Utilizada</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">N Neighbors (UMAP)</p>
                <p className="text-lg font-bold text-gray-900">{analysis.n_neighbors}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">N Components (UMAP)</p>
                <p className="text-lg font-bold text-gray-900">{analysis.n_components}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Min Cluster Size</p>
                <p className="text-lg font-bold text-gray-900">{analysis.min_cluster_size}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Min Samples</p>
                <p className="text-lg font-bold text-gray-900">{analysis.min_samples}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Palabras por Tópico</p>
                <p className="text-lg font-bold text-gray-900">{analysis.num_words}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 mb-1">Semilla Aleatoria</p>
                <p className="text-lg font-bold text-gray-900">{analysis.random_seed || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Timeline</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-4"></div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Creado</p>
                  <p className="text-sm text-gray-500">{formatDate(analysis.created_at)}</p>
                </div>
              </div>
              {analysis.processing_started_at && (
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-4"></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Inicio de Procesamiento</p>
                    <p className="text-sm text-gray-500">{formatDate(analysis.processing_started_at)}</p>
                  </div>
                </div>
              )}
              {analysis.processing_completed_at && (
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full mr-4"></div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Completado</p>
                    <p className="text-sm text-gray-500">{formatDate(analysis.processing_completed_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BERTopicView;
