/**
 * FactorsList Page
 *
 * Lista de análisis de factores de transformación digital.
 * Permite ver análisis anteriores y crear nuevos.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, RefreshCw, Plus, Eye, Trash2, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import analysisService from '../services/analysisService';
import type { FactorRunListItem } from '../services/analysisService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

// ── Helpers ────────────────────────────────────────────────────────────────

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const StatusBadge: React.FC<{ status: FactorRunListItem['status'] }> = ({ status }) => {
  const map = {
    pending:   { label: 'Pendiente',   cls: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
    running:   { label: 'Ejecutando',  cls: 'bg-blue-100 text-blue-700',     icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    completed: { label: 'Completado',  cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3 h-3" /> },
    error:     { label: 'Error',       cls: 'bg-red-100 text-red-700',       icon: <XCircle className="w-3 h-3" /> },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

export const FactorsList: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [runs, setRuns] = useState<FactorRunListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [runToDelete, setRunToDelete] = useState<FactorRunListItem | null>(null);

  useEffect(() => { loadRuns(); }, []);

  const loadRuns = async () => {
    setIsLoading(true);
    try {
      const data = await analysisService.listFactorRuns();
      setRuns(data.runs ?? []);
    } catch (err: any) {
      showError('Error al cargar análisis: ' + (err.response?.data?.error ?? err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!runToDelete) return;
    try {
      await analysisService.deleteFactorRun(runToDelete.id);
      showSuccess(`Análisis "${runToDelete.name}" eliminado`);
      setRunToDelete(null);
      await loadRuns();
    } catch (err: any) {
      showError('Error al eliminar: ' + (err.response?.data?.error ?? err.message));
      setRunToDelete(null);
    }
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

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-gray-700" />
            <h1 className="text-xl font-semibold text-gray-900">Análisis de Factores</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadRuns}
              className="p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              title="Refrescar"
            >
              <RefreshCw className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => navigate('/admin/analisis/analisis-de-factores/nuevo')}
              className="p-3 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-all shadow-md hover:shadow-lg"
              title="Nuevo análisis"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="bg-white p-7" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          {runs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <BarChart2 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay análisis creados</h3>
              <p className="text-sm text-gray-500 mb-6">
                Crea tu primer análisis de factores de transformación digital.
              </p>
              <button
                onClick={() => navigate('/admin/analisis/analisis-de-factores/nuevo')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium shadow-md"
              >
                <Plus className="w-5 h-5" />
                Crear análisis
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Preparación de datos</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Documentos</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Factores</th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Creado</th>
                    <th className="px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run, i) => (
                    <tr
                      key={run.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => run.status === 'completed' && navigate(`/admin/analisis/analisis-de-factores/${run.id}`)}
                    >
                      <td className="px-4 py-4 text-sm font-medium text-gray-500">
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-gray-900">{run.name}</p>
                        {run.error_message && (
                          <p className="text-xs text-red-500 mt-0.5 truncate max-w-xs" title={run.error_message}>{run.error_message}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {run.data_preparation_name ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">{run.data_preparation_name}</p>
                            {run.dataset_name && <p className="text-xs text-gray-400">{run.dataset_name}</p>}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Todos los documentos</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {run.document_count > 0 ? run.document_count : '—'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {run.factor_count > 0 ? run.factor_count : '—'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(run.created_at)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          {run.status === 'completed' && (
                            <button
                              onClick={() => navigate(`/admin/analisis/analisis-de-factores/${run.id}`)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Ver resultados"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => setRunToDelete(run)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
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

      {/* Delete modal */}
      {runToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-md w-full mx-4" style={{ borderRadius: '20px' }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Eliminar análisis?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Se eliminará <strong>{runToDelete.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRunToDelete(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
