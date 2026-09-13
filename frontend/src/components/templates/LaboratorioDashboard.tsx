/**
 * LaboratorioDashboard - Laboratorio de inferencia sobre nuevos documentos
 *
 * Permite al usuario subir PDFs y analizarlos usando los modelos entrenados
 * del corpus seleccionado (Modo B: inferencia sin reentrenamiento).
 *
 * Flujo en 4 etapas:
 *   1. Configurar  — seleccionar modelos de referencia
 *   2. Subir       — cargar PDFs (solo PDF, máx 50 MB c/u)
 *   3. Procesar    — inferencia en background
 *   4. Resultados  — visualizar BoW, TF-IDF y Tópicos comparables con el corpus
 */

import React, { useState, useCallback, useEffect } from 'react';
import publicWorkspaceService, {
  Workspace,
  CreatePublicWorkspacePayload,
} from '../../services/publicWorkspaceService';
import publicDatasetsService from '../../services/publicDatasetsService';
import publicDataPreparationService from '../../services/publicDataPreparationService';
import type { DatasetListItem } from '../../services/datasetsService';
import type { DataPreparationListItem } from '../../services/dataPreparationService';
import {
  StageIndicator,
  ConfigureStage,
  UploadStage,
  ProcessingStage,
  ResultsStage,
} from '../organisms/laboratorio';
import type { Stage } from '../organisms/laboratorio';

// ── Types ─────────────────────────────────────────────────────────────────────

export const LaboratorioDashboard: React.FC = () => {
  const [stage, setStage] = useState<Stage>('configure');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImportedView, setIsImportedView] = useState(false);

  // ── Dataset + DataPreparation selectors (B1) ──────────────────────────────
  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [dataPreparations, setDataPreparations] = useState<DataPreparationListItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [selectedDataPrepId, setSelectedDataPrepId] = useState<number | null>(null);
  const [selectorsLoading, setSelectorsLoading] = useState(true);

  // Load datasets on mount
  useEffect(() => {
    publicDatasetsService.getDatasets().then((list) => {
      const completed = list.filter((d) => d.status === 'completed');
      setDatasets(completed);
      if (completed.length > 0) setSelectedDatasetId(completed[0].id);
      setSelectorsLoading(false);
    }).catch(() => setSelectorsLoading(false));
  }, []);

  // Load data preparations when dataset changes
  useEffect(() => {
    if (!selectedDatasetId) { setDataPreparations([]); setSelectedDataPrepId(null); return; }
    publicDataPreparationService.getPreparations(selectedDatasetId).then((list) => {
      const completed = list.filter((d) => d.status === 'completed');
      setDataPreparations(completed);
      setSelectedDataPrepId(completed.length > 0 ? completed[0].id : null);
    }).catch(() => { setDataPreparations([]); setSelectedDataPrepId(null); });
  }, [selectedDatasetId]);

  const selectedDataPrepName = dataPreparations.find((d) => d.id === selectedDataPrepId)?.name ?? null;

  // Idioma del corpus para avisar en la subida: el de la preparacion elegida
  // o, si no hay una elegida, el comun a todas las del dataset.
  const corpusLanguage = (() => {
    const elegida = dataPreparations.find((d) => d.id === selectedDataPrepId);
    if (elegida?.predominant_language) return elegida.predominant_language;
    const idiomas = Array.from(new Set(dataPreparations.map((d) => d.predominant_language).filter(Boolean)));
    return idiomas.length === 1 ? idiomas[0] : null;
  })();

  const handleViewImportedResults = useCallback((ws: Workspace) => {
    setWorkspace(ws);
    setIsImportedView(true);
    setStage('results');
  }, []);

  const handleConfigure = useCallback(async (modelConfig: Omit<CreatePublicWorkspacePayload, 'dataset_id'>) => {
    if (!selectedDatasetId) return;
    setError(null);
    try {
      const ws = await publicWorkspaceService.createWorkspace({ dataset_id: selectedDatasetId, ...modelConfig });
      setWorkspace(ws);
      setStage('upload');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Error al crear el workspace.');
    }
  }, [selectedDatasetId]);

  const handleUploadDone = useCallback(() => {
    setStage('processing');
  }, []);

  const handleProcessingDone = useCallback((ws: Workspace) => {
    setWorkspace(ws);
    setIsImportedView(false);
    setStage('results');
  }, []);

  const handleReset = useCallback(() => {
    setWorkspace(null);
    setError(null);
    setIsImportedView(false);
    setStage('configure');
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Laboratorio</h2>
        <p className="text-slate-400 text-sm mt-1">
          Analiza nuevos documentos PDF usando los modelos entrenados del corpus seleccionado,
          sin reentrenamiento — los resultados son comparables con el corpus original.
        </p>
      </div>

      {/* ── Dataset + DataPreparation selectors (B1) ── */}
      {stage === 'configure' && (
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Seleccionar corpus</p>
          {selectorsLoading ? (
            <p className="text-xs text-slate-500">Cargando datasets…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Dataset</label>
                {datasets.length === 0 ? (
                  <p className="text-xs text-amber-400">No hay datasets completados.</p>
                ) : (
                  <select
                    value={selectedDatasetId ?? ''}
                    onChange={(e) => {
                      setSelectedDatasetId(Number(e.target.value));
                      setStage('configure');
                      setWorkspace(null);
                    }}
                    className="w-full text-xs bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Preprocesamiento</label>
                {dataPreparations.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Sin preprocesamiento completado.</p>
                ) : (
                  <select
                    value={selectedDataPrepId ?? ''}
                    onChange={(e) => {
                      setSelectedDataPrepId(e.target.value ? Number(e.target.value) : null);
                      setWorkspace(null);
                    }}
                    className="w-full text-xs bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">(todos)</option>
                    {dataPreparations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stage indicator */}
      <StageIndicator current={stage} />

      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Stage content */}
      <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
        {stage === 'configure' && selectedDatasetId && (
          <ConfigureStage
            datasetId={selectedDatasetId}
            dataPreparationName={selectedDataPrepName}
            onNext={handleConfigure}
            onViewImportedResults={handleViewImportedResults}
          />
        )}
        {stage === 'configure' && !selectedDatasetId && (
          <p className="text-slate-400 text-sm text-center py-8">Selecciona un dataset para continuar.</p>
        )}
        {stage === 'upload' && workspace && (
          <UploadStage
            workspaceId={workspace.id}
            onNext={handleUploadDone}
            onBack={handleReset}
            corpusLanguage={corpusLanguage}
          />
        )}
        {stage === 'processing' && workspace && (
          <ProcessingStage
            workspaceId={workspace.id}
            onDone={handleProcessingDone}
            onError={(mensaje) => { setError(mensaje); setStage('upload'); }}
          />
        )}
        {stage === 'results' && workspace && (
          <ResultsStage workspace={workspace} onReset={handleReset} isImported={isImportedView} />
        )}
      </div>
    </div>
  );
};
