/**
 * NgramsCreate Page - Crear Análisis de N-gramas
 *
 * Formulario para crear nuevo análisis comparativo de N-gramas.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ngramAnalysisService from '../services/ngramAnalysisService';
import dataPreparationService from '../services/dataPreparationService';
import type { DataPreparationListItem } from '../services/dataPreparationService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';


interface ConfigOption {
  config: [number, number];
  label: string;
  description: string;
  selected: boolean;
}

export const NgramsCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [preparations, setPreparations] = useState<DataPreparationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreparations, setIsLoadingPreparations] = useState(true);

  // Form data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dataPreparationId, setDataPreparationId] = useState<number>(0);

  // Configuraciones predefinidas seleccionadas
  const [configOptions, setConfigOptions] = useState<ConfigOption[]>([
    { config: [1, 1], label: '(1, 1) - Solo Unigramas', description: 'Palabras individuales como "educación", "digital", "tecnología"', selected: false },
    { config: [1, 2], label: '(1, 2) - Unigramas + Bigramas', description: 'Palabras + pares: "educación digital", "tecnología avanzada" (Recomendado)', selected: true },
    { config: [1, 3], label: '(1, 3) - Hasta Trigramas', description: 'Incluye frases completas: "transformación digital educativa"', selected: false },
    { config: [2, 2], label: '(2, 2) - Solo Bigramas', description: 'Solo pares de palabras: "inteligencia artificial", "aprendizaje automático"', selected: false },
    { config: [2, 3], label: '(2, 3) - Bigramas + Trigramas', description: 'Combinaciones de 2 y 3 palabras', selected: false },
    { config: [3, 3], label: '(3, 3) - Solo Trigramas', description: 'Solo combinaciones de 3 palabras', selected: false },
  ]);

  // Configuraciones personalizadas
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const [customMin, setCustomMin] = useState<number>(1);
  const [customMax, setCustomMax] = useState<number>(1);

  // Parámetros del vectorizador
  const [maxFeatures, setMaxFeatures] = useState(100000);
  const [minDf, setMinDf] = useState(1);
  const [maxDf, setMaxDf] = useState(1.0);

  useEffect(() => {
    loadPreparations();
  }, []);

  const loadPreparations = async () => {
    setIsLoadingPreparations(true);
    try {
      const data = await dataPreparationService.getPreparations();
      const completed = data.filter((prep: DataPreparationListItem) => prep.status === 'completed');
      setPreparations(completed);
    } catch (error: any) {
      showError('Error al cargar preparaciones: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoadingPreparations(false);
    }
  };

  const toggleConfigOption = (index: number) => {
    setConfigOptions(prev => prev.map((opt, i) =>
      i === index ? { ...opt, selected: !opt.selected } : opt
    ));
  };

  const addCustomConfig = () => {
    if (customMin < 1) {
      showError('El n-grama mínimo debe ser al menos 1');
      return;
    }
    if (customMax < customMin) {
      showError('El n-grama máximo debe ser >= al mínimo');
      return;
    }

    // Verificar si ya existe
    const exists = configOptions.some(opt =>
      opt.config[0] === customMin && opt.config[1] === customMax
    );

    if (exists) {
      showError(`La configuración (${customMin}, ${customMax}) ya está en la lista`);
      return;
    }

    setConfigOptions(prev => [
      ...prev,
      {
        config: [customMin, customMax],
        label: `(${customMin}, ${customMax}) - Personalizado`,
        description: 'Configuración personalizada',
        selected: true
      }
    ]);

    // Reset custom inputs
    setCustomMin(1);
    setCustomMax(1);
    setShowCustomConfig(false);
    showSuccess(`Configuración (${customMin}, ${customMax}) agregada`);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Validaciones
    if (!name.trim()) {
      showError('El nombre es requerido');
      return;
    }

    if (dataPreparationId === 0) {
      showError('Debes seleccionar una preparación de datos');
      return;
    }

    const selectedConfigs = configOptions
      .filter(opt => opt.selected)
      .map(opt => opt.config);

    if (selectedConfigs.length === 0) {
      showError('Debes seleccionar al menos una configuración de n-gramas');
      return;
    }

    setIsLoading(true);
    try {
      const requestData = {
        name,
        description: description || undefined,
        data_preparation: dataPreparationId,
        ngram_configurations: selectedConfigs,
        max_features: maxFeatures,
        min_df: minDf,
        max_df: maxDf,
      };

      const created = await ngramAnalysisService.createNgramAnalysis(requestData);

      showSuccess(`Análisis "${created.name}" creado exitosamente`);
      navigate(`/admin/preprocesamiento/n-gramas/${created.id}`);
    } catch (error: any) {
      showError('Error al crear análisis: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingPreparations) {
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/preprocesamiento/n-gramas')}
              className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Crear Análisis de N-gramas</h1>
              <p className="text-sm text-gray-500">Análisis comparativo de múltiples configuraciones de n-gramas</p>
            </div>
          </div>

          {/* Right: Save Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || dataPreparationId === 0}
            className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            title="Guardar"
          >
            {isLoading ? (
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
        <div className="max-w-4xl mx-auto">
          {/* No Preparations Available */}
          {preparations.length === 0 ? (
            <div className="bg-white p-8 text-center" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay preparaciones de datos disponibles
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Necesitas crear y completar una preparación de datos antes de crear un análisis de N-gramas
              </p>
              <button
                onClick={() => navigate('/admin/preprocesamiento/preparacion-datos/nuevo')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Preparación de Datos
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white p-8" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
              {/* Información Básica */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h2>

                {/* Nombre */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Análisis <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Comparación N-gramas - Dataset Tesis"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Descripción */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción (Opcional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe el propósito de este análisis comparativo..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                {/* Preparación de Datos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preparación de Datos <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={dataPreparationId}
                    onChange={(e) => setDataPreparationId(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  >
                    <option value={0}>Selecciona una preparación de datos...</option>
                    {preparations.map((prep) => (
                      <option key={prep.id} value={prep.id}>
                        {prep.name} ({prep.dataset_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Configuraciones de N-gramas */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Configuraciones de N-gramas</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Selecciona las configuraciones que deseas comparar. Se ejecutarán todos los análisis y se mostrarán las diferencias.
                </p>

                {/* Configuraciones Predefinidas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {configOptions.map((option, index) => (
                    <div
                      key={index}
                      onClick={() => toggleConfigOption(index)}
                      className={`
                        p-4 border-2 rounded-lg cursor-pointer transition-all
                        ${option.selected
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={option.selected}
                          onChange={() => toggleConfigOption(index)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                          <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón para agregar configuración personalizada */}
                {!showCustomConfig && (
                  <button
                    type="button"
                    onClick={() => setShowCustomConfig(true)}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Configuración Personalizada
                  </button>
                )}

                {/* Formulario de configuración personalizada */}
                {showCustomConfig && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">⚙️ Configuración Personalizada</h3>

                    <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 mb-4">
                      <p className="text-xs text-amber-900 font-medium mb-1">⚠️ Advertencia sobre n-gramas grandes</p>
                      <p className="text-xs text-amber-800">
                        Configuraciones con n-gramas mayores a 3 generan vocabularios muy grandes y pueden ser lentos.
                        Además, n-gramas grandes (4+) suelen tener poca frecuencia y pueden no ser relevantes para el análisis.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">N-grama Mínimo</label>
                        <input
                          type="number"
                          min={1}
                          value={customMin}
                          onChange={(e) => setCustomMin(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">N-grama Máximo</label>
                        <input
                          type="number"
                          min={1}
                          value={customMax}
                          onChange={(e) => setCustomMax(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addCustomConfig}
                        className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium"
                      >
                        Agregar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomConfig(false)}
                        className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Resumen de configuraciones seleccionadas */}
              {configOptions.filter(opt => opt.selected).length > 0 && (
                <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    📊 Resumen: {configOptions.filter(opt => opt.selected).length} configuraciones seleccionadas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {configOptions
                      .filter(opt => opt.selected)
                      .map((opt, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          ({opt.config[0]}, {opt.config[1]})
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Configuración del Vectorizador */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Configuración del Vectorizador</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Controla cómo se construye el vocabulario de n-gramas. Se aplica a todas las configuraciones seleccionadas.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* max_features */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Máximo de características
                    </label>
                    <input
                      type="number"
                      min={100}
                      step={1000}
                      value={maxFeatures}
                      onChange={(e) => setMaxFeatures(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Número máximo de n-gramas distintos en el vocabulario. Valores entre 10 000 y 50 000 son habituales para bigramas.
                    </p>
                  </div>

                  {/* min_df */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frecuencia mínima de documento <span className="text-gray-400">(min_df)</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={minDf}
                      onChange={(e) => setMinDf(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      El n-grama debe aparecer en al menos este número de documentos. Usar 2–5 elimina bigramas que solo aparecen una vez.
                    </p>
                  </div>

                  {/* max_df */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frecuencia máxima de documento <span className="text-gray-400">(max_df)</span>
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      max={1.0}
                      step={0.05}
                      value={maxDf}
                      onChange={(e) => setMaxDf(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Proporción máxima del corpus. Un n-grama que aparece en más del 90 % de los documentos aporta poco (ej: 0.90).
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-xs text-emerald-800">
                    <span className="font-semibold">Configuración recomendada para bigramas (2,2):</span>{' '}
                    max_features = 20 000 · min_df = 2 · max_df = 0.90. Esto descarta bigramas hapax y los que son tan frecuentes que no discriminan.
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
