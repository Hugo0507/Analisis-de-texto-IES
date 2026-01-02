/**
 * Data Preparation Create Page
 *
 * Formulario para crear nueva preparación de datos NLP.
 * Layout de 4 cards en grid 2x2.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Sparkles, CheckCircle2, Settings } from 'lucide-react';
import { TagsInput } from '../components/TagsInput';
import dataPreparationService, { DataPreparationCreateRequest } from '../services/dataPreparationService';
import datasetsService, { DatasetListItem } from '../services/datasetsService';
import { useToast } from '../contexts/ToastContext';
import { Spinner } from '../components/atoms';

export const DataPreparationCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Form state
  const [name, setName] = useState('');
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [customStopwords, setCustomStopwords] = useState<string[]>([]);
  const [filterByPredominantLanguage, setFilterByPredominantLanguage] = useState(true);
  const [enableTokenization, setEnableTokenization] = useState(true);
  const [enableLemmatization, setEnableLemmatization] = useState(true);
  const [enableSpecialCharsRemoval, setEnableSpecialCharsRemoval] = useState(true);
  const [enableIntegrityCheck, setEnableIntegrityCheck] = useState(true);
  const [enableDuplicateRemoval, setEnableDuplicateRemoval] = useState(true);

  // UI state
  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load datasets on mount
  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setIsLoadingDatasets(true);
      const data = await datasetsService.getDatasets();
      setDatasets(data);
    } catch (error: any) {
      showError(error.response?.data?.error || 'Error al cargar datasets');
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validations
    if (!name.trim()) {
      showError('El nombre es requerido');
      return;
    }

    if (!datasetId) {
      showError('Debes seleccionar un dataset');
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData: DataPreparationCreateRequest = {
        name: name.trim(),
        dataset_id: datasetId,
        custom_stopwords: customStopwords,
        filter_by_predominant_language: filterByPredominantLanguage,
        enable_tokenization: enableTokenization,
        enable_lemmatization: enableLemmatization,
        enable_special_chars_removal: enableSpecialCharsRemoval,
        enable_integrity_check: enableIntegrityCheck,
        enable_duplicate_removal: enableDuplicateRemoval,
      };

      const preparation = await dataPreparationService.createPreparation(requestData);

      showSuccess('Preparación iniciada correctamente');
      navigate(`/admin/preprocesamiento/preparacion-datos/${preparation.id}`);
    } catch (error: any) {
      showError(error.response?.data?.error || 'Error al crear preparación');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h1 className="text-xl font-semibold text-gray-900">Nueva Preparación de Datos</h1>
          </div>

          {/* Right: Save Button */}
          <button
            onClick={() => handleSubmit()}
            disabled={isSubmitting || !datasetId}
            className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            title="Guardar"
          >
            {isSubmitting ? (
              <Spinner size="sm" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <form onSubmit={handleSubmit}>
          {/* Nombre de la preparación */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Preparación
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Limpieza Inicial - Dataset Tesis"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              required
            />
          </div>

          {/* Grid de 4 cards - 2x2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Configuración General */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Configuración General</h2>
              </div>

              <div className="space-y-4">
                {/* Dataset Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dataset a Procesar
                  </label>
                  {isLoadingDatasets ? (
                    <div className="flex items-center justify-center py-4">
                      <Spinner size="sm" />
                    </div>
                  ) : (
                    <select
                      value={datasetId || ''}
                      onChange={(e) => setDatasetId(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    >
                      <option value="">Selecciona un dataset</option>
                      {datasets.map((dataset) => (
                        <option key={dataset.id} value={dataset.id}>
                          {dataset.name} ({dataset.file_count} archivos)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Nota informativa */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <FileText className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    <strong>Nota:</strong> Esta versión solo procesa archivos <strong>PDF</strong>.
                    Los demás formatos serán ignorados automáticamente.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Limpieza de Datos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Limpieza de Datos</h2>
              </div>

              <div className="space-y-4">
                {/* Stopwords Personalizadas */}
                <TagsInput
                  value={customStopwords}
                  onChange={setCustomStopwords}
                  label="Stopwords Personalizadas"
                  placeholder="Escribe una palabra y presiona Enter"
                  helperText="Palabras adicionales a eliminar además de las stopwords por defecto"
                />

                {/* Filtrar por Idioma Predominante */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Filtrar por Idioma Predominante
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Procesar solo archivos del idioma más común
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterByPredominantLanguage}
                      onChange={(e) => setFilterByPredominantLanguage(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Card 3: Transformación */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Transformación</h2>
              </div>

              <div className="space-y-3">
                {/* Tokenización */}
                <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={enableTokenization}
                    onChange={(e) => setEnableTokenization(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Tokenización</p>
                    <p className="text-xs text-gray-500">Dividir texto en tokens/palabras</p>
                  </div>
                </label>

                {/* Lematización */}
                <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={enableLemmatization}
                    onChange={(e) => setEnableLemmatization(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Lematización (spaCy)</p>
                    <p className="text-xs text-gray-500">Reducir palabras a su forma base</p>
                  </div>
                </label>

                {/* Eliminación de Caracteres Especiales */}
                <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={enableSpecialCharsRemoval}
                    onChange={(e) => setEnableSpecialCharsRemoval(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Eliminación de Caracteres Especiales</p>
                    <p className="text-xs text-gray-500">Remover puntuación y símbolos</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Card 4: Validación */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Validación</h2>
              </div>

              <div className="space-y-3">
                {/* Verificación de Integridad */}
                <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={enableIntegrityCheck}
                    onChange={(e) => setEnableIntegrityCheck(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Verificación de Integridad</p>
                    <p className="text-xs text-gray-500">Validar estructura y contenido</p>
                  </div>
                </label>

                {/* Eliminación de Duplicados */}
                <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={enableDuplicateRemoval}
                    onChange={(e) => setEnableDuplicateRemoval(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Eliminación de Duplicados</p>
                    <p className="text-xs text-gray-500">Remover archivos duplicados</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
