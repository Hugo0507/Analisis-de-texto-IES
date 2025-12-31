/**
 * Datasets Page
 *
 * Management of datasets for NLP analysis.
 * Only accessible by authenticated users.
 */

import React, { useState } from 'react';

type ImportMethod = 'files' | 'folder' | 'drive';

export const Datasets: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<ImportMethod>('files');
  const [driveUrl, setDriveUrl] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

  const handleDriveSubmit = () => {
    console.log('Drive URL:', driveUrl);
    // TODO: Implementar conexión con Google Drive
  };

  const handleImport = () => {
    console.log('Importando archivos:', selectedFiles);
    // TODO: Implementar lógica de importación
  };

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
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-6">
        {/* Import Options */}
        <div className="bg-white p-7" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-base font-semibold text-gray-900 mb-6">Importar Datos</h2>

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
              <div className="text-center">
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
                {selectedFiles.length > 0 && (
                  <div className="mt-6 text-left">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {selectedFiles.length} archivo(s) seleccionado(s):
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <li key={index} className="truncate">• {file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Folder Import */}
            {selectedMethod === 'folder' && (
              <div className="text-center">
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
                  <span className="text-xs text-gray-500 mt-1">Se importarán todos los archivos de la carpeta</span>
                </label>
                {selectedFiles.length > 0 && (
                  <div className="mt-6 text-left">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {selectedFiles.length} archivo(s) en la carpeta:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <li key={index} className="truncate">• {file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Google Drive Import */}
            {selectedMethod === 'drive' && (
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Conectar con Google Drive</h3>
                  <p className="text-xs text-gray-500">
                    Ingresa la URL de tu carpeta de Google Drive
                  </p>
                </div>

                <div className="space-y-4">
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

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-gray-700">
                      <strong>Nota:</strong> Para conectarte a Google Drive, necesitas compartir la carpeta y
                      copiar su URL desde el navegador.
                    </p>
                  </div>

                  <button
                    onClick={handleDriveSubmit}
                    disabled={!driveUrl}
                    className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Conectar con Drive
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Import Button (for files and folder) */}
          {(selectedMethod === 'files' || selectedMethod === 'folder') && selectedFiles.length > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleImport}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Importar {selectedFiles.length} archivo(s)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
