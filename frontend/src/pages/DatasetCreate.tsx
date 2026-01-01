/**
 * Datasets Page
 *
 * Management of datasets for NLP analysis.
 * Only accessible by authenticated users.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import datasetsService from '../services/datasetsService';
import { useToast } from '../contexts/ToastContext';
import { Spinner } from '../components/atoms';
import GoogleDriveConnect from '../components/GoogleDriveConnect';
import { GoogleDriveConnection } from '../services/googleDriveService';

type ImportMethod = 'files' | 'folder' | 'drive';

export const DatasetCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<ImportMethod>('files');
  const [driveUrl, setDriveUrl] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ loaded: 0, total: 0, percentage: 0 });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [googleConnection, setGoogleConnection] = useState<GoogleDriveConnection | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build file tree from webkitRelativePath
  interface FileNode {
    name: string;
    type: 'file' | 'folder';
    children?: FileNode[];
    file?: File;
    path: string;
  }

  const buildFileTree = (files: File[]): FileNode => {
    const root: FileNode = { name: 'root', type: 'folder', children: [], path: '' };

    files.forEach(file => {
      // @ts-ignore - webkitRelativePath exists on File objects from directory inputs
      const relativePath = file.webkitRelativePath || file.name;
      const parts = relativePath.split('/');

      let currentNode = root;
      let currentPath = '';

      // Navigate/create folder structure
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i];
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        let folderNode = currentNode.children?.find(
          child => child.name === folderName && child.type === 'folder'
        );

        if (!folderNode) {
          folderNode = {
            name: folderName,
            type: 'folder',
            children: [],
            path: currentPath
          };
          currentNode.children?.push(folderNode);
        }

        currentNode = folderNode;
      }

      // Add file
      const fileName = parts[parts.length - 1];
      currentNode.children?.push({
        name: fileName,
        type: 'file',
        file: file,
        path: relativePath
      });
    });

    return root;
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  // Recursive TreeView render function
  const renderTreeNode = (node: FileNode, depth: number = 0): React.ReactNode => {
    if (node.type === 'folder' && node.name === 'root') {
      // Render root's children without showing the root itself
      return node.children?.map((child, index) => (
        <React.Fragment key={child.path || index}>
          {renderTreeNode(child, depth)}
        </React.Fragment>
      ));
    }

    const isExpanded = expandedFolders.has(node.path);
    const fileCount = node.type === 'folder'
      ? countFiles(node)
      : 0;

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => node.type === 'folder' && toggleFolder(node.path)}
        >
          {node.type === 'folder' ? (
            <>
              {/* Chevron icon */}
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {/* Folder icon */}
              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className="text-sm text-gray-900 font-medium">{node.name}</span>
              <span className="text-xs text-gray-500">({fileCount} archivo{fileCount !== 1 ? 's' : ''})</span>
            </>
          ) : (
            <>
              <div className="w-4 h-4" /> {/* Spacer for alignment */}
              {/* File icon */}
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-700 truncate">{node.name}</span>
            </>
          )}
        </div>

        {/* Render children if folder is expanded */}
        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map((child, index) => (
              <React.Fragment key={child.path || index}>
                {renderTreeNode(child, depth + 1)}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Count total files in a folder node
  const countFiles = (node: FileNode): number => {
    if (node.type === 'file') return 1;
    if (!node.children) return 0;
    return node.children.reduce((total, child) => total + countFiles(child), 0);
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

  const handleDriveSubmit = async () => {
    if (!driveUrl || !datasetName) {
      showError('Por favor completa el nombre del dataset y la URL de Drive');
      return;
    }

    setIsUploading(true);
    try {
      const dataset = await datasetsService.createDatasetWithDrive({
        name: datasetName,
        description: datasetDescription,
        source_url: driveUrl,
      });

      showSuccess('Dataset de Google Drive creado. Procesando archivos en segundo plano...');

      // Navigate to dataset view to see progress
      setTimeout(() => {
        navigate(`/admin/configuracion/datasets/${dataset.id}`);
      }, 1500);
    } catch (error: any) {
      showError('Error al crear dataset: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsUploading(false);
    }
  };

  const handleImportClick = () => {
    if (!datasetName) {
      showError('Por favor ingresa un nombre para el dataset');
      return;
    }

    if (selectedFiles.length === 0) {
      showError('Por favor selecciona al menos un archivo');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmImport = async () => {
    setShowConfirmModal(false);
    setIsUploading(true);
    setUploadProgress({ loaded: 0, total: selectedFiles.length, percentage: 0 });

    try {
      await datasetsService.createDatasetWithFiles({
        name: datasetName,
        description: datasetDescription,
        files: selectedFiles,
        onProgress: (progress) => {
          setUploadProgress(progress);
        }
      });

      showSuccess(`Dataset "${datasetName}" creado exitosamente con ${selectedFiles.length} archivo(s)`);

      // Navigate back to list
      setTimeout(() => {
        navigate('/admin/configuracion/datasets');
      }, 1500);
    } catch (error: any) {
      showError('Error al importar archivos: ' + (error.response?.data?.error || error.message));
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col">
            {/* Icon Header */}
            <div className="flex flex-col items-center pt-8 pb-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center">
                ¿Confirmar carga de archivos?
              </h3>
            </div>

            {/* File Count */}
            <div className="px-8 pb-4">
              <p className="text-center text-gray-600 mb-2">
                Estás a punto de subir
              </p>
              <p className="text-center">
                <span className="text-3xl font-bold text-emerald-600">{selectedFiles.length}</span>
                <span className="text-gray-700 ml-2">archivo(s)</span>
              </p>
            </div>

            {/* TreeView Section - Scrollable */}
            {selectedFiles.length > 0 && (
              <div className="px-8 pb-4 flex-1 overflow-hidden flex flex-col">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Estructura de carpetas:
                </h4>
                <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-y-auto flex-1" style={{ maxHeight: '300px' }}>
                  <div className="p-2">
                    {renderTreeNode(buildFileTree(selectedFiles))}
                  </div>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="px-8 pb-6">
              <p className="text-center text-sm text-gray-500">
                Asegúrate de que la fuente sea confiable antes de proceder
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-6 pb-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-5 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-medium border border-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors font-medium shadow-lg"
              >
                Cargar ahora
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
              onClick={() => navigate('/admin/configuracion/datasets')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Crear Nuevo Dataset</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-6">
        {/* Import Options */}
        <div className="bg-white p-7" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-base font-semibold text-gray-900 mb-6">Importar Datos</h2>

          {/* Dataset Info Fields */}
          <div className="space-y-4 mb-8">
            <div>
              <label htmlFor="dataset-name" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Dataset <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="dataset-name"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="Ej: Artículos 2024"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={isUploading}
              />
            </div>
            <div>
              <label htmlFor="dataset-description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción (Opcional)
              </label>
              <textarea
                id="dataset-description"
                value={datasetDescription}
                onChange={(e) => setDatasetDescription(e.target.value)}
                placeholder="Describe el contenido de este dataset..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={isUploading}
              />
            </div>
          </div>

          {/* Method Selector */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* Files Option */}
            <button
              onClick={() => setSelectedMethod('files')}
              className={`p-4 border-2 rounded-xl transition-all ${
                selectedMethod === 'files'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
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
              className={`p-4 border-2 rounded-xl transition-all ${
                selectedMethod === 'folder'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <div className="text-sm font-medium text-gray-900">Carpeta</div>
              <div className="text-xs text-gray-500 mt-1">Carpeta completa</div>
            </button>

            {/* Google Drive Option */}
            <button
              onClick={() => setSelectedMethod('drive')}
              className={`p-4 border-2 rounded-xl transition-all ${
                selectedMethod === 'drive'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              <div className="text-sm font-medium text-gray-900">Google Drive</div>
              <div className="text-xs text-gray-500 mt-1">URL de carpeta</div>
            </button>
          </div>

          {/* Import Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8">
            {/* Files Import */}
            {selectedMethod === 'files' && (
              <div>
                {selectedFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      onChange={handleFilesChange}
                      className="hidden"
                      accept=".pdf,.txt,.doc,.docx"
                    />
                    <label
                      htmlFor="file-upload"
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
                    {/* Header con contador */}
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
                        htmlFor="file-upload"
                        className="text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer font-medium"
                      >
                        + Agregar más
                      </label>
                      <input
                        type="file"
                        id="file-upload"
                        multiple
                        onChange={handleFilesChange}
                        className="hidden"
                        accept=".pdf,.txt,.doc,.docx"
                      />
                    </div>

                    {/* Lista de archivos */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedFiles.map((file, index) => {
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

                        const formatFileSize = (bytes: number) => {
                          if (bytes < 1024) return bytes + ' B';
                          if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
                          return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
                        };

                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {getFileIcon(file.name)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              title="Eliminar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Folder Import */}
            {selectedMethod === 'folder' && (
              <div>
                {selectedFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <input
                      type="file"
                      id="folder-upload"
                      /* @ts-ignore */
                      webkitdirectory=""
                      directory=""
                      multiple
                      onChange={handleFolderChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="folder-upload"
                      className="cursor-pointer inline-flex flex-col items-center"
                    >
                      <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Haz clic para seleccionar carpeta</span>
                      <span className="text-xs text-gray-500 mt-1">Se cargarán todos los archivos contenidos</span>
                      <div className="flex items-start gap-2 mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg max-w-md">
                        <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-xs text-gray-700 text-left">
                          <strong className="text-amber-700">Precaución:</strong> Solo selecciona carpetas de fuentes confiables
                        </p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Header con contador */}
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
                        htmlFor="folder-upload"
                        className="text-xs text-emerald-600 hover:text-emerald-700 cursor-pointer font-medium"
                      >
                        Cambiar carpeta
                      </label>
                      <input
                        type="file"
                        id="folder-upload"
                        /* @ts-ignore */
                        webkitdirectory=""
                        directory=""
                        multiple
                        onChange={handleFolderChange}
                        className="hidden"
                      />
                    </div>

                    {/* TreeView de estructura de carpetas */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        Estructura de carpetas:
                      </h4>
                      <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-y-auto" style={{ maxHeight: '400px' }}>
                        <div className="p-2">
                          {renderTreeNode(buildFileTree(selectedFiles))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Google Drive Import */}
            {selectedMethod === 'drive' && (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Google Drive Connection Component */}
                <GoogleDriveConnect
                  onConnectionChange={(connection) => setGoogleConnection(connection)}
                />

                {/* Only show form if connected */}
                {googleConnection?.is_connected && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Importar desde Google Drive</h3>
                      <p className="text-xs text-gray-500">
                        Ingresa la URL de tu carpeta de Google Drive
                      </p>
                    </div>

                    <div>
                      <label htmlFor="drive-url" className="block text-sm font-medium text-gray-700 mb-2">
                        URL de la carpeta
                      </label>
                      <input
                        type="url"
                        id="drive-url"
                        value={driveUrl}
                        onChange={(e) => setDriveUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>

                    <button
                      onClick={handleDriveSubmit}
                      disabled={!driveUrl || !datasetName || isUploading}
                      className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <Spinner size="sm" />
                          <span>Importando...</span>
                        </>
                      ) : (
                        'Importar desde Drive'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Import Button (for files and folder) */}
          {(selectedMethod === 'files' || selectedMethod === 'folder') && selectedFiles.length > 0 && (
            <div className="mt-6">
              {/* Progress Bar */}
              {isUploading && uploadProgress.total > 0 && (
                <div className="mb-4 bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Subiendo archivos...
                    </span>
                    <span className="text-sm text-gray-600">
                      {uploadProgress.loaded} / {uploadProgress.total} ({uploadProgress.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleImportClick}
                  disabled={!datasetName || isUploading}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Spinner size="sm" />
                      <span>Importando...</span>
                    </>
                  ) : (
                    `Importar ${selectedFiles.length} archivo(s)`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
