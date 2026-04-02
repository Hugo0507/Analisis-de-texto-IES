/**
 * LstmAnalysisList — Lista de análisis LSTM entrenados.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import lstmService from '../services/lstmService';
import type { LstmListItem } from '../services/lstmService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
};

export const LstmAnalysisList: React.FC = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [analyses, setAnalyses] = useState<LstmListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await lstmService.list();
      setAnalyses(data);
    } catch {
      showError('Error al cargar los análisis LSTM');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este análisis LSTM? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    try {
      await lstmService.delete(id);
      showSuccess('Análisis eliminado');
      setAnalyses(prev => prev.filter(a => a.id !== id));
    } catch {
      showError('Error al eliminar el análisis');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Análisis LSTM</h1>
            <p className="text-xs text-gray-400 mt-0.5">Clasificación de documentos por tema con redes neuronales</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/modelado/lstm/nuevo')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Análisis
          </button>
        </div>
      </div>

      <div className="p-8 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : analyses.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Sin análisis LSTM</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              Entrena un modelo LSTM para clasificar documentos del corpus por su tema dominante.
            </p>
            <button
              type="button"
              onClick={() => navigate('/admin/modelado/lstm/nuevo')}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Crear primer análisis
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map(a => (
              <div
                key={a.id}
                className="bg-white rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-shadow"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}
                onClick={() => navigate(`/admin/modelado/lstm/${a.id}`)}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{a.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_STYLES[a.status]}`}>
                      {a.status_display}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {a.data_preparation_name} · {a.topic_modeling_name}
                  </p>
                </div>

                {/* Stats */}
                <div className="hidden md:flex items-center gap-6 text-center shrink-0">
                  <div>
                    <p className="text-xs text-gray-400">Accuracy</p>
                    <p className="text-sm font-bold text-gray-900">
                      {a.accuracy !== null ? `${(a.accuracy * 100).toFixed(1)}%` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Épocas</p>
                    <p className="text-sm font-bold text-gray-900">{a.num_epochs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Documentos</p>
                    <p className="text-sm font-bold text-gray-900">{a.documents_used || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Temas</p>
                    <p className="text-sm font-bold text-gray-900">{a.num_classes || '—'}</p>
                  </div>
                </div>

                {/* Progress bar for processing */}
                {a.status === 'processing' && (
                  <div className="w-24 shrink-0">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${a.progress_percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-right mt-0.5">{a.progress_percentage}%</p>
                  </div>
                )}

                {/* Actions */}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); handleDelete(a.id); }}
                  disabled={deletingId === a.id}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Eliminar"
                >
                  {deletingId === a.id ? (
                    <Spinner size="sm" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LstmAnalysisList;
