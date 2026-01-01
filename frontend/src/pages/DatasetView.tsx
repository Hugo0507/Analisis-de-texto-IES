/**
 * DatasetView Page - Vista de Visualización/Analítica
 *
 * Dashboard con métricas e información visual del dataset.
 * Muestra estructura de directorios, distribución de archivos, etc.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import datasetsService from '../services/datasetsService';
import type { Dataset } from '../services/datasetsService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

export const DatasetView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showError } = useToast();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadDataset();
  }, [id]);

  const loadDataset = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const data = await datasetsService.getDataset(parseInt(id));
      setDataset(data);
    } catch (error: any) {
      showError('Error al cargar dataset: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
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

  const getFileExtensionStats = () => {
    if (!dataset?.files) return {};

    const stats: { [key: string]: number } = {};
    dataset.files.forEach((file) => {
      const ext = file.original_filename.split('.').pop()?.toLowerCase() || 'unknown';
      stats[ext] = (stats[ext] || 0) + 1;
    });

    return stats;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
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
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Dataset no encontrado</p>
      </div>
    );
  }

  const extensionStats = getFileExtensionStats();
  const totalFiles = dataset.files.length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/configuracion/datasets')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">{dataset.name}</h1>
            <div className="ml-2">{getStatusBadge(dataset.status)}</div>
          </div>

          {/* Right: Edit button */}
          <button
            onClick={() => navigate(`/admin/configuracion/datasets/${id}/editar`)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Editar Dataset
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-6">
        {/* Dataset Info Card */}
        <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Nombre</p>
              <p className="text-base font-medium text-gray-900">{dataset.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Origen</p>
              <p className="text-base font-medium text-gray-900">
                {dataset.source === 'drive' ? 'Google Drive' : 'Local'}
              </p>
            </div>
            {dataset.description && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 mb-1">Descripción</p>
                <p className="text-base text-gray-900">{dataset.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 mb-1">Creado por</p>
              <p className="text-base text-gray-900">{dataset.created_by_email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Fecha de Creación</p>
              <p className="text-base text-gray-900">{formatDate(dataset.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Files */}
          <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Total Archivos</h3>
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalFiles}</p>
            <p className="text-sm text-gray-500 mt-1">archivos en total</p>
          </div>

          {/* Total Size */}
          <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Tamaño Total</h3>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatBytes(dataset.total_size_bytes)}</p>
            <p className="text-sm text-gray-500 mt-1">espacio utilizado</p>
          </div>

          {/* Processed Files */}
          <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Procesados</h3>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {dataset.files.filter(f => f.status === 'completed').length}
            </p>
            <p className="text-sm text-gray-500 mt-1">archivos completados</p>
          </div>
        </div>

        {/* Distribution by Extension */}
        <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Distribución por Extensión</h2>
          <div className="space-y-4">
            {Object.entries(extensionStats).map(([ext, count]) => {
              const percentage = totalFiles > 0 ? (count / totalFiles) * 100 : 0;
              const colors: { [key: string]: string } = {
                pdf: 'bg-red-500',
                txt: 'bg-gray-500',
                doc: 'bg-blue-500',
                docx: 'bg-blue-600',
              };
              const barColor = colors[ext] || 'bg-emerald-500';

              return (
                <div key={ext}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 uppercase">.{ext}</span>
                    <span className="text-sm text-gray-600">
                      {count} archivo{count !== 1 ? 's' : ''} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`${barColor} h-2.5 rounded-full transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Files List */}
        <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Archivos del Dataset</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Archivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Tamaño
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Idioma
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {dataset.files.map((file) => (
                  <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-md">
                        {file.original_filename}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{formatBytes(file.file_size_bytes)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {file.language_code ? (
                        <span className="text-sm text-gray-900">
                          {file.language_code.toUpperCase()}
                          {file.language_confidence && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({(file.language_confidence * 100).toFixed(0)}%)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(file.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
