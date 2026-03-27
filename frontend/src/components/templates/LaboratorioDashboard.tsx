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

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useFilter } from '../../contexts/FilterContext';
import workspaceService, {
  Workspace,
  CreateWorkspacePayload,
} from '../../services/workspaceService';
import dashboardService from '../../services/dashboardService';

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = 'configure' | 'upload' | 'processing' | 'results';

interface AnalysisOption {
  id: number;
  name: string;
  label?: string;
}

// ── Stage indicator ───────────────────────────────────────────────────────────

const STAGES: { key: Stage; label: string }[] = [
  { key: 'configure', label: '1. Configurar' },
  { key: 'upload', label: '2. Subir PDFs' },
  { key: 'processing', label: '3. Procesando' },
  { key: 'results', label: '4. Resultados' },
];

const StageIndicator: React.FC<{ current: Stage }> = ({ current }) => {
  const currentIdx = STAGES.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
      {STAGES.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={s.key}>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                ${active ? 'bg-violet-500 border-violet-400 text-white' : ''}
                ${done ? 'bg-emerald-500 border-emerald-400 text-white' : ''}
                ${!active && !done ? 'bg-slate-800 border-slate-600 text-slate-400' : ''}
              `}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${active ? 'text-white' : done ? 'text-emerald-400' : 'text-slate-500'}`}>
                {s.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 min-w-[20px] h-0.5 mx-2 transition-colors ${done ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Stage 1: Configure ────────────────────────────────────────────────────────

interface ConfigureStageProps {
  datasetId: number;
  onNext: (payload: Omit<CreateWorkspacePayload, 'dataset'>) => void;
}

const ConfigureStage: React.FC<ConfigureStageProps> = ({ datasetId, onNext }) => {
  const [bowOptions, setBowOptions] = useState<AnalysisOption[]>([]);
  const [tfidfOptions, setTfidfOptions] = useState<AnalysisOption[]>([]);
  const [topicOptions, setTopicOptions] = useState<AnalysisOption[]>([]);
  const [selectedBow, setSelectedBow] = useState<number | null>(null);
  const [selectedTfidf, setSelectedTfidf] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await dashboardService.getVectorizationData(datasetId);
        const bows = (data.bowAnalyses || [])
          .filter((a) => a.status === 'completed' && a.has_artifact)
          .sort((a, b) => a.name.localeCompare(b.name));
        const tfidfs = (data.tfidfAnalyses || [])
          .filter((a) => a.status === 'completed' && a.has_artifact)
          .sort((a, b) => a.name.localeCompare(b.name));

        const modelingData = await dashboardService.getModelingData(datasetId);
        const topics = (modelingData.topicModelingAnalyses || [])
          .filter((a) => a.status === 'completed' && a.has_artifact)
          .sort((a, b) => a.name.localeCompare(b.name));

        setBowOptions(bows.map((a: any) => ({ id: a.id, name: a.name })));
        setTfidfOptions(tfidfs.map((a: any) => ({ id: a.id, name: a.name })));
        setTopicOptions(topics.map((a: any) => ({ id: a.id, name: `${a.name} (${a.algorithm_display})` })));

        if (bows.length > 0) setSelectedBow(bows[0].id);
        if (tfidfs.length > 0) setSelectedTfidf(tfidfs[0].id);
        if (topics.length > 0) setSelectedTopic(topics[0].id);
      } catch (err) {
        console.error('Error cargando análisis disponibles:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [datasetId]);

  const canContinue = selectedBow != null || selectedTfidf != null || selectedTopic != null;

  const SelectRow: React.FC<{
    label: string;
    options: AnalysisOption[];
    value: number | null;
    onChange: (v: number | null) => void;
    noOptionsMsg: string;
  }> = ({ label, options, value, onChange, noOptionsMsg }) => (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
      <div className="w-2 h-2 rounded-full bg-violet-400 mt-2 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white mb-1">{label}</p>
        {options.length === 0 ? (
          <p className="text-xs text-amber-400">{noOptionsMsg}</p>
        ) : (
          <select
            value={value ?? ''}
            onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className="w-full text-xs bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">(ninguno)</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
      </div>
    </div>
  );

  if (loading) {
    return <div className="text-slate-400 text-sm py-12 text-center">Cargando análisis disponibles…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Selecciona los modelos de referencia</h3>
        <p className="text-sm text-slate-400">
          Los nuevos documentos se analizarán usando los modelos entrenados del corpus.
          Solo aparecen modelos completados con artefactos guardados.
        </p>
      </div>

      <div className="space-y-3">
        <SelectRow
          label="Bolsa de Palabras (BoW)"
          options={bowOptions}
          value={selectedBow}
          onChange={setSelectedBow}
          noOptionsMsg="No hay análisis BoW completados con artefactos. Ejecuta un análisis BoW primero."
        />
        <SelectRow
          label="TF-IDF"
          options={tfidfOptions}
          value={selectedTfidf}
          onChange={setSelectedTfidf}
          noOptionsMsg="No hay análisis TF-IDF completados con artefactos. Ejecuta un análisis TF-IDF primero."
        />
        <SelectRow
          label="Modelado de Temas"
          options={topicOptions}
          value={selectedTopic}
          onChange={setSelectedTopic}
          noOptionsMsg="No hay Modelos de Temas completados con artefactos. Ejecuta un Modelado de Temas primero."
        />
      </div>

      <div className="pt-2">
        {!canContinue && (
          <p className="text-xs text-amber-400 mb-3">
            Selecciona al menos un modelo para continuar.
          </p>
        )}
        <button
          disabled={!canContinue}
          onClick={() => onNext({ bow_id: selectedBow, tfidf_id: selectedTfidf, topic_model_id: selectedTopic })}
          className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
};

// ── Stage 2: Upload ───────────────────────────────────────────────────────────

interface UploadStageProps {
  workspaceId: string;
  onNext: () => void;
  onBack: () => void;
}

const UploadStage: React.FC<UploadStageProps> = ({ workspaceId, onNext, onBack }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ name: string; size: number; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList);

    for (const file of newFiles) {
      if (file.type !== 'application/pdf') {
        setFiles(prev => [...prev, { name: file.name, size: file.size, status: 'error', error: 'Solo se permiten archivos PDF.' }]);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        setFiles(prev => [...prev, { name: file.name, size: file.size, status: 'error', error: 'El archivo supera 50 MB.' }]);
        continue;
      }

      setFiles(prev => [...prev, { name: file.name, size: file.size, status: 'uploading' }]);
      setUploading(true);

      try {
        await workspaceService.uploadDocument(workspaceId, file);
        setFiles(prev => prev.map((f, i) => i === prev.length - 1 ? { ...f, status: 'done' } : f));
      } catch (err: any) {
        const msg = err?.response?.data?.file?.[0] || err?.message || 'Error al subir.';
        setFiles(prev => prev.map((f, i) => i === prev.length - 1 ? { ...f, status: 'error', error: msg } : f));
      }
    }
    setUploading(false);
  }, [workspaceId, files.length]);

  const doneCount = files.filter(f => f.status === 'done').length;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Sube los documentos a analizar</h3>
        <p className="text-sm text-slate-400">Solo archivos PDF · Máximo 50 MB por archivo</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-violet-400 bg-violet-500/10' : 'border-slate-600 hover:border-slate-400 bg-slate-800/30'}
        `}
      >
        <svg className="w-10 h-10 mx-auto mb-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-slate-300 font-medium">Arrastra PDFs aquí o haz clic para seleccionar</p>
        <p className="text-xs text-slate-500 mt-1">Solo PDF · Máx. 50 MB c/u</p>
        <input ref={inputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{f.name}</p>
                {f.error && <p className="text-xs text-red-400 mt-0.5">{f.error}</p>}
              </div>
              <span className="text-xs text-slate-500 shrink-0">{formatSize(f.size)}</span>
              <span className={`text-xs font-medium shrink-0 ${f.status === 'done' ? 'text-emerald-400' : f.status === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                {f.status === 'done' ? '✓ Listo' : f.status === 'error' ? '✕ Error' : '…'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors">
          ← Atrás
        </button>
        <button
          disabled={doneCount === 0 || uploading}
          onClick={onNext}
          className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          {doneCount === 0 ? 'Sube al menos un PDF' : `Analizar ${doneCount} documento${doneCount !== 1 ? 's' : ''} →`}
        </button>
      </div>
    </div>
  );
};

// ── Stage 3: Processing ───────────────────────────────────────────────────────

interface ProcessingStageProps {
  workspaceId: string;
  onDone: (workspace: Workspace) => void;
  onError: () => void;
}

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

const ProcessingStage: React.FC<ProcessingStageProps> = ({ workspaceId, onDone, onError }) => {
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Iniciando inferencia…');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    // Kick off inference
    workspaceService.runInference(workspaceId).catch(() => {
      setErrorMsg('No se pudo iniciar la inferencia. Intenta de nuevo.');
      onError();
    });

    // Poll for status with timeout
    intervalRef.current = setInterval(async () => {
      const elapsedMs = Date.now() - startTimeRef.current;
      setElapsed(Math.floor(elapsedMs / 1000));

      // Timeout — dejar de hacer polling
      if (elapsedMs > MAX_POLL_TIMEOUT_MS) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setErrorMsg(
          'La inferencia excedió el tiempo máximo de 5 minutos. '
          + 'El servidor puede estar sobrecargado. Intenta de nuevo más tarde.'
        );
        onError();
        return;
      }

      try {
        const ws = await workspaceService.getWorkspace(workspaceId);
        setProgress(ws.progress_percentage);

        if (ws.progress_percentage < 20) setStatusMsg('Extrayendo texto de los PDFs…');
        else if (ws.progress_percentage < 30) setStatusMsg('Validando idioma de los documentos…');
        else if (ws.progress_percentage < 40) setStatusMsg('Preparando inferencia…');
        else if (ws.progress_percentage < 60) setStatusMsg('Aplicando Bolsa de Palabras…');
        else if (ws.progress_percentage < 80) setStatusMsg('Calculando TF-IDF…');
        else if (ws.progress_percentage < 100) setStatusMsg('Asignando temas…');
        else setStatusMsg('Completado.');

        if (ws.status === 'completed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onDone(ws);
        } else if (ws.status === 'error') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setErrorMsg(ws.error_message || 'Ocurrió un error durante la inferencia.');
          onError();
        }
      } catch {
        // Polling error — seguir intentando (puede ser un blip de red)
      }
    }, POLL_INTERVAL_MS);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [workspaceId]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="py-12 flex flex-col items-center gap-6">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={errorMsg ? '#ef4444' : '#8b5cf6'} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
            style={{ transition: 'stroke-dashoffset 0.4s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">{progress}%</span>
      </div>
      <div className="text-center max-w-md">
        {errorMsg ? (
          <>
            <p className="text-red-400 font-semibold">Error en la inferencia</p>
            <p className="text-red-300/80 text-sm mt-1">{errorMsg}</p>
          </>
        ) : (
          <>
            <p className="text-white font-semibold">{statusMsg}</p>
            <p className="text-slate-400 text-sm mt-1">
              Los modelos del corpus analizan los nuevos documentos… ({formatElapsed(elapsed)})
            </p>
          </>
        )}
      </div>
    </div>
  );
};

// ── Stage 4: Results ──────────────────────────────────────────────────────────

interface ResultsStageProps {
  workspace: Workspace;
  onReset: () => void;
}

const ResultsStage: React.FC<ResultsStageProps> = ({ workspace, onReset }) => {
  const { results } = workspace;

  const Section: React.FC<{ title: string; color: string; children: React.ReactNode }> = ({ title, color, children }) => (
    <div className={`rounded-2xl border bg-slate-800/40 overflow-hidden`} style={{ borderColor: `${color}33` }}>
      <div className="px-5 py-3 border-b" style={{ borderColor: `${color}33`, backgroundColor: `${color}11` }}>
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Resultados de inferencia</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            {results.document_count ?? 0} documento{results.document_count !== 1 ? 's' : ''} analizados
            usando los modelos del corpus de referencia.
          </p>
        </div>
        <button onClick={onReset} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-colors shrink-0">
          Nuevo análisis
        </button>
      </div>

      {/* BoW */}
      {results.bow && !results.bow.error && (
        <Section title="Bolsa de Palabras" color="#8b5cf6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Vocabulario ref.', value: results.bow.vocabulary_size.toLocaleString() },
              { label: 'Total ocurrencias', value: results.bow.total_term_occurrences.toLocaleString() },
              { label: 'Términos/doc (prom.)', value: results.bow.avg_terms_per_document.toFixed(1) },
              { label: 'Dispersión', value: `${(results.bow.matrix_sparsity * 100).toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl bg-slate-900/50 text-center">
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400 font-medium mb-2">Top 10 términos</p>
            {results.bow.top_terms.slice(0, 10).map((t, i) => (
              <div key={t.term} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-5 text-right">{i + 1}</span>
                <div className="flex-1 h-4 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500/60 rounded-full"
                    style={{ width: `${(t.score / (results.bow!.top_terms[0]?.score || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-300 w-24 truncate">{t.term}</span>
                <span className="text-xs text-slate-500 w-10 text-right">{t.score.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* TF-IDF */}
      {results.tfidf && !results.tfidf.error && (
        <Section title="TF-IDF (pesos del corpus)" color="#06b6d4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {[
              { label: 'TF-IDF prom./doc', value: results.tfidf.avg_tfidf_per_document.toFixed(2) },
              { label: 'Dispersión', value: `${(results.tfidf.matrix_sparsity * 100).toFixed(1)}%` },
              { label: 'Documentos', value: results.tfidf.matrix_shape.rows.toString() },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl bg-slate-900/50 text-center">
                <p className="text-lg font-bold text-white">{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400 font-medium mb-2">Top 10 términos por TF-IDF</p>
            {results.tfidf.top_terms.slice(0, 10).map((t, i) => (
              <div key={t.term} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-5 text-right">{i + 1}</span>
                <div className="flex-1 h-4 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500/60 rounded-full"
                    style={{ width: `${(t.score / (results.tfidf!.top_terms[0]?.score || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-300 w-24 truncate">{t.term}</span>
                <span className="text-xs text-slate-500 w-14 text-right">{t.score.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Topics */}
      {results.topics && !results.topics.error && (
        <Section title={`Modelado de Temas — ${results.topics.algorithm.toUpperCase()}`} color="#f59e0b">
          <div className="space-y-3">
            <p className="text-xs text-slate-400 font-medium">Distribución de temas dominantes en los nuevos documentos</p>
            {results.topics.topic_distribution.map(t => (
              <div key={t.topic_id} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-20 truncate shrink-0">
                  {t.topic_label || `Tema ${t.topic_id}`}
                </span>
                <div className="flex-1 h-5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500/60 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${t.percentage}%` }}
                  >
                    <span className="text-xs text-amber-200 font-medium">{t.percentage}%</span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 w-8 text-right shrink-0">{t.document_count}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Error notices */}
      {[results.bow?.error, results.tfidf?.error, results.topics?.error].filter(Boolean).map((err, i) => (
        <div key={i} className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{err}</div>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const LaboratorioDashboard: React.FC = () => {
  const { filters } = useFilter();
  const [stage, setStage] = useState<Stage>('configure');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);

  const datasetId = filters.selectedDatasetId;

  const handleConfigure = useCallback(async (modelConfig: Omit<CreateWorkspacePayload, 'dataset'>) => {
    if (!datasetId) return;
    setError(null);
    try {
      const ws = await workspaceService.createWorkspace({ dataset: datasetId, ...modelConfig });
      setWorkspace(ws);
      setStage('upload');
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Error al crear el workspace.');
    }
  }, [datasetId]);

  const handleUploadDone = useCallback(() => {
    setStage('processing');
  }, []);

  const handleProcessingDone = useCallback((ws: Workspace) => {
    setWorkspace(ws);
    setStage('results');
  }, []);

  const handleReset = useCallback(() => {
    setWorkspace(null);
    setError(null);
    setStage('configure');
  }, []);

  if (!datasetId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <svg className="w-12 h-12 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <p className="text-slate-400 text-sm">Selecciona un dataset para usar el Laboratorio.</p>
      </div>
    );
  }

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
        {stage === 'configure' && (
          <ConfigureStage datasetId={datasetId} onNext={handleConfigure} />
        )}
        {stage === 'upload' && workspace && (
          <UploadStage workspaceId={workspace.id} onNext={handleUploadDone} onBack={handleReset} />
        )}
        {stage === 'processing' && workspace && (
          <ProcessingStage
            workspaceId={workspace.id}
            onDone={handleProcessingDone}
            onError={() => { setError('Ocurrió un error durante la inferencia.'); setStage('upload'); }}
          />
        )}
        {stage === 'results' && workspace && (
          <ResultsStage workspace={workspace} onReset={handleReset} />
        )}
      </div>
    </div>
  );
};
