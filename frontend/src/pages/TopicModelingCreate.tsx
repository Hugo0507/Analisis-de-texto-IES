/**
 * TopicModelingCreate Page - Crear Análisis Topic Modeling
 *
 * Formulario para crear nuevo análisis de Topic Modeling.
 * 4 secciones: Info Básica, Origen de Datos, Algoritmo, Configuración
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import topicModelingService from '../services/topicModelingService';
import dataPreparationService from '../services/dataPreparationService';
import datasetsService from '../services/datasetsService';
import type { DataPreparationListItem } from '../services/dataPreparationService';
import type { DatasetListItem } from '../services/datasetsService';
import type { TopicModelingAlgorithm, TopicModelingSourceType, AlgorithmInfo } from '../services/topicModelingService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

export const TopicModelingCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Estados de carga
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreparations, setIsLoadingPreparations] = useState(false);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [isLoadingAlgorithms, setIsLoadingAlgorithms] = useState(true);

  // Sección 1: Información Básica
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Sección 2: Origen de Datos
  const [sourceType, setSourceType] = useState<TopicModelingSourceType>('data_preparation');
  const [preparations, setPreparations] = useState<DataPreparationListItem[]>([]);
  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [dataPreparationId, setDataPreparationId] = useState<number>(0);
  const [datasetId, setDatasetId] = useState<number>(0);

  // Sección 3: Algoritmo
  const [algorithms, setAlgorithms] = useState<AlgorithmInfo[]>([]);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<TopicModelingAlgorithm>('lsa');

  // Sección 4: Configuración
  const [numTopics, setNumTopics] = useState<number>(10);
  const [numWords, setNumWords] = useState<number>(10);
  const [maxIterations, setMaxIterations] = useState<number>(1000);
  const [randomSeed, setRandomSeed] = useState<number | null>(null);
  const [useRandomSeed, setUseRandomSeed] = useState<boolean>(false);

  useEffect(() => {
    loadAlgorithms();
    loadPreparations();
  }, []);

  useEffect(() => {
    if (sourceType === 'dataset' && datasets.length === 0) {
      loadDatasets();
    }
  }, [sourceType]);

  const loadAlgorithms = async () => {
    setIsLoadingAlgorithms(true);
    try {
      const response = await topicModelingService.getAlgorithms();
      setAlgorithms(response.algorithms);
    } catch (error: any) {
      showError('Error al cargar algoritmos: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoadingAlgorithms(false);
    }
  };

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

  const loadDatasets = async () => {
    setIsLoadingDatasets(true);
    try {
      const data = await datasetsService.getDatasets();
      const completed = data.filter((ds: DatasetListItem) => ds.status === 'completed');
      setDatasets(completed);
    } catch (error: any) {
      showError('Error al cargar datasets: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoadingDatasets(false);
    }
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

    if (sourceType === 'data_preparation' && dataPreparationId === 0) {
      showError('Debes seleccionar una preparación de datos');
      return;
    }

    if (sourceType === 'dataset' && datasetId === 0) {
      showError('Debes seleccionar un dataset');
      return;
    }

    if (numTopics < 2 || numTopics > 100) {
      showError('El número de temas debe estar entre 2 y 100');
      return;
    }

    if (numWords < 5 || numWords > 50) {
      showError('El número de palabras debe estar entre 5 y 50');
      return;
    }

    setIsLoading(true);
    try {
      const requestData = {
        name,
        description: description || undefined,
        source_type: sourceType,
        data_preparation: sourceType === 'data_preparation' ? dataPreparationId : undefined,
        dataset: sourceType === 'dataset' ? datasetId : undefined,
        algorithm: selectedAlgorithm,
        num_topics: numTopics,
        num_words: numWords,
        max_iterations: maxIterations,
        random_seed: useRandomSeed && randomSeed !== null ? randomSeed : undefined,
      };

      const result = await topicModelingService.createTopicModeling(requestData);
      showSuccess(`Análisis "${result.name}" creado exitosamente. Procesamiento iniciado.`);
      navigate(`/admin/modelado/topic-modeling/${result.id}`);
    } catch (error: any) {
      showError('Error al crear análisis: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingAlgorithms) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  const selectedAlgorithmInfo = algorithms.find(a => a.id === selectedAlgorithm);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left: Back Button + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/modelado/topic-modeling')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <h1 className="text-xl font-semibold text-gray-900">Crear Análisis de Modelado de Temas</h1>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/modelado/topic-modeling')}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" />
                  Creando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Crear Análisis
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
          <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              Información Básica
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Análisis <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Ej: Modelado de Temas - Papers Transformación Digital 2024"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  placeholder="Describe el propósito de este análisis..."
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: ORIGEN DE DATOS */}
          <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              Origen de Datos
            </h2>

            <div className="space-y-4">
              {/* Radio Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    sourceType === 'data_preparation'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSourceType('data_preparation')}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="sourceType"
                      checked={sourceType === 'data_preparation'}
                      onChange={() => setSourceType('data_preparation')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Desde Preparación de Datos</p>
                      <p className="text-xs text-gray-600 mt-1">Textos preprocesados (recomendado)</p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    sourceType === 'dataset'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSourceType('dataset')}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="sourceType"
                      checked={sourceType === 'dataset'}
                      onChange={() => setSourceType('dataset')}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Desde Dataset Directo</p>
                      <p className="text-xs text-gray-600 mt-1">Textos sin preprocesar</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Select dinámico */}
              {sourceType === 'data_preparation' && (
                <div>
                  <label htmlFor="dataPreparation" className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Preparación de Datos <span className="text-red-500">*</span>
                  </label>
                  {isLoadingPreparations ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Spinner size="sm" />
                      <span className="text-sm">Cargando preparaciones...</span>
                    </div>
                  ) : (
                    <select
                      id="dataPreparation"
                      value={dataPreparationId}
                      onChange={(e) => setDataPreparationId(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    >
                      <option value={0}>Seleccionar preparación...</option>
                      {preparations.map(prep => (
                        <option key={prep.id} value={prep.id}>
                          {prep.name} ({prep.predominant_language?.toUpperCase()}) - {prep.dataset_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {sourceType === 'dataset' && (
                <div>
                  <label htmlFor="dataset" className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Dataset <span className="text-red-500">*</span>
                  </label>
                  {isLoadingDatasets ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Spinner size="sm" />
                      <span className="text-sm">Cargando datasets...</span>
                    </div>
                  ) : (
                    <select
                      id="dataset"
                      value={datasetId}
                      onChange={(e) => setDatasetId(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    >
                      <option value={0}>Seleccionar dataset...</option>
                      {datasets.map(ds => (
                        <option key={ds.id} value={ds.id}>
                          {ds.name} - {ds.total_files} archivos
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 3: ALGORITMO */}
          <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              Seleccionar Algoritmo
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {algorithms.map(algo => {
                const isSelected = selectedAlgorithm === algo.id;
                const isProbabilistic = algo.category === 'Probabilistic';
                const borderColor = isSelected
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300';
                const badgeColor = isProbabilistic
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700';

                return (
                  <div
                    key={algo.id}
                    className={`p-5 border-2 rounded-lg cursor-pointer transition-all ${borderColor}`}
                    onClick={() => setSelectedAlgorithm(algo.id as TopicModelingAlgorithm)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{algo.name}</h3>
                        <p className="text-xs text-gray-500">{algo.full_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
                        {algo.category === 'Probabilistic' ? 'Probabilístico' : 'No Probabilístico'}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{algo.description}</p>

                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 mb-1">✅ Ventajas</p>
                        <ul className="text-xs text-gray-600 space-y-0.5">
                          {algo.pros.map((pro, idx) => (
                            <li key={idx}>• {pro}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-red-700 mb-1">⚠️ Limitaciones</p>
                        <ul className="text-xs text-gray-600 space-y-0.5">
                          {algo.cons.map((con, idx) => (
                            <li key={idx}>• {con}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-1">📌 Casos de Uso</p>
                        <p className="text-xs text-gray-600">{algo.use_cases}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN 4: CONFIGURACIÓN */}
          <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              Configuración de Parámetros
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">¿Qué es el Modelado de Temas?</p>
                  <p>
                    Es una técnica de PLN que identifica automáticamente temas ocultos en un conjunto de documentos.
                    Cada tema es un grupo de palabras relacionadas semánticamente. Por ejemplo, un tema podría ser
                    "educación digital" con palabras como: tecnología, aprendizaje, virtual, plataforma, estudiantes.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Número de Temas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="numTopics" className="block text-sm font-medium text-gray-700">
                    Número de Temas <span className="text-red-500">*</span>
                  </label>
                  <span className="text-sm font-semibold text-emerald-600">{numTopics} temas</span>
                </div>
                <input
                  type="range"
                  id="numTopics"
                  min="2"
                  max="100"
                  step="1"
                  value={numTopics}
                  onChange={(e) => setNumTopics(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>2</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 mt-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">💡 ¿Cuántos temas elegir?</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• <strong>2-5 temas:</strong> Para corpus muy enfocados en un tema específico</li>
                    <li>• <strong>5-15 temas:</strong> Para datasets pequeños (100-500 documentos). Balance ideal entre especificidad y generalidad</li>
                    <li>• <strong>15-30 temas:</strong> Para datasets medianos (500-2000 documentos)</li>
                    <li>• <strong>30-50 temas:</strong> Para datasets grandes (2000+ documentos). Mayor granularidad en los temas</li>
                    <li>• <strong>Más de 50:</strong> Solo para corpus muy grandes y diversos. Puede producir temas muy específicos o redundantes</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Consejo: Empieza con menos temas y aumenta gradualmente si necesitas más detalle.
                  </p>
                </div>
              </div>

              {/* Número de Palabras por Tema */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="numWords" className="block text-sm font-medium text-gray-700">
                    Palabras por Tema <span className="text-red-500">*</span>
                  </label>
                  <span className="text-sm font-semibold text-emerald-600">{numWords} palabras</span>
                </div>
                <input
                  type="range"
                  id="numWords"
                  min="5"
                  max="50"
                  step="1"
                  value={numWords}
                  onChange={(e) => setNumWords(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5</span>
                  <span>15</span>
                  <span>25</span>
                  <span>35</span>
                  <span>50</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 mt-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">💡 ¿Cuántas palabras mostrar?</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• <strong>5-8 palabras:</strong> Vista compacta. Ideal para presentaciones o resúmenes ejecutivos</li>
                    <li>• <strong>10-15 palabras:</strong> Balance óptimo (recomendado). Suficientes palabras para interpretar el tema sin ruido</li>
                    <li>• <strong>20-30 palabras:</strong> Vista detallada. Útil para análisis profundo o validación de temas</li>
                    <li>• <strong>Más de 30:</strong> Puede incluir palabras menos relevantes que dificultan la interpretación</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Las palabras se ordenan por importancia (peso). Las primeras 5-10 son las más representativas del tema.
                  </p>
                </div>
              </div>

              {/* Configuración Avanzada */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Configuración Avanzada (Opcional)</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Para usuarios experimentados</span>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Max Iterations */}
                  <div>
                    <label htmlFor="maxIterations" className="block text-sm font-medium text-gray-700 mb-2">
                      Máximo de Iteraciones
                    </label>
                    <input
                      type="number"
                      id="maxIterations"
                      min="100"
                      max="10000"
                      step="100"
                      value={maxIterations}
                      onChange={(e) => setMaxIterations(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      disabled={selectedAlgorithmInfo?.category !== 'Probabilistic'}
                    />
                    {selectedAlgorithmInfo?.category === 'Probabilistic' ? (
                      <div className="bg-purple-50 rounded-lg p-3 mt-2">
                        <p className="text-xs font-semibold text-purple-800 mb-1">📊 ¿Qué es la convergencia?</p>
                        <p className="text-xs text-purple-700 mb-2">
                          Los algoritmos probabilísticos (PLSA/LDA) mejoran gradualmente en cada iteración. La convergencia
                          ocurre cuando el modelo deja de mejorar significativamente.
                        </p>
                        <ul className="text-xs text-purple-700 space-y-1">
                          <li>• <strong>100-500:</strong> Rápido pero puede no converger completamente</li>
                          <li>• <strong>1000 (recomendado):</strong> Balance entre calidad y tiempo de procesamiento</li>
                          <li>• <strong>2000-5000:</strong> Mayor calidad, útil para datasets complejos</li>
                          <li>• <strong>Más de 5000:</strong> Generalmente innecesario, incrementa tiempo sin mejoras</li>
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        ⚠️ Este parámetro solo aplica para algoritmos probabilísticos (PLSA/LDA).
                        LSA y NMF no usan iteraciones, calculan tópicos directamente mediante descomposición matricial.
                      </p>
                    )}
                  </div>

                  {/* Random Seed */}
                  <div>
                    <label htmlFor="randomSeed" className="block text-sm font-medium text-gray-700 mb-2">
                      Semilla Aleatoria (Random Seed)
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="useRandomSeed"
                        checked={useRandomSeed}
                        onChange={(e) => {
                          setUseRandomSeed(e.target.checked);
                          if (e.target.checked && randomSeed === null) {
                            setRandomSeed(42);
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor="useRandomSeed" className="text-sm text-gray-700">
                        Activar reproducibilidad de resultados
                      </label>
                    </div>
                    {useRandomSeed && (
                      <input
                        type="number"
                        id="randomSeed"
                        value={randomSeed || 42}
                        onChange={(e) => setRandomSeed(Number(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Ej: 42, 123, 2024"
                      />
                    )}
                    <div className="bg-amber-50 rounded-lg p-3 mt-2">
                      <p className="text-xs font-semibold text-amber-800 mb-1">🔄 ¿Qué es la reproducibilidad?</p>
                      <p className="text-xs text-amber-700 mb-2">
                        Los algoritmos de topic modeling incluyen componentes aleatorios en su inicialización.
                        Usar una semilla fija garantiza obtener exactamente los mismos resultados en múltiples ejecuciones.
                      </p>
                      <div className="text-xs text-amber-700 space-y-1">
                        <p><strong>✅ Activa la semilla cuando:</strong></p>
                        <ul className="ml-4 space-y-0.5">
                          <li>• Necesites comparar diferentes configuraciones de forma justa</li>
                          <li>• Quieras replicar análisis para validación o publicación</li>
                          <li>• Estés debuggeando o experimentando con parámetros</li>
                        </ul>
                        <p className="mt-2"><strong>❌ Desactiva la semilla cuando:</strong></p>
                        <ul className="ml-4 space-y-0.5">
                          <li>• Busques explorar diferentes inicializaciones aleatorias</li>
                          <li>• No te importe la reproducibilidad exacta</li>
                        </ul>
                      </div>
                      <p className="text-xs text-amber-600 mt-2 italic">
                        💡 Números comunes: 42 (convención), 123, año actual (2024), o cualquier número entero.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button (Mobile) */}
          <div className="flex items-center justify-end gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => navigate('/admin/modelado/topic-modeling')}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" />
                  Creando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Crear Análisis
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
