/**
 * Data Preparation View Page
 *
 * Vista de resultados de preparación de datos.
 * Muestra progreso en tiempo real o resultados finales.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Globe,
  TrendingUp,
  Settings,
  AlertTriangle,
  ArrowRight,
  FileType
} from 'lucide-react';
import dataPreparationService, { DataPreparation, FileDetailsData, FileDetail } from '../services/dataPreparationService';
import { useToast } from '../contexts/ToastContext';
import { Spinner } from '../components/atoms';

type FileModalType = 'processed' | 'omitted' | 'duplicates' | null;

export const DataPreparationView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();

  const [preparation, setPreparation] = useState<DataPreparation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [fileModalType, setFileModalType] = useState<FileModalType>(null);
  const [fileDetails, setFileDetails] = useState<FileDetailsData | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    if (!id) return;

    loadPreparation();

    // Poll cada 2 segundos si está en proceso
    const interval = setInterval(() => {
      if (preparation?.status === 'processing') {
        loadPreparation();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [id, preparation?.status]);

  const loadPreparation = async () => {
    try {
      const data = await dataPreparationService.getPreparation(Number(id));
      setPreparation(data);
    } catch (error: any) {
      showError('Error al cargar preparación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = async (type: FileModalType) => {
    if (!id) return;

    setFileModalType(type);
    setLoadingFiles(true);
    setFileModalOpen(true);

    try {
      const details = await dataPreparationService.getFileDetails(Number(id));
      setFileDetails(details);
    } catch (error: any) {
      showError('Error al cargar detalles de archivos');
      setFileModalOpen(false);
    } finally {
      setLoadingFiles(false);
    }
  };

  const closeFileModal = () => {
    setFileModalOpen(false);
    setFileModalType(null);
  };

  const getModalTitle = () => {
    switch (fileModalType) {
      case 'processed':
        return 'Archivos Procesados';
      case 'omitted':
        return 'Archivos Omitidos';
      case 'duplicates':
        return 'Archivos Duplicados';
      default:
        return '';
    }
  };

  const getModalFiles = (): FileDetail[] => {
    if (!fileDetails || !fileModalType) return [];
    return fileDetails[fileModalType];
  };

  if (isLoading || !preparation) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F7FE' }}>
        <Spinner />
      </div>
    );
  }

  const isProcessing = preparation.status === 'processing';
  const isCompleted = preparation.status === 'completed';
  const isError = preparation.status === 'error';

  const getLanguageName = (code: string) => dataPreparationService.getLanguageName(code);
  const getLanguageFlag = (code: string) => dataPreparationService.getLanguageFlag(code);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left: Back Button + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/preprocesamiento/preparacion-datos')}
              className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{preparation.name}</h1>
              <p className="text-sm text-gray-500">Dataset: {preparation.dataset.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-6">
        {/* Progress Bar (si está en proceso) */}
        {isProcessing && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="animate-spin">
                <Spinner size="sm" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {preparation.current_stage_label || 'Procesando...'}
                </h2>
                <p className="text-sm text-gray-500">
                  Progreso: {preparation.progress_percentage}%
                </p>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${preparation.progress_percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Error en el Procesamiento
                </h3>
                <p className="text-sm text-red-800">
                  {preparation.error_message || 'Ocurrió un error desconocido durante el procesamiento.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results (si está completado) */}
        {isCompleted && (
          <>
            {/* Section 1: Resumen de Idiomas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Idiomas Detectados</h2>
              </div>

              <div className="space-y-4">
                {Object.entries(preparation.detected_languages)
                  .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
                  .map(([langCode, count]) => {
                    const isPredominant = langCode === preparation.predominant_language;
                    const percentage = preparation.total_files_analyzed > 0
                      ? ((count as number) / preparation.total_files_analyzed * 100).toFixed(1)
                      : '0';

                    return (
                      <div
                        key={langCode}
                        className={`p-4 rounded-lg border-2 ${
                          isPredominant
                            ? 'bg-green-50 border-green-300'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{getLanguageFlag(langCode)}</span>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {getLanguageName(langCode)} ({langCode})
                              </p>
                              <p className="text-sm text-gray-600">
                                {count} archivos ({percentage}%)
                              </p>
                            </div>
                          </div>
                          {isPredominant ? (
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 border border-green-300 rounded-md">
                              <CheckCircle2 className="w-4 h-4 text-green-700" />
                              <span className="text-sm font-medium text-green-900">
                                PREDOMINANTE - PROCESADO
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded-md">
                              <AlertTriangle className="w-4 h-4 text-amber-700" />
                              <span className="text-sm font-medium text-amber-900">
                                OMITIDO
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Section 2: Mensaje del Sistema */}
            {preparation.filter_by_predominant_language && preparation.predominant_language && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Filtrado por Idioma Predominante
                    </h3>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      Se ha procedido a trabajar únicamente con el idioma{' '}
                      <strong>
                        {getLanguageName(preparation.predominant_language)} (
                        {preparation.predominant_language})
                      </strong>{' '}
                      para garantizar la consistencia en el análisis de tópicos y lematización,
                      dado que representa el{' '}
                      <strong>{preparation.predominant_language_percentage.toFixed(1)}%</strong>{' '}
                      del contenido.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Section 2.5: Proceso de Conversión PDF → TXT */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileType className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900 mb-2">
                    Proceso de Conversión y Extracción
                  </h3>
                  <p className="text-sm text-purple-800 leading-relaxed mb-4">
                    Todos los archivos PDF fueron convertidos a formato TXT para permitir una mayor
                    manipulación y análisis de la información. Este proceso incluye:
                  </p>
                </div>
              </div>

              {/* Flujo visual de conversión */}
              <div className="flex items-center justify-center gap-4 bg-white/60 rounded-lg p-6 backdrop-blur-sm">
                {/* PDF */}
                <div className="flex flex-col items-center gap-2">
                  <div className="p-4 bg-red-100 rounded-xl border-2 border-red-300 shadow-sm">
                    <svg className="w-10 h-10 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                      <path d="M14 2v6h6M10 13h4M10 17h4"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-700">Archivos PDF</p>
                    <p className="text-xs text-gray-500">Originales</p>
                  </div>
                </div>

                {/* Arrow 1 */}
                <div className="flex flex-col items-center gap-1">
                  <ArrowRight className="w-6 h-6 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">Extracción</span>
                </div>

                {/* TXT */}
                <div className="flex flex-col items-center gap-2">
                  <div className="p-4 bg-blue-100 rounded-xl border-2 border-blue-300 shadow-sm">
                    <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                      <path d="M14 2v6h6M10 9h4M10 13h4M10 17h4"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-700">Archivos TXT</p>
                    <p className="text-xs text-gray-500">Texto Plano</p>
                  </div>
                </div>

                {/* Arrow 2 */}
                <div className="flex flex-col items-center gap-1">
                  <ArrowRight className="w-6 h-6 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">Procesamiento</span>
                </div>

                {/* Processed */}
                <div className="flex flex-col items-center gap-2">
                  <div className="p-4 bg-emerald-100 rounded-xl border-2 border-emerald-300 shadow-sm">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-700">Datos Limpios</p>
                    <p className="text-xs text-gray-500">Listos para NLP</p>
                  </div>
                </div>
              </div>

              {/* Beneficios */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div className="flex items-start gap-2 bg-white/60 rounded-lg p-3">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Mayor Flexibilidad</p>
                    <p className="text-xs text-gray-600">Manipulación directa del texto</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white/60 rounded-lg p-3">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Mejor Rendimiento</p>
                    <p className="text-xs text-gray-600">Procesamiento más rápido</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white/60 rounded-lg p-3">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">Compatibilidad Total</p>
                    <p className="text-xs text-gray-600">Integración con herramientas NLP</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Estadísticas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Estadísticas de Procesamiento</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 font-medium mb-1">Total Analizados</p>
                  <p className="text-3xl font-bold text-blue-900">{preparation.total_files_analyzed}</p>
                </div>

                <button
                  onClick={() => handleCardClick('processed')}
                  className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors cursor-pointer text-left"
                >
                  <p className="text-sm text-green-700 font-medium mb-1">Procesados</p>
                  <p className="text-3xl font-bold text-green-900">{preparation.files_processed}</p>
                  <p className="text-xs text-green-600 mt-2">Click para ver archivos →</p>
                </button>

                <button
                  onClick={() => handleCardClick('omitted')}
                  className="p-4 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer text-left"
                >
                  <p className="text-sm text-amber-700 font-medium mb-1">Omitidos</p>
                  <p className="text-3xl font-bold text-amber-900">{preparation.files_omitted}</p>
                  <p className="text-xs text-amber-600 mt-2">Click para ver archivos →</p>
                </button>

                <button
                  onClick={() => handleCardClick('duplicates')}
                  className="p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer text-left"
                >
                  <p className="text-sm text-red-700 font-medium mb-1">Duplicados Eliminados</p>
                  <p className="text-3xl font-bold text-red-900">{preparation.duplicates_removed}</p>
                  <p className="text-xs text-red-600 mt-2">Click para ver archivos →</p>
                </button>
              </div>
            </div>

            {/* Section 4: Configuración Aplicada */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Settings className="w-5 h-5 text-gray-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Configuración Aplicada</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Limpieza */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Limpieza de Datos</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Filtrar por idioma predominante</span>
                      {preparation.filter_by_predominant_language ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Stopwords personalizadas</span>
                      <span className="font-medium text-gray-900">
                        {preparation.custom_stopwords.length} palabras
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transformación */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Transformación</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Tokenización</span>
                      {preparation.enable_tokenization ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Lematización</span>
                      {preparation.enable_lemmatization ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Eliminar caracteres especiales</span>
                      {preparation.enable_special_chars_removal ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Validación */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Validación</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Verificación de integridad</span>
                      {preparation.enable_integrity_check ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Eliminación de duplicados</span>
                      {preparation.enable_duplicate_removal ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Stopwords Personalizadas */}
                {preparation.custom_stopwords.length > 0 && (
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">
                      Stopwords Personalizadas ({preparation.custom_stopwords.length})
                    </h3>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {preparation.custom_stopwords.map((word, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* File Details Modal */}
      {fileModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeFileModal}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 transform transition-all">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {getModalTitle()}
                  </h3>
                </div>
                <button
                  onClick={closeFileModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="max-h-96 overflow-y-auto">
                {loadingFiles ? (
                  <div className="flex items-center justify-center py-12">
                    <Spinner size="lg" />
                  </div>
                ) : getModalFiles().length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📂</div>
                    <p className="text-gray-500">No hay archivos en esta categoría</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getModalFiles().map((file, index) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-blue-700">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.original_filename}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="text-xs text-gray-500">ID: {file.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {!loadingFiles && getModalFiles().length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600 text-center">
                    Total: <strong>{getModalFiles().length}</strong> archivo{getModalFiles().length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
