/**
 * BagOfWordsEdit Page - Editar Análisis de Bolsa de Palabras
 *
 * Permite editar nombre y descripción del análisis.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import bagOfWordsService from '../services/bagOfWordsService';
import type { BagOfWords, BagOfWordsUpdateRequest } from '../services/bagOfWordsService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

export const BagOfWordsEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [analysis, setAnalysis] = useState<BagOfWords | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<BagOfWordsUpdateRequest>({
    name: '',
    description: '',
  });

  useEffect(() => {
    if (id) {
      loadAnalysis();
    }
  }, [id]);

  const loadAnalysis = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const data = await bagOfWordsService.getBagOfWordsById(Number(id));
      setAnalysis(data);
      setFormData({
        name: data.name,
        description: data.description || '',
      });
    } catch (error: any) {
      showError('Error al cargar análisis: ' + (error.response?.data?.error || error.message));
      navigate('/admin/preprocesamiento/bolsa-palabras');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    if (!formData.name.trim()) {
      showError('El nombre es requerido');
      return;
    }

    setIsSaving(true);
    try {
      await bagOfWordsService.updateBagOfWords(Number(id), formData);
      showSuccess('Análisis actualizado exitosamente');
      navigate(`/admin/preprocesamiento/bolsa-palabras/${id}`);
    } catch (error: any) {
      showError('Error al actualizar análisis: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Análisis no encontrado</p>
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
              onClick={() => navigate(`/admin/preprocesamiento/bolsa-palabras/${id}`)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Editar Análisis BoW</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white p-8" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
            <div className="space-y-6">
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
                  placeholder="Nombre del análisis"
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
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Describe el propósito de este análisis..."
                />
              </div>

              {/* Info Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Nota Importante</p>
                    <p className="text-xs text-blue-700">
                      Solo puedes editar el nombre y la descripción. Los parámetros de vectorización no pueden modificarse una vez creado el análisis.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate(`/admin/preprocesamiento/bolsa-palabras/${id}`)}
                disabled={isSaving}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
