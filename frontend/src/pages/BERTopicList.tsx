/**
 * BERTopicList Page - Lista de Análisis BERTopic
 *
 * Vista principal del módulo de BERTopic.
 * Muestra tabla con todos los análisis creados.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import bertopicService from '../services/bertopicService';
import type { BERTopicListItem } from '../services/bertopicService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

export const BERTopicList: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [analyses, setAnalyses] = useState<BERTopicListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<BERTopicListItem | null>(null);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    setIsLoading(true);
    try {
      const data = await bertopicService.getBERTopicAnalyses();
      setAnalyses(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showError('Error al cargar análisis: ' + (error.response?.data?.error || error.message));
      setAnalyses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteModal = (analysis: BERTopicListItem) => {
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
      await bertopicService.deleteBERTopic(analysisToDelete.id);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner size="lg" />
        <span className="ml-3 text-lg text-gray-600">Cargando análisis BERTopic...</span>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Análisis BERTopic
        </h1>
        <p className="text-gray-600">
          Topic Modeling con BERT: Embeddings + UMAP + HDBSCAN
        </p>
      </div>

      {/* Empty state */}
      {analyses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay análisis BERTopic
          </h3>
          <p className="text-gray-500 mb-6">
            Comienza creando tu primer análisis de tópicos con BERTopic.
          </p>
          <button
            onClick={() => navigate('/admin/modelado/bertopic/nuevo')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
          >
            + Crear Análisis BERTopic
          </button>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Fuente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Modelo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Documentos
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Tópicos
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Coherencia
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyses.map((analysis) => (
                  <tr key={analysis.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{analysis.name}</div>
                      {analysis.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {analysis.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {analysis.source_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                        {analysis.embedding_model_display}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(analysis.status, analysis.progress_percentage)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {analysis.documents_processed.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {analysis.num_topics_found > 0 ? (
                        <span className="text-purple-600 font-bold">
                          {analysis.num_topics_found}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {analysis.coherence_score !== null ? (
                        <span className="font-mono text-emerald-600 font-semibold">
                          {analysis.coherence_score.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(analysis.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium space-x-2">
                      <button
                        onClick={() => navigate(`/admin/modelado/bertopic/${analysis.id}`)}
                        className="text-indigo-600 hover:text-indigo-900 font-semibold"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => openDeleteModal(analysis)}
                        className="text-red-600 hover:text-red-900 font-semibold"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Floating Action Button */}
          <button
            onClick={() => navigate('/admin/modelado/bertopic/nuevo')}
            className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-2xl hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center text-2xl font-bold"
            title="Crear nuevo análisis BERTopic"
          >
            +
          </button>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && analysisToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Confirmar eliminación
            </h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar el análisis{' '}
              <span className="font-semibold text-gray-900">"{analysisToDelete.name}"</span>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BERTopicList;
