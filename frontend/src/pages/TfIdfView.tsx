/**
 * TfIdfView Page - Ver Resultados de Análisis TF-IDF
 *
 * Muestra las 3 matrices: TF, IDF y TF-IDF con descripciones.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import tfidfAnalysisService from '../services/tfidfAnalysisService';
import type { TfIdfAnalysis } from '../services/tfidfAnalysisService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

type MatrixView = 'tf' | 'idf' | 'tfidf';

export const TfIdfView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [analysis, setAnalysis] = useState<TfIdfAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatrix, setSelectedMatrix] = useState<MatrixView>('tfidf');

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
      const data = await tfidfAnalysisService.getTfIdfAnalysis(Number(id));
      setAnalysis(data);
    } catch (error: any) {
      showError('Error al cargar análisis: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgress = async () => {
    if (!id) return;

    try {
      const progress = await tfidfAnalysisService.getProgress(Number(id));

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
    } catch {
    }
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/vectorizacion/tf-idf')}
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
                <h3 className="text-lg font-semibold text-gray-900">Procesando Análisis TF-IDF</h3>
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
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Origen</p>
              <p className="text-sm text-gray-900 font-medium">{analysis.source_type_label}</p>
              <p className="text-xs text-gray-500 mt-1">{analysis.source_name}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Dataset</p>
              <p className="text-sm text-gray-900">{analysis.dataset_name}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Vocabulario</p>
              <p className="text-sm text-gray-900">{analysis.vocabulary_size.toLocaleString()} términos</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Documentos</p>
              <p className="text-sm text-gray-900">{analysis.document_count.toLocaleString()}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Rango N-gramas</p>
              <p className="text-sm text-gray-900">({analysis.ngram_min}, {analysis.ngram_max})</p>
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

        {/* Parámetros */}
        <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Parámetros del Análisis</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Max Features</p>
              <p className="text-lg font-bold text-gray-900">{analysis.max_features.toLocaleString()}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Min DF</p>
              <p className="text-lg font-bold text-gray-900">{analysis.min_df}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Max DF</p>
              <p className="text-lg font-bold text-gray-900">{analysis.max_df}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Usar IDF</p>
              <p className="text-lg font-bold text-gray-900">{analysis.use_idf ? '✓ Sí' : '✗ No'}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Suavizar IDF</p>
              <p className="text-lg font-bold text-gray-900">{analysis.smooth_idf ? '✓ Sí' : '✗ No'}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">TF Sublinear</p>
              <p className="text-lg font-bold text-gray-900">{analysis.sublinear_tf ? '✓ Sí' : '✗ No'}</p>
            </div>
          </div>
        </div>

        {/* Matrices */}
        {isCompleted && (
          <>
            {/* Selector de Matriz */}
            <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Visualización de Matrices</h2>

              {/* Tabs de matrices */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setSelectedMatrix('tf')}
                  className={`
                    px-6 py-3 rounded-lg font-medium transition-all
                    ${selectedMatrix === 'tf'
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  Matriz TF
                </button>
                <button
                  onClick={() => setSelectedMatrix('idf')}
                  className={`
                    px-6 py-3 rounded-lg font-medium transition-all
                    ${selectedMatrix === 'idf'
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  Vector IDF
                </button>
                <button
                  onClick={() => setSelectedMatrix('tfidf')}
                  className={`
                    px-6 py-3 rounded-lg font-medium transition-all
                    ${selectedMatrix === 'tfidf'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  Matriz TF-IDF
                </button>
              </div>

              {/* Contenido de matriz TF */}
              {selectedMatrix === 'tf' && analysis.tf_matrix && (
                <div className="space-y-6">
                  {/* Descripción */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-purple-900 mb-2">📊 ¿Qué es la Matriz TF?</h3>
                    <p className="text-sm text-purple-800 mb-2">
                      <strong>Term Frequency (TF)</strong> - Frecuencia de términos en cada documento.
                    </p>
                    <p className="text-xs text-purple-700">
                      Mide cuántas veces aparece cada término en cada documento. Un valor alto indica que el término es frecuente en ese documento específico.
                      {analysis.tf_matrix.sublinear_applied && ' Se aplicó escala sublinear (logarítmica) para reducir el peso de términos muy frecuentes.'}
                    </p>
                  </div>

                  {/* Estadísticas de TF */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-purple-700 mb-1">Forma de Matriz</p>
                      <p className="text-xl font-bold text-purple-900">
                        {analysis.tf_matrix.matrix_shape.rows} × {analysis.tf_matrix.matrix_shape.cols}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">documentos × términos</p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-purple-700 mb-1">Dispersión</p>
                      <p className="text-xl font-bold text-purple-900">
                        {(analysis.tf_matrix.matrix_sparsity * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-purple-600 mt-1">celdas con cero</p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-purple-700 mb-1">Promedio TF por Doc</p>
                      <p className="text-xl font-bold text-purple-900">
                        {analysis.tf_matrix.avg_tf_per_document.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-purple-700 mb-1">Escala Sublinear</p>
                      <p className="text-xl font-bold text-purple-900">
                        {analysis.tf_matrix.sublinear_applied ? '✓ Sí' : '✗ No'}
                      </p>
                    </div>
                  </div>

                  {/* Top términos por TF */}
                  {analysis.tf_matrix.top_terms_by_tf && analysis.tf_matrix.top_terms_by_tf.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">
                        Top {analysis.tf_matrix.top_terms_by_tf.length} Términos por Frecuencia
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Rank</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Término</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">TF Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysis.tf_matrix.top_terms_by_tf.map((term) => (
                              <tr key={term.rank} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-600">{term.rank}</td>
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{term.term}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">{term.score.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Contenido de vector IDF */}
              {selectedMatrix === 'idf' && analysis.idf_vector && (
                <div className="space-y-6">
                  {/* Descripción */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-indigo-900 mb-2">📊 ¿Qué es el Vector IDF?</h3>
                    <p className="text-sm text-indigo-800 mb-2">
                      <strong>Inverse Document Frequency (IDF)</strong> - Peso inverso de frecuencia de documento.
                    </p>
                    <p className="text-xs text-indigo-700">
                      Mide qué tan raro o específico es un término en el corpus. Valores altos = términos raros/específicos (aparecen en pocos documentos).
                      Valores bajos = términos comunes (aparecen en muchos documentos).
                      {analysis.idf_vector.smooth_applied && ' Se aplicó suavizado para evitar divisiones por cero.'}
                    </p>
                  </div>

                  {/* Estadísticas de IDF */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-indigo-700 mb-1">Total de Términos</p>
                      <p className="text-xl font-bold text-indigo-900">
                        {Object.keys(analysis.idf_vector.idf_values || {}).length.toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-indigo-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-indigo-700 mb-1">IDF Promedio</p>
                      <p className="text-xl font-bold text-indigo-900">
                        {analysis.idf_vector.avg_idf.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-indigo-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-indigo-700 mb-1">Suavizado IDF</p>
                      <p className="text-xl font-bold text-indigo-900">
                        {analysis.idf_vector.smooth_applied ? '✓ Sí' : '✗ No'}
                      </p>
                    </div>
                  </div>

                  {/* Top términos más raros */}
                  {analysis.idf_vector.top_terms_by_idf && analysis.idf_vector.top_terms_by_idf.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        🔸 Términos Más Raros/Específicos (IDF Alto)
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">Estos términos aparecen en pocos documentos, por lo que son más específicos/discriminativos</p>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Rank</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Término</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">IDF Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysis.idf_vector.top_terms_by_idf.map((term) => (
                              <tr key={term.rank} className="border-b border-gray-100 hover:bg-indigo-50">
                                <td className="px-4 py-2 text-sm text-gray-600">{term.rank}</td>
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{term.term}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">{term.idf.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Bottom términos más comunes */}
                  {analysis.idf_vector.bottom_terms_by_idf && analysis.idf_vector.bottom_terms_by_idf.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        🔹 Términos Más Comunes (IDF Bajo)
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">Estos términos aparecen en muchos documentos, por lo que tienen menos poder discriminativo</p>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Rank</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Término</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">IDF Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysis.idf_vector.bottom_terms_by_idf.map((term) => (
                              <tr key={term.rank} className="border-b border-gray-100 hover:bg-indigo-50">
                                <td className="px-4 py-2 text-sm text-gray-600">{term.rank}</td>
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{term.term}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">{term.idf.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Contenido de matriz TF-IDF */}
              {selectedMatrix === 'tfidf' && analysis.tfidf_matrix && (
                <div className="space-y-6">
                  {/* Descripción */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-emerald-900 mb-2">📊 ¿Qué es la Matriz TF-IDF?</h3>
                    <p className="text-sm text-emerald-800 mb-2">
                      <strong>TF-IDF = TF × IDF</strong> - Producto de frecuencia de término y frecuencia inversa de documento.
                    </p>
                    <p className="text-xs text-emerald-700">
                      Combina ambas métricas: premia términos frecuentes en el documento (TF alto) que son raros en el corpus (IDF alto).
                      Esta es la representación vectorial final utilizada para análisis de similitud, clasificación y clustering de documentos.
                    </p>
                  </div>

                  {/* Estadísticas de TF-IDF */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-emerald-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-emerald-700 mb-1">Forma de Matriz</p>
                      <p className="text-xl font-bold text-emerald-900">
                        {analysis.tfidf_matrix.matrix_shape.rows} × {analysis.tfidf_matrix.matrix_shape.cols}
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">documentos × términos</p>
                    </div>

                    <div className="bg-emerald-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-emerald-700 mb-1">Dispersión</p>
                      <p className="text-xl font-bold text-emerald-900">
                        {(analysis.tfidf_matrix.matrix_sparsity * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">celdas con cero</p>
                    </div>

                    <div className="bg-emerald-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-emerald-700 mb-1">Promedio por Doc</p>
                      <p className="text-xl font-bold text-emerald-900">
                        {analysis.tfidf_matrix.avg_tfidf_per_document.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-emerald-50 rounded-lg p-4">
                      <p className="text-xs font-medium text-emerald-700 mb-1">Score Total</p>
                      <p className="text-xl font-bold text-emerald-900">
                        {analysis.tfidf_matrix.total_score.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Top términos por TF-IDF */}
                  {analysis.tfidf_matrix.top_terms && analysis.tfidf_matrix.top_terms.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        ⭐ Top {analysis.tfidf_matrix.top_terms.length} Términos Más Relevantes
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">
                        Términos con mayor score TF-IDF: frecuentes en documentos específicos pero raros en el corpus general
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Rank</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Término</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">TF-IDF Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysis.tfidf_matrix.top_terms.map((term) => (
                              <tr key={term.rank} className="border-b border-gray-100 hover:bg-emerald-50">
                                <td className="px-4 py-2 text-sm text-gray-600">{term.rank}</td>
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{term.term}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">{term.score.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
