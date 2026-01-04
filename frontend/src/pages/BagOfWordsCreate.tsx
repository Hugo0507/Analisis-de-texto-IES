/**
 * BagOfWordsCreate Page - Crear Análisis de Bolsa de Palabras
 *
 * Formulario para crear nuevo análisis BoW.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import bagOfWordsService from '../services/bagOfWordsService';
import dataPreparationService from '../services/dataPreparationService';
import type { BagOfWordsCreateRequest } from '../services/bagOfWordsService';
import type { DataPreparationListItem } from '../services/dataPreparationService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

export const BagOfWordsCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Estados
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreparations, setIsLoadingPreparations] = useState(true);
  const [preparations, setPreparations] = useState<DataPreparationListItem[]>([]);

  // Formulario
  const [formData, setFormData] = useState<BagOfWordsCreateRequest>({
    name: '',
    description: '',
    data_preparation: 0,
    vectorization_method: 'tfidf',
    max_features: 1000,
    min_df: 1,
    max_df: 1.0,
    ngram_min: 1,
    ngram_max: 1,
    use_idf: true,
    sublinear_tf: false,
  });

  useEffect(() => {
    loadPreparations();
  }, []);

  const loadPreparations = async () => {
    setIsLoadingPreparations(true);
    try {
      const data = await dataPreparationService.getPreparations();
      // Filtrar solo las preparaciones completadas
      const completedPreps = data.filter(prep => prep.status === 'completed');
      setPreparations(completedPreps);
    } catch (error: any) {
      showError('Error al cargar preparaciones: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoadingPreparations(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.name.trim()) {
      showError('El nombre es requerido');
      return;
    }

    if (formData.data_preparation === 0) {
      showError('Debes seleccionar una preparación de datos');
      return;
    }

    if (formData.max_features <= 0) {
      showError('El número máximo de features debe ser mayor a 0');
      return;
    }

    if (formData.min_df < 1) {
      showError('La frecuencia mínima debe ser al menos 1');
      return;
    }

    if (formData.max_df <= 0 || formData.max_df > 1) {
      showError('La frecuencia máxima debe estar entre 0 y 1');
      return;
    }

    if (formData.ngram_min < 1) {
      showError('El n-grama mínimo debe ser al menos 1');
      return;
    }

    if (formData.ngram_max < formData.ngram_min) {
      showError('El n-grama máximo debe ser mayor o igual al mínimo');
      return;
    }

    setIsLoading(true);
    try {
      const created = await bagOfWordsService.createBagOfWords(formData);
      showSuccess('Análisis creado exitosamente. El procesamiento comenzará en segundos...');
      navigate(`/admin/preprocesamiento/bolsa-palabras/${created.id}`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error
        || error.response?.data?.detail
        || error.response?.data?.data_preparation?.[0]
        || error.message;
      showError('Error al crear análisis: ' + errorMsg);
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
              onClick={() => navigate('/admin/preprocesamiento/bolsa-palabras')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Crear Análisis de Bolsa de Palabras</h1>
          </div>
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
                No hay preparaciones de datos completadas
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Primero debes completar una preparación de datos antes de crear un análisis de Bolsa de Palabras
              </p>
              <button
                onClick={() => navigate('/admin/preprocesamiento/preparacion-datos/nuevo')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium shadow-md"
              >
                Crear Preparación de Datos
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white p-8" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
              {/* Información Básica */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  Información Básica
                </h2>

                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Análisis *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Ej: Análisis BoW - Dataset Marketing 2024"
                    />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción (opcional)
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Describe el propósito de este análisis..."
                    />
                  </div>
                </div>
              </div>

              {/* Selección de Preparación */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  Datos Preprocesados
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Preparación de Datos *
                  </label>
                  <select
                    name="data_preparation"
                    value={formData.data_preparation}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value={0}>-- Selecciona una preparación --</option>
                    {preparations.map(prep => (
                      <option key={prep.id} value={prep.id}>
                        {prep.name} ({prep.dataset_name}) - {prep.predominant_language || 'Sin idioma'}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Selecciona una preparación de datos completada para crear el análisis BoW
                  </p>
                </div>
              </div>

              {/* Configuración de Vectorización */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  Configuración de Vectorización
                </h2>

                <div className="space-y-4">
                  {/* Método de Vectorización */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de Vectorización *
                    </label>
                    <select
                      name="vectorization_method"
                      value={formData.vectorization_method}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="tfidf">TF-IDF Vectorizer (Importancia)</option>
                      <option value="count">Count Vectorizer (Frecuencias)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      {formData.vectorization_method === 'tfidf'
                        ? 'Calcula la importancia de cada término basándose en TF-IDF'
                        : 'Cuenta las frecuencias de cada término en los documentos'}
                    </p>
                  </div>

                  {/* Max Features */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número Máximo de Features (Palabras) *
                    </label>
                    <input
                      type="number"
                      name="max_features"
                      value={formData.max_features}
                      onChange={handleChange}
                      min={1}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Máximo número de palabras/términos a considerar en el vocabulario
                    </p>
                  </div>

                  {/* Min DF y Max DF en Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Min DF */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frecuencia Mínima (min_df) *
                      </label>
                      <input
                        type="number"
                        name="min_df"
                        value={formData.min_df}
                        onChange={handleChange}
                        min={1}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Ignorar términos en menos de N documentos
                      </p>
                    </div>

                    {/* Max DF */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frecuencia Máxima (max_df) *
                      </label>
                      <input
                        type="number"
                        name="max_df"
                        value={formData.max_df}
                        onChange={handleChange}
                        min={0}
                        max={1}
                        step={0.1}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Ignorar términos en más de % documentos (0-1)
                      </p>
                    </div>
                  </div>

                  {/* N-gramas en Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Ngram Min */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        N-grama Mínimo *
                      </label>
                      <input
                        type="number"
                        name="ngram_min"
                        value={formData.ngram_min}
                        onChange={handleChange}
                        min={1}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        1 = unigramas (palabras individuales)
                      </p>
                    </div>

                    {/* Ngram Max */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        N-grama Máximo *
                      </label>
                      <input
                        type="number"
                        name="ngram_max"
                        value={formData.ngram_max}
                        onChange={handleChange}
                        min={1}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        2 = bigramas, 3 = trigramas, etc.
                      </p>
                    </div>
                  </div>

                  {/* Opciones TF-IDF */}
                  {formData.vectorization_method === 'tfidf' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-purple-900 mb-2">Opciones TF-IDF</h3>

                      {/* Use IDF */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="use_idf"
                          name="use_idf"
                          checked={formData.use_idf}
                          onChange={handleChange}
                          className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="use_idf" className="ml-2 text-sm text-gray-700">
                          Usar IDF (Inverse Document Frequency)
                        </label>
                      </div>

                      {/* Sublinear TF */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="sublinear_tf"
                          name="sublinear_tf"
                          checked={formData.sublinear_tf}
                          onChange={handleChange}
                          className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="sublinear_tf" className="ml-2 text-sm text-gray-700">
                          Usar escala logarítmica para TF
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/admin/preprocesamiento/bolsa-palabras')}
                  disabled={isLoading}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" />
                      Creando...
                    </>
                  ) : (
                    'Crear Análisis BoW'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
