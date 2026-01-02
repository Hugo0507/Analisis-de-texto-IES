/**
 * Data Preparation List Page
 *
 * Tabla de preparaciones de datos con estado y progreso.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Trash2, AlertCircle } from 'lucide-react';
import dataPreparationService, { DataPreparationListItem } from '../services/dataPreparationService';
import { useToast } from '../contexts/ToastContext';
import { Spinner } from '../components/atoms';

export const DataPreparationList: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [preparations, setPreparations] = useState<DataPreparationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadPreparations();

    // Poll para actualizar progreso cada 3 segundos
    const interval = setInterval(() => {
      loadPreparations();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const loadPreparations = async () => {
    try {
      const data = await dataPreparationService.getPreparations();
      setPreparations(data);
    } catch (error: any) {
      if (!isLoading) { // Solo mostrar error si no es la carga inicial
        showError('Error al cargar preparaciones');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar esta preparación?')) {
      return;
    }

    try {
      setDeletingId(id);
      await dataPreparationService.deletePreparation(id);
      showSuccess('Preparación eliminada correctamente');
      loadPreparations();
    } catch (error: any) {
      showError(error.response?.data?.error || 'Error al eliminar preparación');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string, progressPercentage: number) => {
    const badges = {
      pending: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        label: 'Pendiente'
      },
      processing: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        label: 'En Proceso'
      },
      completed: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        label: 'Completado'
      },
      error: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        label: 'Error'
      }
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;

    return (
      <div className="space-y-1">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
          {status === 'processing' && (
            <span className="animate-pulse mr-1.5">●</span>
          )}
          {badge.label}
        </span>

        {status === 'processing' && (
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  const getLanguageBadge = (languageCode: string | null) => {
    if (!languageCode) {
      return <span className="text-sm text-gray-400">-</span>;
    }

    const flag = dataPreparationService.getLanguageFlag(languageCode);
    const name = dataPreparationService.getLanguageName(languageCode);

    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
        <span className="text-base">{flag}</span>
        <span>{name}</span>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
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
          {/* Left: Icon + Title */}
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h1 className="text-xl font-semibold text-gray-900">Preparación de Datos</h1>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={loadPreparations}
              disabled={isLoading}
              className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refrescar lista"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Add Button */}
            <button
              onClick={() => navigate('/admin/preprocesamiento/preparacion-datos/nuevo')}
              className="p-3 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-all shadow-md hover:shadow-lg"
              title="Nueva preparación"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {preparations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <AlertCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay preparaciones creadas
            </h3>
            <p className="text-gray-500 mb-6">
              Crea tu primera preparación de datos para empezar el procesamiento NLP
            </p>
            <button
              onClick={() => navigate('/admin/preprocesamiento/preparacion-datos/nuevo')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Nueva Preparación</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre del Dataset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Idioma Predominante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preparations.map((prep) => (
                  <tr key={prep.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{prep.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{prep.name}</div>
                        <div className="text-xs text-gray-500">{prep.dataset_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getLanguageBadge(prep.predominant_language)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(prep.status, prep.progress_percentage)}
                      {prep.current_stage_label && prep.status === 'processing' && (
                        <div className="text-xs text-gray-500 mt-1">
                          {prep.current_stage_label}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(prep.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/preprocesamiento/preparacion-datos/${prep.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(prep.id)}
                          disabled={deletingId === prep.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          {deletingId === prep.id ? (
                            <Spinner size="sm" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
