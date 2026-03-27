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
  const [useDefaultConfig, setUseDefaultConfig] = useState(true);

  // Valores por defecto
  const DEFAULT_CONFIG = {
    max_features: 100000, // Sin límite práctico (muy alto)
    min_df: 1,
    max_df: 1.0,
    ngram_min: 1,
    ngram_max: 2,
  };

  // Formulario
  const [formData, setFormData] = useState<BagOfWordsCreateRequest>({
    name: '',
    description: '',
    data_preparation: 0,
    max_features: DEFAULT_CONFIG.max_features,
    min_df: DEFAULT_CONFIG.min_df,
    max_df: DEFAULT_CONFIG.max_df,
    ngram_min: DEFAULT_CONFIG.ngram_min,
    ngram_max: DEFAULT_CONFIG.ngram_max,
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

  const handleConfigToggle = () => {
    const newUseDefault = !useDefaultConfig;
    setUseDefaultConfig(newUseDefault);

    if (newUseDefault) {
      // Restaurar valores por defecto
      setFormData(prev => ({
        ...prev,
        max_features: DEFAULT_CONFIG.max_features,
        min_df: DEFAULT_CONFIG.min_df,
        max_df: DEFAULT_CONFIG.max_df,
        ngram_min: DEFAULT_CONFIG.ngram_min,
        ngram_max: DEFAULT_CONFIG.ngram_max,
      }));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

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
              className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Crear Análisis de Bolsa de Palabras</h1>
              <p className="text-sm text-gray-500">Análisis de frecuencias de palabras usando Count Vectorizer</p>
            </div>
          </div>

          {/* Right: Save Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || formData.data_preparation === 0}
            className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400"
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

              {/* Configuración de Bolsa de Palabras */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  Configuración de Bolsa de Palabras (Count Vectorizer)
                </h2>

                {/* Toggle Configuración */}
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Modo de Configuración</h3>
                      <p className="text-xs text-gray-600">
                        {useDefaultConfig
                          ? '✅ Usando configuración por defecto (recomendado)'
                          : '⚙️ Configuración personalizada'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleConfigToggle}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                        useDefaultConfig ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useDefaultConfig ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {useDefaultConfig && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-xs text-gray-700 font-medium mb-2">Valores por defecto:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• <strong>Palabras:</strong> Todas las encontradas (sin límite)</li>
                        <li>• <strong>Frecuencia mínima:</strong> 1 (incluye palabras que aparecen 1+ veces)</li>
                        <li>• <strong>Frecuencia máxima:</strong> 100% (incluye todas las palabras)</li>
                        <li>• <strong>N-gramas:</strong> 1-2 (palabras individuales + pares de palabras)</li>
                      </ul>
                    </div>
                  )}
                </div>

                {!useDefaultConfig && (
                  <div className="space-y-6">
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
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-900 font-medium mb-1">📊 ¿Qué es esto?</p>
                      <p className="text-xs text-blue-800 mb-2">
                        Define el tamaño máximo de tu vocabulario. El sistema tomará las N palabras más frecuentes de tus documentos.
                      </p>
                      <p className="text-xs text-blue-900 font-medium mb-1">⚙️ ¿Qué pasa si lo cambio?</p>
                      <ul className="text-xs text-blue-800 space-y-1 ml-4">
                        <li><strong>Valor bajo (100-500):</strong> Vocabulario pequeño, análisis rápido, pero pierdes palabras específicas.</li>
                        <li><strong>Valor medio (1000-5000):</strong> Balance óptimo entre detalle y rendimiento.</li>
                        <li><strong>Valor alto (10000+):</strong> Vocabulario completo, análisis detallado, pero más lento y pesado.</li>
                      </ul>
                      <p className="text-xs text-blue-700 mt-2 italic">
                        💡 Ejemplo: Si tienes 50,000 palabras únicas y pones 1000, solo verás las 1000 más frecuentes.
                      </p>
                    </div>
                  </div>

                  {/* Min DF y Max DF */}
                  <div className="space-y-6">
                    {/* Min DF */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frecuencia Mínima de Documento (min_df) *
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
                      <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-xs text-green-900 font-medium mb-1">🔍 ¿Qué es esto?</p>
                        <p className="text-xs text-green-800 mb-2">
                          Elimina palabras que aparecen en muy pocos documentos (raras o poco relevantes).
                        </p>
                        <p className="text-xs text-green-900 font-medium mb-1">⚙️ ¿Qué pasa si lo cambio?</p>
                        <ul className="text-xs text-green-800 space-y-1 ml-4">
                          <li><strong>min_df = 1:</strong> Incluye TODAS las palabras (incluso si aparecen 1 sola vez).</li>
                          <li><strong>min_df = 2:</strong> Ignora palabras que aparecen en 1 solo documento.</li>
                          <li><strong>min_df = 5:</strong> Solo palabras que aparecen en al menos 5 documentos.</li>
                        </ul>
                        <p className="text-xs text-green-700 mt-2 italic">
                          💡 Ejemplo: "typo123" aparece en 1 documento → con min_df=2 se elimina automáticamente.
                        </p>
                      </div>
                    </div>

                    {/* Max DF */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frecuencia Máxima de Documento (max_df) *
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
                      <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-900 font-medium mb-1">🚫 ¿Qué es esto?</p>
                        <p className="text-xs text-amber-800 mb-2">
                          Elimina palabras demasiado comunes (stopwords) que aparecen en casi todos los documentos.
                        </p>
                        <p className="text-xs text-amber-900 font-medium mb-1">⚙️ ¿Qué pasa si lo cambio?</p>
                        <ul className="text-xs text-amber-800 space-y-1 ml-4">
                          <li><strong>max_df = 1.0 (100%):</strong> Incluye TODAS las palabras, incluso las súper comunes.</li>
                          <li><strong>max_df = 0.8 (80%):</strong> Ignora palabras que aparecen en más del 80% de documentos.</li>
                          <li><strong>max_df = 0.5 (50%):</strong> Solo palabras que aparecen en máximo 50% de documentos.</li>
                        </ul>
                        <p className="text-xs text-amber-700 mt-2 italic">
                          💡 Ejemplo: "el", "la", "de" aparecen en 95% documentos → con max_df=0.8 se eliminan.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* N-gramas */}
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
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
                      </div>
                    </div>

                    <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-xs text-purple-900 font-medium mb-1">🔤 ¿Qué son los N-gramas?</p>
                      <p className="text-xs text-purple-800 mb-2">
                        Define si analizas palabras individuales o combinaciones de palabras consecutivas.
                      </p>
                      <p className="text-xs text-purple-900 font-medium mb-1">⚙️ ¿Qué obtendrás con cada configuración?</p>
                      <ul className="text-xs text-purple-800 space-y-1 ml-4">
                        <li><strong>(1, 1) - Solo Unigramas:</strong> Palabras sueltas → "educación", "digital", "tecnología"</li>
                        <li><strong>(1, 2) - Unigramas + Bigramas:</strong> Palabras + Pares → "educación digital", "tecnología avanzada"</li>
                        <li><strong>(2, 2) - Solo Bigramas:</strong> Solo pares → "inteligencia artificial", "aprendizaje automático"</li>
                        <li><strong>(1, 3) - Hasta Trigramas:</strong> Incluye frases → "transformación digital educativa"</li>
                      </ul>
                      <p className="text-xs text-purple-700 mt-2 italic">
                        💡 Recomendación: (1, 1) para análisis general, (1, 2) para capturar expresiones comunes.
                      </p>
                      <p className="text-xs text-purple-700 mt-1 italic">
                        ⚠️ Advertencia: Valores altos (3+) generan vocabularios muy grandes y pueden ser lentos.
                      </p>
                    </div>
                  </div>
                </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
