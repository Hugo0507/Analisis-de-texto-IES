/**
 * NerAnalysisView Page - Visualización de Resultados NER
 *
 * Vista de resultados completos con 4 visualizaciones:
 * 1. Donut Chart - Distribución de entidades
 * 2. Tabla completa con búsqueda
 * 3. Top entidades por categoría
 * 4. Co-ocurrencias
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import nerAnalysisService from '../services/nerAnalysisService';
import type { NerAnalysis } from '../services/nerAnalysisService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

export const NerAnalysisView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();

  const [analysis, setAnalysis] = useState<NerAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
      const data = await nerAnalysisService.getNerAnalysisById(Number(id));
      setAnalysis(data);
    } catch (error: any) {
      showError('Error al cargar análisis: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const progressData = await nerAnalysisService.getProgress(Number(id));
      if (analysis) {
        setAnalysis({
          ...analysis,
          status: progressData.status,
          progress_percentage: progressData.progress_percentage,
          current_stage: progressData.current_stage,
          current_stage_label: progressData.current_stage_label,
          error_message: progressData.error_message,
        });
      }
    } catch {
      // Silently fail for progress updates
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

  // Filter entities by search term
  const filteredEntities = analysis?.entities.filter(entity =>
    entity.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.label.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Prepare donut chart data
  const donutData = analysis?.entity_distribution ? {
    labels: analysis.entity_distribution.map(d => d.label),
    datasets: [
      {
        data: analysis.entity_distribution.map(d => d.value),
        backgroundColor: [
          '#10B981', // emerald-500
          '#3B82F6', // blue-500
          '#F59E0B', // amber-500
          '#EF4444', // red-500
          '#8B5CF6', // violet-500
          '#EC4899', // pink-500
          '#06B6D4', // cyan-500
          '#F97316', // orange-500
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
            const percentage = analysis?.entity_distribution.find(d => d.label === label)?.percentage || 0;
            return `${label}: ${value.toLocaleString()} (${percentage.toFixed(1)}%)`;
          },
        },
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
              onClick={() => navigate('/admin/modelado/ner')}
              aria-label="Volver"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{analysis.name}</h1>
              <p className="text-sm text-gray-600 mt-0.5">Análisis NER</p>
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
                <p className="text-sm text-gray-600 mt-1">{analysis.current_stage_label}</p>
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
              <p className="text-sm text-gray-900 mt-1">{analysis.source_info?.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {analysis.source_type === 'data_preparation' ? 'Preprocesado' : 'Dataset Raw'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Modelo spaCy</p>
              <p className="text-sm text-gray-900 mt-1">{analysis.spacy_model_label}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Entidades Seleccionadas</p>
              <p className="text-sm text-gray-900 mt-1">{analysis.selected_entities.length} tipos</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {analysis.selected_entities.slice(0, 3).join(', ')}
                {analysis.selected_entities.length > 3 && '...'}
              </p>
            </div>
          </div>
        </div>

        {/* Solo mostrar resultados si está completado */}
        {analysis.status === 'completed' && (
          <>
            {/* ESTADÍSTICAS */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white" style={{ borderRadius: '20px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
              <h2 className="text-lg font-semibold mb-4">Estadísticas del Análisis</h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                  <p className="text-sm opacity-90">Documentos</p>
                  <p className="text-3xl font-bold mt-2">{analysis.documents_processed}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                  <p className="text-sm opacity-90">Entidades Totales</p>
                  <p className="text-3xl font-bold mt-2">{analysis.total_entities_found.toLocaleString()}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                  <p className="text-sm opacity-90">Entidades Únicas</p>
                  <p className="text-3xl font-bold mt-2">{analysis.unique_entities_count.toLocaleString()}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-4 rounded-lg">
                  <p className="text-sm opacity-90">Tipos Encontrados</p>
                  <p className="text-3xl font-bold mt-2">{Object.keys(analysis.entity_types_found).length}</p>
                </div>
              </div>
            </div>

            {/* VISUALIZACIÓN 1: DONUT CHART */}
            {donutData && (
              <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Entidades por Tipo</h2>
                <div style={{ height: '400px' }}>
                  <Doughnut data={donutData} options={donutOptions} />
                </div>
              </div>
            )}

            {/* VISUALIZACIÓN 2: TABLA COMPLETA */}
            <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Todas las Entidades</h2>
                <input
                  type="text"
                  placeholder="Buscar entidad o tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Entidad</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Frecuencia</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Documentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntities.slice(0, 100).map((entity, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{entity.text}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">
                            {entity.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{entity.frequency}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{entity.document_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Mostrando {Math.min(filteredEntities.length, 100)} de {filteredEntities.length} entidades
              </p>
            </div>

            {/* VISUALIZACIÓN 3: TOP ENTIDADES POR CATEGORÍA */}
            {Object.keys(analysis.top_entities_by_type).length > 0 && (
              <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Entidades por Categoría</h2>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(analysis.top_entities_by_type).map(([label, entities]) => (
                    <div key={label} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">
                          {label}
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {entities.map((entity, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-900 truncate flex-1">{entity.text}</span>
                            <span className="text-gray-600 ml-2">{entity.frequency}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VISUALIZACIÓN 4: CO-OCURRENCIAS */}
            {analysis.cooccurrences.length > 0 && (
              <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Co-ocurrencias (Top 20)</h2>
                <div className="space-y-3">
                  {analysis.cooccurrences.slice(0, 20).map((cooc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-xs text-gray-500">{index + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                            {cooc.entity1.label}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{cooc.entity1.text}</span>
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                            {cooc.entity2.label}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{cooc.entity2.text}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{cooc.cooccurrence_count}</p>
                        <p className="text-xs text-gray-500">{cooc.document_count} docs</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
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
