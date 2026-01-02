/**
 * Data Preparation List Page
 *
 * Tabla de preparaciones de datos con estado y progreso.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Trash2, AlertCircle } from 'lucide-react';
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
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        label: 'Pendiente'
      },
      processing: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        label: 'En Proceso'
      },
      completed: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        label: 'Completado'
      },
      error: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        label: 'Error'
      }
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;

    return (
      <div className="space-y-1">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
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
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md">
        <span className="text-base">{flag}</span>
        <span className="text-xs font-medium text-blue-900">{name}</span>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F7FE' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Preparación de Datos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Limpieza y transformación de datos para análisis NLP
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/preprocesamiento/preparacion-datos/nuevo')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Preparación</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
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
