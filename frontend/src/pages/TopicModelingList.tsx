/**
 * TopicModelingList Page - Lista de Análisis Topic Modeling
 *
 * Vista principal del módulo de Topic Modeling.
 * Muestra tabla con todos los análisis creados (LSA, NMF, PLSA, LDA).
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import topicModelingService from '../services/topicModelingService';
import type { TopicModelingListItem } from '../services/topicModelingService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

export const TopicModelingList: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [analyses, setAnalyses] = useState<TopicModelingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<TopicModelingListItem | null>(null);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    setIsLoading(true);
    try {
      const data = await topicModelingService.getTopicModelings();
      setAnalyses(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showError('Error al cargar análisis: ' + (error.response?.data?.error || error.message));
      setAnalyses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteModal = (analysis: TopicModelingListItem) => {
    setAnalysisToDelete(analysis);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setAnalysisToDelete(null);
  };

  const confirmDelete = async () => {
    if (!analysisToDelete) return;

    try {
      await topicModelingService.deleteTopicModeling(analysisToDelete.id);
      showSuccess(`Análisis "${analysisToDelete.name}" eliminado exitosamente`);
      closeDeleteModal();
      await loadAnalyses();
    } catch (error: any) {
      showError('Error al eliminar análisis: ' + (error.response?.data?.error || error.message));
      closeDeleteModal();
    }
  };

  const getStatusBadge = (status: string, progress: number) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      completed: 'bg-emerald-100 text-emerald-700',
      error: 'bg-red-100 text-red-700',
    };

    const labels = {
      pending: 'Pendiente',
      processing: `Procesando (${progress}%)`,
      completed: 'Completado',
      error: 'Error',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getAlgorithmBadge = (algorithm: string, category: string) => {
    const isProbabilistic = category === 'Probabilistic';
    const bgColor = isProbabilistic ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bgColor}`}>
        {algorithm.toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left: Icon + Title */}
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <h1 className="text-xl font-semibold text-gray-900">Modelado de Temas</h1>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={loadAnalyses}
              disabled={isLoading}
              className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refrescar lista"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Add Button */}
            <button
              onClick={() => navigate('/admin/modelado/topic-modeling/nuevo')}
              className="p-3 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-all shadow-md hover:shadow-lg"
              title="Crear análisis de Modelado de Temas"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Data Table Container */}
        <div className="bg-white p-7" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          {analyses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay análisis creados
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Comienza creando tu primer análisis de Modelado de Temas con LSA, NMF, PLSA o LDA
              </p>
              <button
                onClick={() => navigate('/admin/modelado/topic-modeling/nuevo')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Análisis
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Algoritmo
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Tópicos
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Fuente
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Coherencia
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((analysis, index) => (
                    <tr
                      key={analysis.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/modelado/topic-modeling/${analysis.id}`)}
                    >
                      {/* ID Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </td>

                      {/* Nombre Column */}
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{analysis.name}</p>
                      </td>

                      {/* Algoritmo Column */}
                      <td className="px-6 py-4">
                        <div>
                          {getAlgorithmBadge(analysis.algorithm, analysis.algorithm_category)}
                          <p className="text-xs text-gray-500 mt-1">{analysis.algorithm_category}</p>
                        </div>
                      </td>

                      {/* Tópicos Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{analysis.num_topics} temas</p>
                          <p className="text-xs text-gray-500">{analysis.num_words} palabras/tema</p>
                        </div>
                      </td>

                      {/* Fuente Column */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{analysis.source_name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {analysis.source_type === 'data_preparation' ? 'Preprocesado' : 'Dataset Raw'}
                          </p>
                        </div>
                      </td>

                      {/* Estado Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(analysis.status, analysis.progress_percentage)}
                      </td>

                      {/* Coherencia Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {analysis.coherence_score !== null ? (
                          <span className="text-sm font-medium text-gray-900">
                            {analysis.coherence_score.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>

                      {/* Fecha Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {formatDate(analysis.created_at)}
                        </span>
                      </td>

                      {/* Acciones Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {/* Ver Button */}
                          <button
                            onClick={() => navigate(`/admin/modelado/topic-modeling/${analysis.id}`)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Ver análisis"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Eliminar Button */}
                          <button
                            onClick={() => openDeleteModal(analysis)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar análisis"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && analysisToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-md w-full mx-4" style={{ borderRadius: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Eliminar análisis?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Estás a punto de eliminar el análisis <strong>{analysisToDelete.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium text-sm"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
