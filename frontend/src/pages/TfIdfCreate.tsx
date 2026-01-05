/**
 * TfIdfCreate Page - Crear Análisis TF-IDF
 *
 * Formulario para crear nuevo análisis TF-IDF desde múltiples fuentes.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import tfidfAnalysisService from '../services/tfidfAnalysisService';
import dataPreparationService from '../services/dataPreparationService';
import bagOfWordsService from '../services/bagOfWordsService';
import ngramAnalysisService from '../services/ngramAnalysisService';
import type { DataPreparationListItem } from '../services/dataPreparationService';
import type { BagOfWordsListItem } from '../services/bagOfWordsService';
import type { NgramAnalysisListItem } from '../services/ngramAnalysisService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

type SourceType = 'data_preparation' | 'bag_of_words' | 'ngram_config' | 'ngram_all' | 'ngram_vocabulary';

export const TfIdfCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('data_preparation');

  // Source options
  const [dataPreparations, setDataPreparations] = useState<DataPreparationListItem[]>([]);
  const [bagOfWordsAnalyses, setBagOfWordsAnalyses] = useState<BagOfWordsListItem[]>([]);
  const [ngramAnalyses, setNgramAnalyses] = useState<NgramAnalysisListItem[]>([]);

  // Selected source
  const [selectedDataPreparation, setSelectedDataPreparation] = useState<number>(0);
  const [selectedBagOfWords, setSelectedBagOfWords] = useState<number>(0);
  const [selectedNgramAnalysis, setSelectedNgramAnalysis] = useState<number>(0);
  const [selectedNgramConfig, setSelectedNgramConfig] = useState<string>('');

  // TF-IDF parameters
  const [maxFeatures, setMaxFeatures] = useState(100000);
  const [minDf, setMinDf] = useState(1);
  const [maxDf, setMaxDf] = useState(1.0);
  const [ngramMin, setNgramMin] = useState(1);
  const [ngramMax, setNgramMax] = useState(2);
  const [useIdf, setUseIdf] = useState(true);
  const [smoothIdf, setSmoothIdf] = useState(true);
  const [sublinearTf, setSublinearTf] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoadingData(true);
    try {
      const [preps, bows, ngrams] = await Promise.all([
        dataPreparationService.getPreparations(),
        bagOfWordsService.getBagOfWords(),
        ngramAnalysisService.getNgramAnalyses(),
      ]);

      setDataPreparations(preps.filter((p: DataPreparationListItem) => p.status === 'completed'));
      setBagOfWordsAnalyses(bows.filter((b: BagOfWordsListItem) => b.status === 'completed'));
      setNgramAnalyses(ngrams.filter((n: NgramAnalysisListItem) => n.status === 'completed'));
    } catch (error: any) {
      showError('Error al cargar datos: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoadingData(false);
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

    // Validar selección de origen
    if (sourceType === 'data_preparation' && selectedDataPreparation === 0) {
      showError('Debes seleccionar una preparación de datos');
      return;
    }
    if (sourceType === 'bag_of_words' && selectedBagOfWords === 0) {
      showError('Debes seleccionar un análisis de Bolsa de Palabras');
      return;
    }
    if ((sourceType === 'ngram_config' || sourceType === 'ngram_all' || sourceType === 'ngram_vocabulary') && selectedNgramAnalysis === 0) {
      showError('Debes seleccionar un análisis de N-gramas');
      return;
    }
    if (sourceType === 'ngram_config' && !selectedNgramConfig) {
      showError('Debes seleccionar una configuración específica de N-gramas');
      return;
    }

    setIsLoading(true);
    try {
      const requestData: any = {
        name,
        description: description || undefined,
        source_type: sourceType,
        max_features: maxFeatures,
        min_df: minDf,
        max_df: maxDf,
        ngram_min: ngramMin,
        ngram_max: ngramMax,
        use_idf: useIdf,
        smooth_idf: smoothIdf,
        sublinear_tf: sublinearTf,
      };

      // Agregar el origen correspondiente
      if (sourceType === 'data_preparation') {
        requestData.data_preparation = selectedDataPreparation;
      } else if (sourceType === 'bag_of_words') {
        requestData.bag_of_words = selectedBagOfWords;
      } else if (sourceType === 'ngram_config') {
        requestData.ngram_analysis = selectedNgramAnalysis;
        requestData.ngram_config = selectedNgramConfig;
      } else if (sourceType === 'ngram_all') {
        requestData.ngram_analysis = selectedNgramAnalysis;
      } else if (sourceType === 'ngram_vocabulary') {
        requestData.ngram_analysis = selectedNgramAnalysis;
      }

      const created = await tfidfAnalysisService.createTfIdfAnalysis(requestData);

      showSuccess(`Análisis TF-IDF "${created.name}" creado exitosamente`);
      navigate(`/admin/vectorizacion/tf-idf/${created.id}`);
    } catch (error: any) {
      showError('Error al crear análisis: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Get available ngram configs for selected ngram analysis
  const getAvailableNgramConfigs = () => {
    const selected = ngramAnalyses.find(n => n.id === selectedNgramAnalysis);
    if (!selected) return [];

    // Aquí asumimos que el backend devuelve las configuraciones disponibles
    // Si no, necesitarás cargar los detalles del análisis
    return [
      { value: '1_1', label: '(1, 1) - Solo Unigramas' },
      { value: '1_2', label: '(1, 2) - Unigramas + Bigramas' },
      { value: '1_3', label: '(1, 3) - Hasta Trigramas' },
      { value: '2_2', label: '(2, 2) - Solo Bigramas' },
      { value: '2_3', label: '(2, 3) - Bigramas + Trigramas' },
      { value: '3_3', label: '(3, 3) - Solo Trigramas' },
    ];
  };

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
              onClick={() => navigate('/admin/vectorizacion/tf-idf')}
              className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Crear Análisis TF-IDF</h1>
              <p className="text-sm text-gray-500">Matriz TF-IDF desde múltiples fuentes</p>
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
                  placeholder="Ej: TF-IDF - Dataset Tesis"
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
                  placeholder="Describe el propósito de este análisis..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Tipo de Origen */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Origen de Datos</h2>
              <p className="text-sm text-gray-600 mb-4">
                Selecciona desde dónde deseas crear el análisis TF-IDF
              </p>

              {/* Source Type Selector */}
              <div className="grid grid-cols-1 gap-3 mb-4">
                {/* Data Preparation */}
                <div
                  onClick={() => setSourceType('data_preparation')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    sourceType === 'data_preparation'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={sourceType === 'data_preparation'}
                      onChange={() => setSourceType('data_preparation')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Desde Preparación de Datos</p>
                      <p className="text-xs text-gray-600 mt-1">Crear TF-IDF directamente desde textos procesados</p>
                    </div>
                  </div>
                </div>

                {/* Bag of Words */}
                <div
                  onClick={() => setSourceType('bag_of_words')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    sourceType === 'bag_of_words'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={sourceType === 'bag_of_words'}
                      onChange={() => setSourceType('bag_of_words')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Desde Bolsa de Palabras</p>
                      <p className="text-xs text-gray-600 mt-1">Reutilizar vocabulario de un análisis BoW existente</p>
                    </div>
                  </div>
                </div>

                {/* N-gram Config */}
                <div
                  onClick={() => setSourceType('ngram_config')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    sourceType === 'ngram_config'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={sourceType === 'ngram_config'}
                      onChange={() => setSourceType('ngram_config')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Desde Configuración Específica de N-gramas</p>
                      <p className="text-xs text-gray-600 mt-1">Usar vocabulario de una configuración específica (ej: solo bigramas)</p>
                    </div>
                  </div>
                </div>

                {/* N-gram All */}
                <div
                  onClick={() => setSourceType('ngram_all')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    sourceType === 'ngram_all'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={sourceType === 'ngram_all'}
                      onChange={() => setSourceType('ngram_all')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Desde Todas las Configuraciones de N-gramas</p>
                      <p className="text-xs text-gray-600 mt-1">Combinar vocabularios de todas las configuraciones analizadas</p>
                    </div>
                  </div>
                </div>

                {/* N-gram Vocabulary */}
                <div
                  onClick={() => setSourceType('ngram_vocabulary')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    sourceType === 'ngram_vocabulary'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={sourceType === 'ngram_vocabulary'}
                      onChange={() => setSourceType('ngram_vocabulary')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Desde Vocabulario Total Único de N-gramas</p>
                      <p className="text-xs text-gray-600 mt-1">Usar el vocabulario total único (unión de todos los términos)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditional Source Selection */}
              {sourceType === 'data_preparation' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Preparación de Datos <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedDataPreparation}
                    onChange={(e) => setSelectedDataPreparation(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  >
                    <option value={0}>Selecciona una preparación...</option>
                    {dataPreparations.map((prep) => (
                      <option key={prep.id} value={prep.id}>
                        {prep.name} ({prep.dataset_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sourceType === 'bag_of_words' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Análisis de Bolsa de Palabras <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBagOfWords}
                    onChange={(e) => setSelectedBagOfWords(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  >
                    <option value={0}>Selecciona un análisis BoW...</option>
                    {bagOfWordsAnalyses.map((bow) => (
                      <option key={bow.id} value={bow.id}>
                        {bow.name} ({bow.data_preparation_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(sourceType === 'ngram_config' || sourceType === 'ngram_all' || sourceType === 'ngram_vocabulary') && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Análisis de N-gramas <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedNgramAnalysis}
                    onChange={(e) => setSelectedNgramAnalysis(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  >
                    <option value={0}>Selecciona un análisis de N-gramas...</option>
                    {ngramAnalyses.map((ngram) => (
                      <option key={ngram.id} value={ngram.id}>
                        {ngram.name} ({ngram.data_preparation_name})
                      </option>
                    ))}
                  </select>

                  {sourceType === 'ngram_config' && selectedNgramAnalysis > 0 && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Configuración Específica <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedNgramConfig}
                        onChange={(e) => setSelectedNgramConfig(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        required
                      >
                        <option value="">Selecciona una configuración...</option>
                        {getAvailableNgramConfigs().map((config) => (
                          <option key={config.value} value={config.value}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Parámetros TF-IDF */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Parámetros TF-IDF</h2>

              {/* N-gram Range */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">N-grama Mínimo</label>
                  <input
                    type="number"
                    min={1}
                    value={ngramMin}
                    onChange={(e) => setNgramMin(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">N-grama Máximo</label>
                  <input
                    type="number"
                    min={1}
                    value={ngramMax}
                    onChange={(e) => setNgramMax(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Max Features, Min DF, Max DF */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máx. Características
                    <span className="ml-1 text-xs text-gray-500" title="Máximo número de términos en el vocabulario">ⓘ</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxFeatures}
                    onChange={(e) => setMaxFeatures(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min DF
                    <span className="ml-1 text-xs text-gray-500" title="Frecuencia mínima de documentos">ⓘ</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={minDf}
                    onChange={(e) => setMinDf(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max DF
                    <span className="ml-1 text-xs text-gray-500" title="Frecuencia máxima de documentos (0.0-1.0)">ⓘ</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={1}
                    value={maxDf}
                    onChange={(e) => setMaxDf(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Boolean Parameters */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="useIdf"
                    checked={useIdf}
                    onChange={(e) => setUseIdf(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="useIdf" className="text-sm text-gray-700 cursor-pointer">
                    <span className="font-medium">Usar IDF</span>
                    <span className="text-xs text-gray-500 ml-2">(Aplicar peso de frecuencia inversa de documentos)</span>
                  </label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="smoothIdf"
                    checked={smoothIdf}
                    onChange={(e) => setSmoothIdf(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="smoothIdf" className="text-sm text-gray-700 cursor-pointer">
                    <span className="font-medium">Suavizar IDF</span>
                    <span className="text-xs text-gray-500 ml-2">(Evitar división por cero en IDF)</span>
                  </label>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="sublinearTf"
                    checked={sublinearTf}
                    onChange={(e) => setSublinearTf(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="sublinearTf" className="text-sm text-gray-700 cursor-pointer">
                    <span className="font-medium">TF Sublinear</span>
                    <span className="text-xs text-gray-500 ml-2">(Aplicar escala logarítmica a TF)</span>
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
