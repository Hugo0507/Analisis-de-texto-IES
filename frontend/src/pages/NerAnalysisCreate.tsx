/**
 * NerAnalysisCreate Page - Crear Análisis NER
 *
 * Formulario para crear nuevo análisis de Reconocimiento de Entidades Nombradas.
 * 4 secciones: Info Básica, Origen de Datos, Modelo spaCy, Selección de Entidades
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import nerAnalysisService from '../services/nerAnalysisService';
import dataPreparationService from '../services/dataPreparationService';
import datasetsService from '../services/datasetsService';
import type { DataPreparationListItem } from '../services/dataPreparationService';
import type { DatasetListItem } from '../services/datasetsService';
import type { EntityGroup, EntityType, SpacyModel, NerSourceType } from '../services/nerAnalysisService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

export const NerAnalysisCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Estados de carga
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreparations, setIsLoadingPreparations] = useState(false);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [isLoadingEntityTypes, setIsLoadingEntityTypes] = useState(false);
  const [isLoadingEntityGroups, setIsLoadingEntityGroups] = useState(true);

  // Sección 1: Información Básica
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Sección 2: Origen de Datos
  const [sourceType, setSourceType] = useState<NerSourceType>('data_preparation');
  const [preparations, setPreparations] = useState<DataPreparationListItem[]>([]);
  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [dataPreparationId, setDataPreparationId] = useState<number>(0);
  const [datasetId, setDatasetId] = useState<number>(0);

  // Sección 3: Modelo spaCy
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'es'>('en');
  const [selectedModelSize, setSelectedModelSize] = useState<'small' | 'medium' | 'large' | 'transformer'>('small');
  const [spacyModel, setSpacyModel] = useState<SpacyModel>('en_core_web_sm');

  // Sección 4: Selección de Entidades
  const [entityGroups, setEntityGroups] = useState<EntityGroup[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    loadEntityGroups();
    loadPreparations();
  }, []);

  useEffect(() => {
    if (sourceType === 'dataset' && datasets.length === 0) {
      loadDatasets();
    }
  }, [sourceType]);

  // Actualizar spacyModel cuando cambie idioma o tamaño
  useEffect(() => {
    let model: SpacyModel;
    if (selectedLanguage === 'en') {
      switch (selectedModelSize) {
        case 'small': model = 'en_core_web_sm'; break;
        case 'medium': model = 'en_core_web_md'; break;
        case 'large': model = 'en_core_web_lg'; break;
        case 'transformer': model = 'en_core_web_trf'; break;
        default: model = 'en_core_web_sm';
      }
    } else {
      switch (selectedModelSize) {
        case 'small': model = 'es_core_news_sm'; break;
        case 'medium': model = 'es_core_news_md'; break;
        case 'large': model = 'es_core_news_lg'; break;
        default: model = 'es_core_news_sm';
      }
    }
    setSpacyModel(model);
  }, [selectedLanguage, selectedModelSize]);

  useEffect(() => {
    loadEntityTypes(spacyModel);
  }, [spacyModel]);

  const loadEntityGroups = async () => {
    setIsLoadingEntityGroups(true);
    try {
      const response = await nerAnalysisService.getEntityGroups();
      setEntityGroups(response.groups);
    } catch (error: any) {
      showError('Error al cargar grupos de entidades: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoadingEntityGroups(false);
    }
  };

  const loadEntityTypes = async (model: SpacyModel) => {
    setIsLoadingEntityTypes(true);
    try {
      const response = await nerAnalysisService.getEntityTypes(model);
      setEntityTypes(response.entities);
    } catch (error: any) {
      showError('Error al cargar tipos de entidades: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoadingEntityTypes(false);
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

  const handleGroupSelect = (groupId: string) => {
    const group = entityGroups.find(g => g.id === groupId);
    if (!group) return;

    setSelectedGroupId(groupId);
    setSelectedEntityTypes(new Set(group.entities));
  };

  const toggleEntityType = (entityType: string) => {
    setSelectedEntityTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entityType)) {
        newSet.delete(entityType);
      } else {
        newSet.add(entityType);
      }
      return newSet;
    });
    // Clear group selection when manually toggling
    setSelectedGroupId(null);
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

    if (selectedEntityTypes.size === 0) {
      showError('Debes seleccionar al menos un tipo de entidad');
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
        spacy_model: spacyModel,
        selected_entities: Array.from(selectedEntityTypes),
      };

      const result = await nerAnalysisService.createNerAnalysis(requestData);
      showSuccess(`Análisis "${result.name}" creado exitosamente. Procesamiento iniciado.`);
      navigate(`/admin/modelado/ner/${result.id}`);
    } catch (error: any) {
      showError('Error al crear análisis: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingEntityGroups) {
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
          {/* Left: Back Button + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/modelado/ner')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <h1 className="text-xl font-semibold text-gray-900">Crear Análisis NER</h1>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/modelado/ner')}
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
                  placeholder="Ej: Análisis de Entidades - Papers 2024"
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

          {/* SECCIÓN 3: MODELO SPACY */}
          <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              Configuración del Modelo
            </h2>

            <div className="space-y-6">
              {/* Selects de Idioma y Modelo */}
              <div className="grid grid-cols-2 gap-4">
                {/* Select de Idioma */}
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                    Idioma <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="language"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as 'en' | 'es')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  >
                    <option value="en">Inglés (English)</option>
                    <option value="es" disabled>Español (Próximamente)</option>
                  </select>
                </div>

                {/* Select de Modelo */}
                <div>
                  <label htmlFor="modelSize" className="block text-sm font-medium text-gray-700 mb-2">
                    Tamaño del Modelo <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="modelSize"
                    value={selectedModelSize}
                    onChange={(e) => setSelectedModelSize(e.target.value as any)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                    disabled={selectedLanguage === 'es'}
                  >
                    <option value="small">Modelo Pequeño ⭐</option>
                    <option value="medium">Modelo Mediano</option>
                    <option value="large">Modelo Grande</option>
                    <option value="transformer">Alta Precisión (Transformer)</option>
                  </select>
                </div>
              </div>

              {/* Cards Informativas de Modelos - Solo para Inglés */}
              {selectedLanguage === 'en' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Características del Modelo</h3>

                  {/* Modelo Pequeño */}
                  {selectedModelSize === 'small' && (
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="bg-emerald-500 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">Modelo Pequeño (Recomendado)</h4>
                          <p className="text-sm text-gray-700 mb-2">
                            Ideal para comenzar y análisis rápidos. Balance perfecto entre velocidad y precisión.
                          </p>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Tamaño</p>
                              <p className="text-sm font-semibold text-gray-900">~12 MB</p>
                            </div>
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Velocidad</p>
                              <p className="text-sm font-semibold text-emerald-700">⚡ Muy Rápido</p>
                            </div>
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Precisión</p>
                              <p className="text-sm font-semibold text-gray-900">~85%</p>
                            </div>
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Entidades</p>
                              <p className="text-sm font-semibold text-gray-900">18 tipos</p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-emerald-200">
                            <p className="text-xs font-medium text-gray-600 mb-1">✅ Ventajas</p>
                            <ul className="text-xs text-gray-700 space-y-1">
                              <li>• Procesamiento rápido incluso con muchos documentos</li>
                              <li>• Bajo consumo de memoria y recursos</li>
                              <li>• Excelente para datasets grandes</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modelo Mediano */}
                  {selectedModelSize === 'medium' && (
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">Modelo Mediano</h4>
                          <p className="text-sm text-gray-700 mb-2">
                            Balance ideal entre precisión y rendimiento. Incluye vectores de palabras.
                          </p>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Tamaño</p>
                              <p className="text-sm font-semibold text-gray-900">~40 MB</p>
                            </div>
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Velocidad</p>
                              <p className="text-sm font-semibold text-blue-700">⚡ Rápido</p>
                            </div>
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Precisión</p>
                              <p className="text-sm font-semibold text-gray-900">~88%</p>
                            </div>
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Entidades</p>
                              <p className="text-sm font-semibold text-gray-900">18 tipos</p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-blue-200">
                            <p className="text-xs font-medium text-gray-600 mb-1">✅ Ventajas</p>
                            <ul className="text-xs text-gray-700 space-y-1">
                              <li>• Mejor precisión en entidades ambiguas</li>
                              <li>• Incluye vectores de palabras de 300 dimensiones</li>
                              <li>• Buen rendimiento general</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modelo Grande */}
                  {selectedModelSize === 'large' && (
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="bg-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">Modelo Grande</h4>
                          <p className="text-sm text-gray-700 mb-2">
                            Máxima precisión con modelos tradicionales. Vectores de palabras extensos.
                          </p>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Tamaño</p>
                              <p className="text-sm font-semibold text-gray-900">~560 MB</p>
                            </div>
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Velocidad</p>
                              <p className="text-sm font-semibold text-orange-700">⚡ Moderado</p>
                            </div>
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Precisión</p>
                              <p className="text-sm font-semibold text-gray-900">~90%</p>
                            </div>
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Entidades</p>
                              <p className="text-sm font-semibold text-gray-900">18 tipos</p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-purple-200">
                            <p className="text-xs font-medium text-gray-600 mb-1">✅ Ventajas</p>
                            <ul className="text-xs text-gray-700 space-y-1">
                              <li>• Alta precisión en detección de entidades</li>
                              <li>• Vectores de palabras de 685,000+ términos</li>
                              <li>• Mejor comprensión del contexto</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modelo Transformer */}
                  {selectedModelSize === 'transformer' && (
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">Alta Precisión (Transformer)</h4>
                          <p className="text-sm text-gray-700 mb-2">
                            Modelo basado en arquitectura Transformer (RoBERTa). Máxima precisión disponible.
                          </p>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Tamaño</p>
                              <p className="text-sm font-semibold text-gray-900">~438 MB</p>
                            </div>
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Velocidad</p>
                              <p className="text-sm font-semibold text-red-700">⚡ Lento</p>
                            </div>
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Precisión</p>
                              <p className="text-sm font-semibold text-amber-700">~92-94% 🏆</p>
                            </div>
                            <div className="bg-white/60 p-2 rounded">
                              <p className="text-xs font-medium text-gray-600">Entidades</p>
                              <p className="text-sm font-semibold text-gray-900">18 tipos</p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-amber-200">
                            <p className="text-xs font-medium text-gray-600 mb-1">✅ Ventajas</p>
                            <ul className="text-xs text-gray-700 space-y-1">
                              <li>• Máxima precisión en NER disponible</li>
                              <li>• Excelente comprensión contextual</li>
                              <li>• Ideal para datasets pequeños de alta calidad</li>
                            </ul>
                            <p className="text-xs font-medium text-gray-600 mb-1 mt-2">⚠️ Consideraciones</p>
                            <ul className="text-xs text-gray-700 space-y-1">
                              <li>• Requiere más tiempo de procesamiento</li>
                              <li>• Mayor uso de memoria (~2-3x más que otros modelos)</li>
                              <li>• Recomendado para análisis críticos</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mensaje para Español */}
              {selectedLanguage === 'es' && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Los modelos en español estarán disponibles próximamente. Por ahora, utiliza los modelos en inglés.
                  </p>
                </div>
              )}

              {/* Modelo técnico seleccionado (info) */}
              <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
                Modelo técnico: <code className="bg-gray-100 px-2 py-1 rounded">{spacyModel}</code>
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: SELECCIÓN DE ENTIDADES */}
          <div className="bg-white p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              Selección de Entidades
            </h2>

            {/* PARTE A: Grupos Predefinidos */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Grupos Predefinidos</h3>
              <div className="grid grid-cols-3 gap-4">
                {entityGroups.map(group => (
                  <div
                    key={group.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedGroupId === group.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleGroupSelect(group.id)}
                  >
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{group.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{group.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{group.entities.length} tipos</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PARTE B: Personalización Individual */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Personalización Individual ({selectedEntityTypes.size} seleccionadas)
              </h3>
              {isLoadingEntityTypes ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <Spinner size="sm" />
                  <span className="text-sm">Cargando tipos de entidades...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {entityTypes.map(entityType => (
                    <div
                      key={entityType.type}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedEntityTypes.has(entityType.type)
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleEntityType(entityType.type)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedEntityTypes.has(entityType.type)}
                          onChange={() => toggleEntityType(entityType.type)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{entityType.label}</p>
                          <p className="text-xs text-gray-600 mt-1">{entityType.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Ej: {entityType.examples}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button (Mobile) */}
          <div className="flex items-center justify-end gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => navigate('/admin/modelado/ner')}
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
