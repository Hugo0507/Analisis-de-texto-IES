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
import datasetService from '../services/datasetService';
import type { DataPreparationListItem } from '../services/dataPreparationService';
import type { DatasetListItem } from '../services/datasetService';
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
      const data = await datasetService.getDatasets();
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
                          {prep.name} ({prep.predominant_language?.toUpperCase()}) - {prep.files_processed} archivos
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
              Modelo spaCy
            </h2>

            <div>
              <label htmlFor="spacyModel" className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Modelo <span className="text-red-500">*</span>
              </label>
              <select
                id="spacyModel"
                value={spacyModel}
                onChange={(e) => setSpacyModel(e.target.value as SpacyModel)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              >
                <option value="en_core_web_sm">Inglés (Pequeño) - en_core_web_sm ⭐ Recomendado</option>
                <option value="en_core_web_md">Inglés (Mediano) - en_core_web_md</option>
                <option value="en_core_web_lg">Inglés (Grande) - en_core_web_lg</option>
                <option value="es_core_news_sm">Español (Pequeño) - es_core_news_sm</option>
                <option value="es_core_news_md">Español (Mediano) - es_core_news_md</option>
                <option value="es_core_news_lg">Español (Grande) - es_core_news_lg</option>
              </select>

              {/* Descripción del modelo */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Modelo seleccionado:</strong> {spacyModel}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {spacyModel.startsWith('en_') && (
                    <>Idioma: Inglés - Detecta 18 tipos de entidades (PERSON, ORG, GPE, DATE, MONEY, etc.)</>
                  )}
                  {spacyModel.startsWith('es_') && (
                    <>Idioma: Español - Detecta 4 tipos de entidades (PER, ORG, LOC, MISC)</>
                  )}
                </p>
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
