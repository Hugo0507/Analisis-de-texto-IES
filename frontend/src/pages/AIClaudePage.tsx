/**
 * AIClaudePage
 *
 * Página de administración para ejecutar análisis con Claude (Anthropic).
 * Permite seleccionar dataset, personalizar prompt y ver historial de análisis.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Building2,
  Tag,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import aiAnalysisService from '../services/aiAnalysisService';
import type { AIAnalysisConfig, AIAnalysisResult, AISuccessCase } from '../services/aiAnalysisService';
import datasetsService from '../services/datasetsService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

// ── Default prompt ──────────────────────────────────────────────────────────

const DEFAULT_PROMPT = `Analiza los documentos del corpus sobre transformación digital en instituciones de educación superior (IES).

Por cada documento, identifica:
1. Casos de éxito de transformación digital (institución, tipo de transformación, resultados)
2. Factores críticos de éxito mencionados (tecnológicos, organizacionales, humanos, estratégicos, financieros, pedagógicos, de infraestructura, de seguridad)
3. Barreras y desafíos reportados

Responde en formato JSON estructurado con los campos: institution, transformation_type, factors, results, confidence (0-1).`;

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: 'Pendiente',   color: 'text-slate-600', bg: 'bg-slate-100',   icon: <Clock className="w-3.5 h-3.5" /> },
  processing: { label: 'Procesando', color: 'text-blue-600',  bg: 'bg-blue-50',     icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  completed:  { label: 'Completado', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  error:      { label: 'Error',      color: 'text-red-600',   bg: 'bg-red-50',      icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

function statusBadge(status: string) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} font-medium`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface SuccessCaseCardProps {
  caso: AISuccessCase;
}

const SuccessCaseCard: React.FC<SuccessCaseCardProps> = ({ caso }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <Building2 className="w-4 h-4 text-violet-500 shrink-0" />
        <span className="font-semibold text-slate-800 text-sm truncate">{caso.institution}</span>
      </div>
      <span className="text-xs text-slate-400 shrink-0">
        {(caso.confidence * 100).toFixed(0)}% confianza
      </span>
    </div>
    <p className="text-xs text-slate-500">
      <span className="font-medium text-slate-700">Tipo:</span> {caso.transformation_type}
    </p>
    <p className="text-xs text-slate-600 leading-relaxed">{caso.results}</p>
    {caso.factors.length > 0 && (
      <div className="flex flex-wrap gap-1 pt-1">
        {caso.factors.map((f) => (
          <span key={f} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
            <Tag className="w-2.5 h-2.5" />
            {f}
          </span>
        ))}
      </div>
    )}
  </div>
);

interface AnalysisHistoryItemProps {
  config: AIAnalysisConfig;
  onViewResults: (id: number) => void;
  isLoadingResult: boolean;
  selectedId: number | null;
}

const AnalysisHistoryItem: React.FC<AnalysisHistoryItemProps> = ({
  config,
  onViewResults,
  isLoadingResult,
  selectedId,
}) => {
  const isSelected = selectedId === config.id;
  return (
    <div className={`border rounded-xl p-4 transition-colors ${isSelected ? 'border-violet-300 bg-violet-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">
            Dataset: {config.dataset_name}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(config.created_at).toLocaleString('es-CO')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge(config.status)}
          {config.status === 'completed' && (
            <button
              onClick={() => onViewResults(config.id)}
              disabled={isLoadingResult}
              className="text-xs px-3 py-1 rounded-lg bg-violet-500 hover:bg-violet-600 text-white transition-colors disabled:opacity-50"
            >
              {isLoadingResult && isSelected ? <Spinner /> : 'Ver resultados'}
            </button>
          )}
        </div>
      </div>
      {config.status === 'error' && config.error_message && (
        <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg px-3 py-2">
          {config.error_message}
        </p>
      )}
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

export const AIClaudePage: React.FC = () => {
  const { showError, showSuccess } = useToast();

  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | ''>('');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [history, setHistory] = useState<AIAnalysisConfig[]>([]);
  const [selectedResult, setSelectedResult] = useState<AIAnalysisResult | null>(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const data = await aiAnalysisService.getAIConfigsByProvider('claude');
      if (data.success) setHistory(data.configs);
    } catch {
      // Sin análisis previos es un estado válido
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const loadDatasets = useCallback(async () => {
    try {
      const data = await datasetsService.getDatasets();
      setDatasets(data);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    loadHistory();
    loadDatasets();
  }, [loadHistory, loadDatasets]);

  const handleRun = async () => {
    if (!selectedDatasetId) {
      showError('Selecciona un dataset antes de ejecutar el análisis');
      return;
    }
    setIsRunning(true);
    try {
      const result = await aiAnalysisService.runAIAnalysis({
        provider: 'claude',
        dataset_id: Number(selectedDatasetId),
        prompt,
      });
      if (result.success) {
        showSuccess('Análisis con Claude iniciado correctamente');
        await loadHistory();
      }
    } catch (err: any) {
      showError('Error al iniciar el análisis: ' + (err.response?.data?.error ?? err.message));
    } finally {
      setIsRunning(false);
    }
  };

  const handleViewResults = async (configId: number) => {
    setSelectedResultId(configId);
    setIsLoadingResult(true);
    try {
      const data = await aiAnalysisService.getAIResults(configId);
      if (data.success) setSelectedResult(data.result);
    } catch (err: any) {
      showError('Error al cargar resultados: ' + (err.response?.data?.error ?? err.message));
    } finally {
      setIsLoadingResult(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>

      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center justify-between px-4 sm:px-8 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Cpu className="w-5 h-5 text-violet-600 shrink-0" />
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Análisis con Claude</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium shrink-0">Anthropic</span>
          </div>
          <button
            onClick={loadHistory}
            className="p-2 sm:p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            title="Actualizar historial"
          >
            <RefreshCw className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">

        {/* Info */}
        <div className="flex gap-2.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <span className="leading-relaxed">
            Envía el corpus a <strong>Claude (Anthropic)</strong> para identificar casos de éxito de transformación digital
            y los factores mencionados. Los resultados se integran en la comparación multi-LLM.
          </span>
        </div>

        {/* Formulario de ejecución */}
        <div className="bg-white p-5 sm:p-6 space-y-4" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 className="text-base font-semibold text-slate-800">Nuevo análisis</h2>

          {/* Dataset selector */}
          <div>
            <label htmlFor="dataset-select" className="block text-sm font-medium text-slate-700 mb-1.5">
              Dataset a analizar
            </label>
            <select
              id="dataset-select"
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value ? Number(e.target.value) : '')}
              className="w-full sm:max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            >
              <option value="">Selecciona un dataset...</option>
              {datasets.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Prompt editor (colapsable) */}
          <div>
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              {showPrompt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Personalizar prompt
            </button>
            {showPrompt && (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={8}
                aria-label="Prompt para Claude"
                className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-y"
              />
            )}
          </div>

          <button
            onClick={handleRun}
            disabled={isRunning || !selectedDatasetId}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-full transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isRunning ? <><Spinner />Ejecutando...</> : <><Play className="w-4 h-4" />Ejecutar análisis</>}
          </button>
        </div>

        {/* Historial */}
        <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 className="text-base font-semibold text-slate-800 mb-4">Historial de análisis</h2>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Cpu className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Aún no hay análisis ejecutados con Claude.</p>
              <p className="text-xs text-slate-400 mt-1">Selecciona un dataset y ejecuta tu primer análisis.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((config) => (
                <AnalysisHistoryItem
                  key={config.id}
                  config={config}
                  onViewResults={handleViewResults}
                  isLoadingResult={isLoadingResult}
                  selectedId={selectedResultId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Resultados del análisis seleccionado */}
        {selectedResult && (
          <div className="bg-white p-5 sm:p-6 space-y-5" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div className="flex items-start justify-between flex-wrap gap-2">
              <h2 className="text-base font-semibold text-slate-800">Resultados</h2>
              <div className="flex items-center gap-3">
                {selectedResult.processing_time_seconds != null && (
                  <span className="text-xs text-slate-400">
                    Tiempo: {selectedResult.processing_time_seconds.toFixed(1)}s
                  </span>
                )}
                {statusBadge(selectedResult.status)}
              </div>
            </div>

            {/* Resumen */}
            {selectedResult.summary && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 leading-relaxed">
                {selectedResult.summary}
              </div>
            )}

            {/* Factores encontrados */}
            {selectedResult.factors_found.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Factores identificados ({selectedResult.factors_found.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedResult.factors_found.map((f) => (
                    <span key={f} className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Casos de éxito */}
            {selectedResult.success_cases.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Casos de éxito identificados ({selectedResult.success_cases.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedResult.success_cases.map((caso) => (
                    <SuccessCaseCard key={caso.id} caso={caso} />
                  ))}
                </div>
              </div>
            )}

            {selectedResult.success_cases.length === 0 && selectedResult.status === 'completed' && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                No se identificaron casos de éxito con los criterios actuales del prompt.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
