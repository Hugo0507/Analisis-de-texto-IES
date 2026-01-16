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
              onClick={() => navigate('/admin/modelado/bertopic')}
              className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Crear Análisis BERTopic</h1>
              <p className="text-sm text-gray-500">Topic Modeling con BERT</p>
            </div>
          </div>

          {/* Right: Save Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
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
          <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica */}
        <div className="bg-white p-8" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Análisis <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormField('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Describe el propósito de este análisis..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Origen de Datos */}
        <div className="bg-white p-8" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Origen de Datos</h2>
          <p className="text-sm text-gray-600 mb-4">
            Selecciona desde dónde deseas crear el análisis BERTopic
          </p>

          <div className="space-y-4">
            {/* Radio buttons */}
            <div className="grid grid-cols-1 gap-3">
              <div
                onClick={() => {
                  updateFormField('source_type', 'data_preparation');
                  updateFormField('dataset', undefined);
                }}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.source_type === 'data_preparation'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={formData.source_type === 'data_preparation'}
                    onChange={() => {
                      updateFormField('source_type', 'data_preparation');
                      updateFormField('dataset', undefined);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Desde Preparación de Datos</p>
                    <p className="text-xs text-gray-600 mt-1">Crear análisis desde textos procesados</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => {
                  updateFormField('source_type', 'dataset');
                  updateFormField('data_preparation', undefined);
                }}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.source_type === 'dataset'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={formData.source_type === 'dataset'}
                    onChange={() => {
                      updateFormField('source_type', 'dataset');
                      updateFormField('data_preparation', undefined);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Desde Dataset Directo</p>
                    <p className="text-xs text-gray-600 mt-1">Crear análisis directamente desde dataset</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Preparation Select */}
            {formData.source_type === 'data_preparation' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Preparación de Datos <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.data_preparation || ''}
                  onChange={(e) => updateFormField('data_preparation', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="">Selecciona una preparación...</option>
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
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Dataset <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.dataset || ''}
                  onChange={(e) => updateFormField('dataset', Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                >
                  <option value="">Selecciona un dataset...</option>
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

        {/* Modelo de Embeddings */}
        <div className="bg-white p-8" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modelo de Embeddings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Modelo BERT <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.embedding_model}
                onChange={(e) => updateFormField('embedding_model', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-2">{selectedModel.full_name}</p>
                <p className="text-sm text-blue-800 mb-3">{selectedModel.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <span className="text-xs font-semibold text-blue-700">Idioma:</span>
                    <p className="text-sm text-blue-900">{selectedModel.language}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-blue-700">Tamaño:</span>
                    <p className="text-sm text-blue-900">{selectedModel.size_mb} MB</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-blue-700">Velocidad:</span>
                    <p className="text-sm text-blue-900">
                      {selectedModel.speed === 'very_fast'
                        ? 'Muy rápido'
                        : selectedModel.speed === 'fast'
                        ? 'Rápido'
                        : 'Moderado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-blue-700">Calidad:</span>
                    <p className="text-sm text-blue-900">
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

        {/* Parámetros del Análisis */}
        <div className="bg-white p-8" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Parámetros del Análisis</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configura los parámetros de UMAP y HDBSCAN para el análisis BERTopic
          </p>

          <div className="space-y-6">
            {/* UMAP Parameters */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-900 mb-2">
                Parámetros UMAP (Reducción Dimensional)
              </h3>
              <p className="text-xs text-purple-800 mb-3">
                Controla cómo se reduce la dimensionalidad de los embeddings
              </p>

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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Dimensionalidad reducida. Recomendado: 5 para la mayoría de casos.
                  </p>
                </div>
              </div>
            </div>

            {/* HDBSCAN Parameters */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-indigo-900 mb-2">
                Parámetros HDBSCAN (Clustering)
              </h3>
              <p className="text-xs text-indigo-800 mb-3">
                Controla cómo se forman los clusters de documentos similares
              </p>

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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Muestras mínimas para un punto core. Controla el ruido del clustering.
                  </p>
                </div>
              </div>
            </div>

            {/* Topic Configuration */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-amber-900 mb-2">Configuración de Tópicos</h3>
              <p className="text-xs text-amber-800 mb-3">
                Define cómo se representan los tópicos encontrados
              </p>

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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
          </form>
        </div>
      </div>
    </div>
  );
};

export default BERTopicCreate;
