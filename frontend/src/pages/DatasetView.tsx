/**
 * DatasetView Page - Vista de Visualización/Analítica
 *
 * Dashboard con métricas e información visual del dataset.
 * Muestra estructura de directorios, distribución de archivos, etc.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import datasetsService from '../services/datasetsService';
import type { Dataset, DirectoryStats } from '../services/datasetsService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

export const DatasetView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showError } = useToast();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [directoryStats, setDirectoryStats] = useState<DirectoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!id) return;
    loadDataset();
  }, [id]);

  // Polling effect for datasets that are processing
  useEffect(() => {
    if (!dataset || dataset.status !== 'processing') return;

    const pollInterval = setInterval(() => {
      loadDataset();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [dataset?.status]);

  const loadDataset = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const [datasetData, dirStats] = await Promise.all([
        datasetsService.getDataset(parseInt(id)),
        datasetsService.getDirectoryStats(parseInt(id))
      ]);
      setDataset(datasetData);
      setDirectoryStats(dirStats);
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

  const getMostCommonExtension = () => {
    const stats = getFileExtensionStats();
    if (Object.keys(stats).length === 0) return { ext: 'N/A', count: 0 };

    const sortedEntries = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    return {
      ext: sortedEntries[0][0].toUpperCase(),
      count: sortedEntries[0][1]
    };
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

  // Filter and paginate files
  const filteredFiles = dataset.files.filter(file =>
    file.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: '#F4F7FE' }}>
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
      <div className="p-4 space-y-4 w-full max-w-full box-border">
        {/* Processing Banner */}
        {dataset.status === 'processing' && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Procesando archivos desde Google Drive
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Los archivos se están descargando y procesando en segundo plano. Esta página se actualizará automáticamente cada 5 segundos.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dataset Info Card */}
        <div className="bg-white p-4" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Información General</h2>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Files */}
          <div className="bg-white p-4" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Archivos</h3>
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalFiles}</p>
            <p className="text-xs text-gray-500 mt-1">archivos en total</p>
          </div>

          {/* Total Size */}
          <div className="bg-white p-4" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Tamaño Total</h3>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatBytes(dataset.total_size_bytes)}</p>
            <p className="text-xs text-gray-500 mt-1">espacio utilizado</p>
          </div>

          {/* Most Common Extension */}
          <div className="bg-white p-4" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Extensión Principal</h3>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {getMostCommonExtension().ext}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {getMostCommonExtension().count}/{totalFiles} archivos
            </p>
          </div>
        </div>

        {/* Directory Distribution Section */}
        {directoryStats && directoryStats.pie_chart_data.length > 0 && (
          <div className="space-y-4 w-full max-w-full">
            {/* Pie Chart */}
            <div className="bg-white p-4 w-full max-w-full" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
              <h2 className="text-base font-semibold text-gray-900 mb-4">Distribución por Directorio</h2>
              <div className="flex flex-col items-center">
                {/* Simple List-based Pie Chart Alternative */}
                <div className="w-full space-y-3">
                  {directoryStats.pie_chart_data.map((item, index) => {
                    const colors = [
                      'bg-emerald-500',
                      'bg-blue-500',
                      'bg-purple-500',
                      'bg-yellow-500',
                      'bg-red-500',
                      'bg-indigo-500',
                      'bg-pink-500',
                      'bg-teal-500',
                    ];
                    const color = colors[index % colors.length];

                    return (
                      <div key={item.name} className="flex items-center gap-4">
                        <div className={`w-4 h-4 rounded-full ${color}`}></div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-700">{item.name}</span>
                            <span className="text-sm text-gray-600">
                              {item.value} archivos ({item.percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`${color} h-2 rounded-full transition-all duration-300`}
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Distribution Table */}
            <div className="bg-white p-4 w-full max-w-full box-border" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
              <h2 className="text-base font-semibold text-gray-900 mb-4">Tabla de Distribución</h2>
              <div className="overflow-x-auto border border-gray-200 rounded-lg" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <div style={{ minWidth: 'max-content' }}>
                  <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700 uppercase sticky left-0 bg-white z-10 shadow-sm">
                        Directorio
                      </th>
                      {directoryStats.all_extensions.map((ext) => (
                        <th key={ext} className="px-2 py-1 text-center text-xs font-semibold text-gray-700 uppercase whitespace-nowrap bg-white">
                          {ext}
                        </th>
                      ))}
                      <th className="px-2 py-1 text-center text-xs font-semibold text-emerald-700 uppercase bg-emerald-50 sticky right-0 z-10 shadow-sm">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {directoryStats.table_data.map((row) => (
                      <tr key={row.directory} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-2 py-1 text-xs font-medium text-gray-900 sticky left-0 bg-white z-10">{row.directory}</td>
                        {directoryStats.all_extensions.map((ext) => (
                          <td key={ext} className="px-2 py-1 text-center text-xs text-gray-600 whitespace-nowrap">
                            {row.extensions[ext] || 0}
                          </td>
                        ))}
                        <td className="px-2 py-1 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 sticky right-0 z-10">
                          {row.total}
                        </td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-emerald-50 font-semibold">
                      <td className="px-2 py-1 text-xs text-emerald-700 sticky left-0 bg-emerald-50 z-10">TOTAL</td>
                      {directoryStats.all_extensions.map((ext) => (
                        <td key={ext} className="px-2 py-1 text-center text-xs text-emerald-700 whitespace-nowrap">
                          {directoryStats.extension_totals[ext]}
                        </td>
                      ))}
                      <td className="px-2 py-1 text-center text-xs text-emerald-700 bg-emerald-100 sticky right-0 z-10">
                        {directoryStats.grand_total}
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Distribution by Extension */}
        <div className="bg-white p-4 w-full max-w-full" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Distribución por Extensión</h2>
          <div className="space-y-2">
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
        <div className="bg-white p-4 w-full max-w-full" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Archivos del Dataset</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {filteredFiles.length} de {totalFiles} archivos
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar archivos por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Table with scroll */}
          <div className="overflow-x-auto">
            <div style={{ maxHeight: '500px', overflowY: 'auto' }} className="border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Archivo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tamaño
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredFiles.length > 0 ? (
                    filteredFiles.map((file, index) => (
                      <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500">{index + 1}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">
                            {file.original_filename}
                          </p>
                          {file.directory_path && (
                            <p className="text-xs text-gray-500 mt-1">
                              📁 {file.directory_path}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{formatBytes(file.file_size_bytes)}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                        No se encontraron archivos que coincidan con "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
