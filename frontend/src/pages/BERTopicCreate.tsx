/**
 * BERTopicCreate Page - Crear Análisis BERTopic
 *
 * Formulario para crear nuevo análisis de BERTopic.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import bertopicService from '../services/bertopicService';
import type { BERTopicCreateRequest, EmbeddingModel } from '../services/bertopicService';
import dataPreparationService from '../services/dataPreparationService';
import datasetsService from '../services/datasetsService';
import type { DatasetListItem } from '../services/datasetsService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

interface DataPreparation {
  id: number;
  name: string;
  status: string;
}

export const BERTopicCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Form data
  const [formData, setFormData] = useState<BERTopicCreateRequest>({
    name: '',
    description: '',
    source_type: 'data_preparation',
    embedding_model: 'all-MiniLM-L6-v2',
    n_neighbors: 15,
    n_components: 5,
    min_cluster_size: 10,
    min_samples: 5,
    num_words: 10,
  });

  // Data sources
  const [dataPreparations, setDataPreparations] = useState<DataPreparation[]>([]);
  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);

  // Embedding models
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModel[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      const [prepsData, datasetsData, modelsData] = await Promise.all([
        dataPreparationService.getPreparations(),
        datasetsService.getDatasets(),
        bertopicService.getEmbeddingModels(),
      ]);

      // Filter completed data preparations
      const completedPreps = prepsData.filter((prep: DataPreparation) => prep.status === 'completed');
      setDataPreparations(completedPreps);
      setDatasets(datasetsData);
      setEmbeddingModels(modelsData.embedding_models);

      // Set default data_preparation if available
      if (completedPreps.length > 0) {
        setFormData((prev) => ({ ...prev, data_preparation: completedPreps[0].id }));
      }
    } catch (error: any) {
      showError('Error al cargar datos: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!formData.name.trim()) {
      showError('El nombre es requerido');
      return;
    }

    if (formData.source_type === 'data_preparation' && !formData.data_preparation) {
      showError('Debes seleccionar una preparación de datos');
      return;
    }

    if (formData.source_type === 'dataset' && !formData.dataset) {
      showError('Debes seleccionar un dataset');
      return;
    }

    setIsLoading(true);
    try {
      const response = await bertopicService.createBERTopic(formData);
      showSuccess(`Análisis "${response.name}" creado exitosamente. Procesamiento iniciado.`);
      navigate(`/admin/modelado/bertopic/${response.id}`);
    } catch (error: any) {
      console.error('Error creating BERTopic:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Error desconocido';
      showError('Error al crear análisis: ' + errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormField = (field: keyof BERTopicCreateRequest, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const selectedModel = embeddingModels.find((m) => m.id === formData.embedding_model);

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner size="lg" />
        <span className="ml-3 text-lg text-gray-600">Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/modelado/bertopic')}
          className="text-indigo-600 hover:text-indigo-800 font-semibold mb-4 flex items-center"
        >
          ← Volver a lista
        </button>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Crear Análisis BERTopic
        </h1>
        <p className="text-gray-600">
          Topic Modeling basado en BERT: Embeddings + UMAP + HDBSCAN
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-8">
        <p className="text-sm text-purple-900 font-semibold mb-1">
          ¿Qué es BERTopic?
        </p>
        <p className="text-sm text-purple-800">
          BERTopic es un algoritmo moderno de topic modeling que combina BERT embeddings
          (comprensión semántica profunda), UMAP (reducción dimensional) y HDBSCAN (clustering
          basado en densidad) para extraer tópicos coherentes de manera automática.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ============================================================ */}
        {/* SECTION 1: BASIC INFORMATION */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
              1
            </span>
            Información Básica
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Análisis *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormField('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ej: BERTopic - Artículos Científicos 2024"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción (Opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormField('description', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Descripción detallada del análisis..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 2: DATA SOURCE */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
              2
            </span>
            Origen de Datos
          </h2>

          <div className="space-y-4">
            {/* Radio buttons */}
            <div className="flex space-x-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={formData.source_type === 'data_preparation'}
                  onChange={() => {
                    updateFormField('source_type', 'data_preparation');
                    updateFormField('dataset', undefined);
                  }}
                  className="mr-2 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Desde Preparación de Datos
                </span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={formData.source_type === 'dataset'}
                  onChange={() => {
                    updateFormField('source_type', 'dataset');
                    updateFormField('data_preparation', undefined);
                  }}
                  className="mr-2 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Desde Dataset Directo
                </span>
              </label>
            </div>

            {/* Data Preparation Select */}
            {formData.source_type === 'data_preparation' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Preparación de Datos *
                </label>
                <select
                  value={formData.data_preparation || ''}
                  onChange={(e) => updateFormField('data_preparation', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {dataPreparations.map((prep) => (
                    <option key={prep.id} value={prep.id}>
                      {prep.name}
                    </option>
                  ))}
                </select>
                {dataPreparations.length === 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    No hay preparaciones de datos completadas. Crea una primero.
                  </p>
                )}
              </div>
            )}

            {/* Dataset Select */}
            {formData.source_type === 'dataset' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Dataset *
                </label>
                <select
                  value={formData.dataset || ''}
                  onChange={(e) => updateFormField('dataset', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {datasets.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name} ({ds.total_files} archivos)
                    </option>
                  ))}
                </select>
                {datasets.length === 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    No hay datasets disponibles. Crea uno primero.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: EMBEDDING MODEL */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
              3
            </span>
            Modelo de Embeddings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Modelo BERT *
              </label>
              <select
                value={formData.embedding_model}
                onChange={(e) => updateFormField('embedding_model', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                {embeddingModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} - {model.language} {model.recommended && '⭐ (Recomendado)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Model details */}
            {selectedModel && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="font-semibold text-indigo-900 mb-2">{selectedModel.full_name}</p>
                <p className="text-sm text-indigo-800 mb-3">{selectedModel.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <span className="text-xs font-semibold text-indigo-700">Idioma:</span>
                    <p className="text-sm text-indigo-900">{selectedModel.language}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-indigo-700">Tamaño:</span>
                    <p className="text-sm text-indigo-900">{selectedModel.size_mb} MB</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-indigo-700">Velocidad:</span>
                    <p className="text-sm text-indigo-900">
                      {selectedModel.speed === 'very_fast'
                        ? 'Muy rápido'
                        : selectedModel.speed === 'fast'
                        ? 'Rápido'
                        : 'Moderado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-indigo-700">Calidad:</span>
                    <p className="text-sm text-indigo-900">
                      {selectedModel.quality === 'excellent' ? 'Excelente' : 'Buena'}
                    </p>
                  </div>
                </div>

                <div className="mb-2">
                  <span className="text-xs font-semibold text-emerald-700">✅ Ventajas:</span>
                  <ul className="text-xs text-emerald-800 mt-1 space-y-1">
                    {selectedModel.pros.map((pro, idx) => (
                      <li key={idx}>• {pro}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-xs font-semibold text-amber-700">⚠️ Desventajas:</span>
                  <ul className="text-xs text-amber-800 mt-1 space-y-1">
                    {selectedModel.cons.map((con, idx) => (
                      <li key={idx}>• {con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 4: PARAMETERS */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
              4
            </span>
            Configuración de Parámetros
          </h2>

          <div className="space-y-6">
            {/* UMAP Parameters */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                Parámetros UMAP (Reducción Dimensional)
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    N Neighbors (5-50)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={formData.n_neighbors}
                    onChange={(e) => updateFormField('n_neighbors', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Número de vecinos a considerar. Valores más altos = tópicos más globales.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    N Components (2-100)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    value={formData.n_components}
                    onChange={(e) => updateFormField('n_components', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Dimensionalidad reducida. Recomendado: 5 para la mayoría de casos.
                  </p>
                </div>
              </div>
            </div>

            {/* HDBSCAN Parameters */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                Parámetros HDBSCAN (Clustering)
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Cluster Size (5-100)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={formData.min_cluster_size}
                    onChange={(e) => updateFormField('min_cluster_size', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tamaño mínimo de un cluster. Valores más altos = menos tópicos más grandes.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Samples (1-50)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.min_samples}
                    onChange={(e) => updateFormField('min_samples', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Muestras mínimas para un punto core. Controla el ruido del clustering.
                  </p>
                </div>
              </div>
            </div>

            {/* Topic Configuration */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Configuración de Tópicos</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Palabras por Tópico (5-50)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={formData.num_words}
                    onChange={(e) => updateFormField('num_words', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Número de palabras representativas por tópico.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Semilla Aleatoria (Opcional)
                  </label>
                  <input
                    type="number"
                    value={formData.random_seed || ''}
                    onChange={(e) =>
                      updateFormField('random_seed', e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ej: 42"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Para reproducibilidad de resultados. Déjalo vacío para aleatorio.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/modelado/bertopic')}
            className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" />
                <span className="ml-2">Creando...</span>
              </>
            ) : (
              'Crear Análisis BERTopic'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BERTopicCreate;
