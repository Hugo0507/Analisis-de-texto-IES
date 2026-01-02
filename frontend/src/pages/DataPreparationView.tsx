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
  AlertTriangle
} from 'lucide-react';
import dataPreparationService, { DataPreparation } from '../services/dataPreparationService';
import { useToast } from '../contexts/ToastContext';
import { Spinner } from '../components/atoms';

export const DataPreparationView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();

  const [preparation, setPreparation] = useState<DataPreparation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-medium mb-1">Procesados</p>
                  <p className="text-3xl font-bold text-green-900">{preparation.files_processed}</p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700 font-medium mb-1">Omitidos</p>
                  <p className="text-3xl font-bold text-amber-900">{preparation.files_omitted}</p>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium mb-1">Duplicados Eliminados</p>
                  <p className="text-3xl font-bold text-red-900">{preparation.duplicates_removed}</p>
                </div>
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
    </div>
  );
};
