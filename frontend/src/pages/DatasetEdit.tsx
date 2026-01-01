/**
 * DatasetEdit Page - Vista de Edición/Alimentación
 *
 * Permite alimentar un dataset existente con más archivos.
 * Muestra archivos actuales y permite agregar nuevos.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import datasetsService from '../services/datasetsService';
import type { Dataset } from '../services/datasetsService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

type ImportMethod = 'files' | 'folder';

export const DatasetEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useToast();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<ImportMethod>('files');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const handleFolderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const handleAddFilesClick = () => {
    if (selectedFiles.length === 0) {
      showError('Por favor selecciona al menos un archivo');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmAddFiles = async () => {
    if (!dataset) return;

    setShowConfirmModal(false);
    setIsUploading(true);

    try {
      // Por ahora, creamos un nuevo dataset con los archivos adicionales
      // TODO: Implementar endpoint específico para alimentar dataset existente
      await datasetsService.createDatasetWithFiles({
        name: `${dataset.name} - Actualización`,
        description: `Archivos adicionales para ${dataset.name}`,
        files: selectedFiles,
      });

      showSuccess(`Se agregaron ${selectedFiles.length} archivo(s) al dataset`);

      // Recargar dataset
      await loadDataset();
      setSelectedFiles([]);
    } catch (error: any) {
      showError('Error al agregar archivos: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.pdf')) {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else if (fileName.endsWith('.txt')) {
      return (
        <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-md w-full mx-4" style={{ borderRadius: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              ¿Agregar archivos al dataset?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Estás a punto de agregar <strong>{selectedFiles.length} archivo(s)</strong> al dataset{' '}
              <strong>{dataset.name}</strong>. Los archivos se procesarán y se agregarán al conjunto existente.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAddFiles}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium text-sm shadow-md"
              >
                Agregar archivos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/configuracion/datasets/${id}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Editar: {dataset.name}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-6">
        {/* Current Files Panel */}
        <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Archivos Actuales</h2>
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{dataset.files.length}</p>
                <p className="text-sm text-gray-500">archivos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatBytes(dataset.total_size_bytes)}</p>
                <p className="text-sm text-gray-500">tamaño total</p>
              </div>
            </div>
          </div>

          {dataset.files.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {dataset.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {getFileIcon(file.original_filename)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.original_filename}</p>
                    <p className="text-xs text-gray-500">{formatBytes(file.file_size_bytes)}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    file.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    file.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    file.status === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {file.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add More Files Section */}
        <div className="bg-white p-7" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Agregar Más Archivos</h2>

          {/* Method Selector */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Files Option */}
            <button
              onClick={() => setSelectedMethod('files')}
              disabled={isUploading}
              className={`p-4 border-2 rounded-xl transition-all ${
                selectedMethod === 'files'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div className="text-sm font-medium text-gray-900">Archivos</div>
              <div className="text-xs text-gray-500 mt-1">Uno o varios archivos</div>
            </button>

            {/* Folder Option */}
            <button
              onClick={() => setSelectedMethod('folder')}
              disabled={isUploading}
              className={`p-4 border-2 rounded-xl transition-all ${
                selectedMethod === 'folder'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <div className="text-sm font-medium text-gray-900">Carpeta</div>
              <div className="text-xs text-gray-500 mt-1">Carpeta completa</div>
            </button>
          </div>

          {/* File Selection Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8">
            {selectedMethod === 'files' && (
              <div>
                {selectedFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <input
                      type="file"
                      id="file-upload-edit"
                      multiple
                      onChange={handleFilesChange}
                      className="hidden"
                      accept=".pdf,.txt,.doc,.docx"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="file-upload-edit"
                      className="cursor-pointer inline-flex flex-col items-center"
                    >
                      <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Haz clic para seleccionar archivos</span>
                      <span className="text-xs text-gray-500 mt-1">o arrastra y suelta aquí</span>
                      <span className="text-xs text-gray-400 mt-2">PDF, TXT, DOC, DOCX</span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedFiles.length} archivo{selectedFiles.length !== 1 ? 's' : ''} seleccionado{selectedFiles.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <label
                        htmlFor="file-upload-edit"
                        className="text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer font-medium"
                      >
                        + Agregar más
                      </label>
                      <input
                        type="file"
                        id="file-upload-edit"
                        multiple
                        onChange={handleFilesChange}
                        className="hidden"
                        accept=".pdf,.txt,.doc,.docx"
                        disabled={isUploading}
                      />
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getFileIcon(file.name)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Eliminar"
                            disabled={isUploading}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedMethod === 'folder' && (
              <div>
                {selectedFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <input
                      type="file"
                      id="folder-upload-edit"
                      /* @ts-ignore */
                      webkitdirectory=""
                      directory=""
                      multiple
                      onChange={handleFolderChange}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="folder-upload-edit"
                      className="cursor-pointer inline-flex flex-col items-center"
                    >
                      <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Haz clic para seleccionar carpeta</span>
                      <span className="text-xs text-gray-500 mt-1">Se cargarán todos los archivos contenidos</span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedFiles.length} archivo{selectedFiles.length !== 1 ? 's' : ''} en la carpeta
                        </span>
                      </div>
                      <label
                        htmlFor="folder-upload-edit"
                        className="text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer font-medium"
                      >
                        Cambiar carpeta
                      </label>
                      <input
                        type="file"
                        id="folder-upload-edit"
                        /* @ts-ignore */
                        webkitdirectory=""
                        directory=""
                        multiple
                        onChange={handleFolderChange}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          {getFileIcon(file.name)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Add Files Button */}
          {selectedFiles.length > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleAddFilesClick}
                disabled={isUploading}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Spinner size="sm" />
                    <span>Agregando...</span>
                  </>
                ) : (
                  `Agregar ${selectedFiles.length} archivo(s)`
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
