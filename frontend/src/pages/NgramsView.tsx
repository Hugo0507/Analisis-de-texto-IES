/**
 * NgramsView Page - Ver Resultados de Análisis de N-gramas
 *
 * Muestra resultados completos con comparaciones entre configuraciones.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ngramAnalysisService from '../services/ngramAnalysisService';
import type { NgramAnalysis } from '../services/ngramAnalysisService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

export const NgramsView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [analysis, setAnalysis] = useState<NgramAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadAnalysis();
    }
  }, [id]);

  useEffect(() => {
    // Polling para progreso
    if (analysis?.status === 'processing') {
      pollIntervalRef.current = setInterval(() => {
        loadProgress();
      }, 2000);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [analysis?.status]);

  const loadAnalysis = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const data = await ngramAnalysisService.getNgramAnalysisById(Number(id));
      setAnalysis(data);

      // Seleccionar primera configuración por defecto
      if (data.results && Object.keys(data.results).length > 0 && !selectedConfig) {
        setSelectedConfig(Object.keys(data.results)[0]);
      }
    } catch (error: any) {
      showError('Error al cargar análisis: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgress = async () => {
    if (!id) return;

    try {
      const progress = await ngramAnalysisService.getProgress(Number(id));

      setAnalysis(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: progress.status,
          progress_percentage: progress.progress_percentage,
          current_stage: progress.current_stage,
          current_stage_label: progress.current_stage_label,
          error_message: progress.error_message,
        };
      });

      // Si completó o falló, recargar datos completos
      if (progress.status === 'completed' || progress.status === 'error') {
        await loadAnalysis();
      }
    } catch (error) {
      console.error('Error al cargar progreso:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConfigLabel = (configKey: string) => {
    const parts = configKey.split('_');
    return `(${parts[0]}, ${parts[1]})`;
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
      <div className="p-8 text-center">
        <p className="text-gray-600">Análisis no encontrado</p>
      </div>
    );
  }

  const isProcessing = analysis.status === 'processing';
  const isCompleted = analysis.status === 'completed';
  const hasError = analysis.status === 'error';

  const selectedResult = selectedConfig && analysis.results ? analysis.results[selectedConfig] : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/preprocesamiento/n-gramas')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">{analysis.name}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Processing Progress */}
        {isProcessing && (
          <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <div className="flex items-center gap-3 mb-4">
              <Spinner size="md" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Procesando Análisis de N-gramas</h3>
                <p className="text-sm text-gray-600">{analysis.current_stage_label || 'Iniciando...'}</p>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${analysis.progress_percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-right">{analysis.progress_percentage}%</p>
          </div>
        )}

        {/* Error Message */}
        {hasError && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error en el Procesamiento</h3>
            <p className="text-sm text-red-700">{analysis.error_message}</p>
          </div>
        )}

        {/* Información General */}
        <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Preparación de Datos</p>
              <p className="text-sm text-gray-900 font-medium">{analysis.data_preparation_name}</p>
              <p className="text-xs text-gray-500 mt-1">Dataset: {analysis.dataset_name}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Configuraciones Ejecutadas</p>
              <p className="text-sm text-gray-900">{analysis.total_configurations} configuraciones</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Documentos Analizados</p>
              <p className="text-sm text-gray-900">{analysis.document_count.toLocaleString()}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Creado por</p>
              <p className="text-sm text-gray-900">{analysis.created_by_email}</p>
            </div>

            {analysis.description && (
              <div className="md:col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Descripción</p>
                <p className="text-sm text-gray-700">{analysis.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Resultados */}
        {isCompleted && (
          <>
            {/* Comparación Global */}
            {analysis.comparisons && analysis.comparisons.total_unique_terms > 0 && (
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-white" style={{ borderRadius: '20px' }}>
                <h2 className="text-lg font-semibold mb-4">Estadísticas Globales</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-xs font-medium text-white/80 mb-1">Vocabulario Total Único</p>
                    <p className="text-2xl font-bold">{analysis.comparisons.total_unique_terms.toLocaleString()}</p>
                  </div>

                  {Object.entries(analysis.comparisons.config_stats || {}).map(([key, stats]) => (
                    <div key={key} className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                      <p className="text-xs font-medium text-white/80 mb-1">{getConfigLabel(key)}</p>
                      <p className="text-xl font-bold">{stats.vocabulary_size.toLocaleString()} términos</p>
                      <p className="text-xs text-white/80 mt-1">
                        {stats.unique_contribution} únicos · {stats.coverage}% cobertura
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selector de Configuración */}
            <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resultados por Configuración</h2>

              {/* Tabs de configuraciones */}
              <div className="flex flex-wrap gap-2 mb-6">
                {Object.keys(analysis.results || {}).map((configKey) => (
                  <button
                    key={configKey}
                    onClick={() => setSelectedConfig(configKey)}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-all
                      ${selectedConfig === configKey
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {getConfigLabel(configKey)}
                  </button>
                ))}
              </div>

              {/* Detalle de configuración seleccionada */}
              {selectedResult && (
                <div className="space-y-6">
                  {/* Estadísticas de la configuración */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Vocabulario</p>
                      <p className="text-xl font-bold text-gray-900">{selectedResult.vocabulary_size.toLocaleString()}</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Matriz</p>
                      <p className="text-lg font-bold text-gray-900">
                        {selectedResult.matrix_shape.rows} × {selectedResult.matrix_shape.cols}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Esparsidad</p>
                      <p className="text-xl font-bold text-gray-900">
                        {(selectedResult.matrix_sparsity * 100).toFixed(1)}%
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">Promedio Términos/Doc</p>
                      <p className="text-xl font-bold text-gray-900">
                        {selectedResult.avg_terms_per_document.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {/* Top términos de esta configuración */}
                  <div>
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Palabras Más Frecuentes</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Rank</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Palabra/Frase</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Frecuencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedResult.top_terms.map((term, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-600">{term.rank}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{term.term}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-700">{Math.round(term.score)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Procesamiento</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Fecha de Creación</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(analysis.created_at)}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Inicio de Procesamiento</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(analysis.processing_started_at)}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Fin de Procesamiento</span>
                  <span className="text-sm font-medium text-gray-900">{formatDate(analysis.processing_completed_at)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
