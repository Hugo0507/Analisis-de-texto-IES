/**
 * DatasetList Page - Lista de Datasets
 *
 * Vista principal del módulo de Conjunto de Datos.
 * Muestra tabla con todos los datasets creados.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import datasetsService from '../services/datasetsService';
import type { DatasetListItem } from '../services/datasetsService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

export const DatasetList: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<DatasetListItem | null>(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    setIsLoading(true);
    try {
      const data = await datasetsService.getDatasets();
      setDatasets(data);
    } catch (error: any) {
      showError('Error al cargar datasets: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteModal = (dataset: DatasetListItem) => {
    setDatasetToDelete(dataset);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDatasetToDelete(null);
  };

  const confirmDelete = async () => {
    if (!datasetToDelete) return;

    try {
      await datasetsService.deleteDataset(datasetToDelete.id);
      showSuccess(`Dataset "${datasetToDelete.name}" eliminado exitosamente`);
      closeDeleteModal();
      await loadDatasets();
    } catch (error: any) {
      showError('Error al eliminar dataset: ' + (error.response?.data?.error || error.message));
      closeDeleteModal();
    }
  };

  const getSourceBadge = (source: string) => {
    return source === 'drive' ? (
      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
        Google Drive
      </span>
    ) : (
      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
        Local
      </span>
    );
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <h1 className="text-xl font-semibold text-gray-900">Conjunto de Datos</h1>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={loadDatasets}
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
              onClick={() => navigate('/admin/configuracion/datasets/nuevo')}
              className="p-3 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-all shadow-md hover:shadow-lg"
              title="Crear dataset"
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
          {datasets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay datasets creados
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Comienza creando tu primer conjunto de datos
              </p>
              <button
                onClick={() => navigate('/admin/configuracion/datasets/nuevo')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Dataset
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
                      Origen
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Archivos
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Fecha de Creación
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((dataset, index) => (
                    <tr
                      key={dataset.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/configuracion/datasets/${dataset.id}`)}
                    >
                      {/* ID Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </td>

                      {/* Nombre Column */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{dataset.name}</p>
                          {dataset.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{dataset.description}</p>
                          )}
                        </div>
                      </td>

                      {/* Origen Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getSourceBadge(dataset.source)}
                      </td>

                      {/* Estado Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(dataset.status)}
                      </td>

                      {/* Archivos Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {dataset.file_count} archivo{dataset.file_count !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Fecha Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {formatDate(dataset.created_at)}
                        </span>
                      </td>

                      {/* Acciones Column */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {/* Ver Button */}
                          <button
                            onClick={() => navigate(`/admin/configuracion/datasets/${dataset.id}`)}
                            className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                            title="Ver dataset"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Editar Button */}
                          <button
                            onClick={() => navigate(`/admin/configuracion/datasets/${dataset.id}/editar`)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Editar dataset"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Eliminar Button */}
                          <button
                            onClick={() => openDeleteModal(dataset)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar dataset"
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
      {showDeleteModal && datasetToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-md w-full mx-4" style={{ borderRadius: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Eliminar dataset?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar el dataset{' '}
              <strong>{datasetToDelete.name}</strong> y todos sus archivos ({datasetToDelete.file_count})?
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
