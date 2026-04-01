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
  ImportConfigResult,
} from '../../services/workspaceService';
import dashboardService from '../../services/dashboardService';


// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = 'configure' | 'upload' | 'processing' | 'results';

interface AnalysisOption {
  id: number;
  name: string;
  label?: string;
  selectedEntities?: string[];
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
  onImport: (result: ImportConfigResult & { workspace: Workspace }) => void;
}

const ConfigureStage: React.FC<ConfigureStageProps> = ({ datasetId, onNext, onImport }) => {
  // Sección A — modelos
  const [bowOptions, setBowOptions] = useState<AnalysisOption[]>([]);
  const [tfidfOptions, setTfidfOptions] = useState<AnalysisOption[]>([]);
  const [topicOptions, setTopicOptions] = useState<AnalysisOption[]>([]);
  const [nerOptions, setNerOptions] = useState<AnalysisOption[]>([]);
  const [bertopicOptions, setBertopicOptions] = useState<AnalysisOption[]>([]);
  const [selectedBow, setSelectedBow] = useState<number | null>(null);
  const [selectedTfidf, setSelectedTfidf] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [selectedNer, setSelectedNer] = useState<number | null>(null);
  const [selectedBertopic, setSelectedBertopic] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Sección B — stopwords
  const [corpusStopwords, setCorpusStopwords] = useState<string[]>([]);
  const [customStopwords, setCustomStopwords] = useState<string[]>([]);
  const [corpusExpanded, setCorpusExpanded] = useState(false);
  const [newWord, setNewWord] = useState('');
  const stopwordImportRef = useRef<HTMLInputElement>(null);

  // Import config
  const configImportRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError]     = useState<string | null>(null);

  // Sección C — parámetros de inferencia
  const ALL_NER_TYPES = ['PERSON', 'ORG', 'GPE', 'DATE', 'LOC', 'FAC', 'NORP', 'PRODUCT', 'EVENT'];
  const [numTopTerms, setNumTopTerms] = useState(50);
  const [minWordLength, setMinWordLength] = useState(2);
  const [stripReferences, setStripReferences] = useState(true);
  const [nerEntityTypes, setNerEntityTypes] = useState<string[]>(ALL_NER_TYPES);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [data, modelingData] = await Promise.all([
          dashboardService.getVectorizationData(datasetId),
          dashboardService.getModelingData(datasetId),
        ]);

        const bows = (data.bowAnalyses || [])
          .filter((a) => a.status === 'completed' && a.has_artifact)
          .sort((a, b) => a.name.localeCompare(b.name));
        const tfidfs = (data.tfidfAnalyses || [])
          .filter((a) => a.status === 'completed' && a.has_artifact)
          .sort((a, b) => a.name.localeCompare(b.name));
        const topics = (modelingData.topicModelingAnalyses || [])
          .filter((a: any) => a.status === 'completed' && a.has_artifact)
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        const ners = (modelingData.nerAnalyses || [])
          .filter((a) => a.status === 'completed')
          .sort((a, b) => a.name.localeCompare(b.name));
        const bertopics = (modelingData.bertopicAnalyses || [])
          .filter((a) => a.status === 'completed')
          .sort((a, b) => a.name.localeCompare(b.name));

        setBowOptions(bows.map((a: any) => ({ id: a.id, name: a.name })));
        setTfidfOptions(tfidfs.map((a: any) => ({ id: a.id, name: a.name })));
        setTopicOptions(topics.map((a: any) => ({ id: a.id, name: `${a.name} (${a.algorithm_display})` })));
        setNerOptions(ners.map((a: any) => ({ id: a.id, name: `${a.name} (${a.spacy_model_label || a.spacy_model})`, selectedEntities: a.selected_entities || [] })));
        setBertopicOptions(bertopics.map((a: any) => ({ id: a.id, name: `${a.name} (${a.num_topics_found ?? '?'} tópicos)` })));

        if (bows.length > 0) setSelectedBow(bows[0].id);
        if (tfidfs.length > 0) setSelectedTfidf(tfidfs[0].id);
        if (topics.length > 0) setSelectedTopic(topics[0].id);
      } catch (err) {
        console.error('Error cargando análisis disponibles:', err);
      } finally {
        setLoading(false);
      }

      try {
        const sw = await workspaceService.getCorpusStopwords(datasetId);
        setCorpusStopwords(sw);
      } catch {
        // No crítico — se omite si falla
      }
    };
    load();
  }, [datasetId]);

  // Hereda entity types del NER de referencia al seleccionarlo
  useEffect(() => {
    if (selectedNer != null) {
      const opt = nerOptions.find(o => o.id === selectedNer);
      if (opt?.selectedEntities && opt.selectedEntities.length > 0) {
        setNerEntityTypes(opt.selectedEntities);
      }
    } else {
      setNerEntityTypes(ALL_NER_TYPES);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNer, nerOptions]);

  const addCustomStopword = () => {
    const w = newWord.trim().toLowerCase();
    if (w && !customStopwords.includes(w) && !corpusStopwords.includes(w)) {
      setCustomStopwords(prev => [...prev, w].sort());
    }
    setNewWord('');
  };

  const removeCustomStopword = (word: string) => {
    setCustomStopwords(prev => prev.filter(w => w !== word));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const words = content
        .split('\n')
        .map(l => l.trim().toLowerCase())
        .filter(l => l && !l.startsWith('#'));
      setCustomStopwords(prev => {
        const combined = new Set([...prev, ...words.filter(w => !corpusStopwords.includes(w))]);
        return [...combined].sort();
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfigImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportError(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(ev.target?.result as string);
      } catch {
        setImportError('El archivo no es un JSON válido.');
        return;
      }
      if (!parsed.schema_version || !parsed.models) {
        setImportError('El archivo no parece ser una configuración exportada del Laboratorio.');
        return;
      }

      setImportLoading(true);
      try {
        const result = await workspaceService.importConfig(datasetId, parsed);
        const workspace = await workspaceService.getWorkspace(result.workspace_id);
        onImport({ ...result, workspace });
      } catch (err: any) {
        setImportError(
          err?.response?.data?.error || err?.message || 'Error al importar la configuración.'
        );
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const canContinue = selectedBow != null || selectedTfidf != null || selectedTopic != null;

  const SelectRow: React.FC<{
    label: string;
    options: AnalysisOption[];
    value: number | null;
    onChange: (v: number | null) => void;
    noOptionsMsg: string;
    accentColor?: string;
  }> = ({ label, options, value, onChange, noOptionsMsg, accentColor = 'bg-violet-400' }) => (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${accentColor}`} />
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
            <option value="">(ninguno — opcional)</option>
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
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Configurar sesión de análisis</h3>
        <p className="text-sm text-slate-400">
          Selecciona los modelos de referencia y personaliza las stopwords antes de subir los documentos.
        </p>
      </div>

      {/* ── Sección A: Modelos ── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          A — Modelos de referencia
        </p>
        <div className="space-y-2">
          <SelectRow
            label="Bolsa de Palabras (BoW)"
            options={bowOptions}
            value={selectedBow}
            onChange={setSelectedBow}
            noOptionsMsg="No hay análisis BoW completados con artefactos."
          />
          <SelectRow
            label="TF-IDF"
            options={tfidfOptions}
            value={selectedTfidf}
            onChange={setSelectedTfidf}
            noOptionsMsg="No hay análisis TF-IDF completados con artefactos."
          />
          <SelectRow
            label="Modelado de Temas"
            options={topicOptions}
            value={selectedTopic}
            onChange={setSelectedTopic}
            noOptionsMsg="No hay Modelos de Temas completados con artefactos."
          />
          <SelectRow
            label="NER — Reconocimiento de entidades"
            options={nerOptions}
            value={selectedNer}
            onChange={setSelectedNer}
            noOptionsMsg="No hay análisis NER completados. Ejecuta uno en el módulo NER primero."
            accentColor="bg-emerald-400"
          />
          <SelectRow
            label="BERTopic — Similitud temática"
            options={bertopicOptions}
            value={selectedBertopic}
            onChange={setSelectedBertopic}
            noOptionsMsg="No hay análisis BERTopic completados."
            accentColor="bg-sky-400"
          />
          {selectedBertopic != null && (
            <p className="text-xs text-slate-500 italic pl-6">
              La similitud BERTopic usa matching de palabras clave, no inferencia nativa (UMAP/HDBSCAN no se almacenan).
            </p>
          )}
        </div>
        {!canContinue && (
          <p className="text-xs text-amber-400 mt-3">
            Selecciona al menos un modelo (BoW, TF-IDF o Temas) para continuar.
          </p>
        )}
      </div>

      {/* ── Sección B: Stopwords ── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          B — Stopwords
        </p>

        {/* Corpus stopwords (read-only) */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-400">
              Corpus ({corpusStopwords.length} palabras — solo lectura)
            </p>
            {corpusStopwords.length > 20 && (
              <button
                onClick={() => setCorpusExpanded(!corpusExpanded)}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                {corpusExpanded ? 'Ver menos ↑' : `Ver todas (${corpusStopwords.length}) ↓`}
              </button>
            )}
          </div>
          {corpusStopwords.length === 0 ? (
            <p className="text-xs text-slate-600 italic">No se pudieron cargar las stopwords del corpus.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {(corpusExpanded ? corpusStopwords : corpusStopwords.slice(0, 20)).map(w => (
                <span key={w} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">
                  {w}
                </span>
              ))}
              {!corpusExpanded && corpusStopwords.length > 20 && (
                <span className="text-xs text-slate-600 self-center">
                  +{corpusStopwords.length - 20} más…
                </span>
              )}
            </div>
          )}
        </div>

        {/* Custom stopwords editor */}
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-400">
              Stopwords propias ({customStopwords.length})
            </p>
            <button
              onClick={() => stopwordImportRef.current?.click()}
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importar TXT
            </button>
            <input
              ref={stopwordImportRef}
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={handleImport}
            />
          </div>

          {customStopwords.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {customStopwords.map(w => (
                <span
                  key={w}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-900/50 text-violet-200 border border-violet-700/50"
                >
                  {w}
                  <button
                    onClick={() => removeCustomStopword(w)}
                    className="text-violet-400 hover:text-red-400 transition-colors leading-none"
                    aria-label={`Eliminar ${w}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addCustomStopword(); }
              }}
              placeholder="Añadir palabra y pulsar Enter…"
              className="flex-1 text-xs bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              onClick={addCustomStopword}
              className="px-3 py-2 rounded-lg bg-violet-700 hover:bg-violet-600 text-white text-xs font-semibold transition-colors"
            >
              Añadir
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 mt-1.5">
          {corpusStopwords.length} corpus + {customStopwords.length} propias = {corpusStopwords.length + customStopwords.length} stopwords en total
        </p>
      </div>

      {/* ── Sección C: Parámetros ── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          C — Parámetros de inferencia
        </p>
        <div className="space-y-3">

          {/* Fila: num_top_terms + min_word_length */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <label className="block text-sm font-semibold text-white mb-1">
                Términos a mostrar
              </label>
              <p className="text-xs text-slate-400 mb-2">Top N en BoW / TF-IDF</p>
              <input
                type="number"
                min={10}
                max={200}
                value={numTopTerms}
                onChange={e => setNumTopTerms(Math.min(200, Math.max(10, Number(e.target.value))))}
                className="w-full text-sm bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-slate-500 mt-1">Rango: 10 – 200</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <label className="block text-sm font-semibold text-white mb-1">
                Long. mínima de token
              </label>
              <p className="text-xs text-slate-400 mb-2">Filtrar palabras cortas</p>
              <input
                type="number"
                min={1}
                max={5}
                value={minWordLength}
                onChange={e => setMinWordLength(Math.min(5, Math.max(1, Number(e.target.value))))}
                className="w-full text-sm bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-slate-500 mt-1">Rango: 1 – 5 caracteres</p>
            </div>
          </div>

          {/* strip_references toggle */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div>
              <p className="text-sm font-semibold text-white">Cortar sección de referencias</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Elimina automáticamente la bibliografía al final del PDF antes de analizar
              </p>
            </div>
            <button
              onClick={() => setStripReferences(v => !v)}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${stripReferences ? 'bg-violet-600' : 'bg-slate-700'}`}
              role="switch"
              aria-checked={stripReferences}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${stripReferences ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* ner_entity_types checkboxes — solo visible si hay NER seleccionado */}
          {selectedNer != null && (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-sm font-semibold text-white mb-1">Tipos de entidad NER</p>
              <p className="text-xs text-slate-400 mb-3">
                Selecciona qué tipos de entidad extraer. Por defecto hereda la configuración del análisis NER seleccionado.
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_NER_TYPES.map(type => {
                  const active = nerEntityTypes.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => setNerEntityTypes(prev =>
                        active
                          ? prev.filter(t => t !== type)
                          : [...prev, type]
                      )}
                      className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                        active
                          ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700/60'
                          : 'bg-slate-900/60 text-slate-500 border-slate-700/50'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              {nerEntityTypes.length === 0 && (
                <p className="text-xs text-amber-400 mt-2">Selecciona al menos un tipo de entidad.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pt-2">
        <button
          disabled={!canContinue || (selectedNer != null && nerEntityTypes.length === 0)}
          onClick={() => onNext({
            bow_id: selectedBow,
            tfidf_id: selectedTfidf,
            topic_model_id: selectedTopic,
            ner_id: selectedNer,
            bertopic_id: selectedBertopic,
            custom_stopwords: customStopwords,
            inference_params: {
              num_top_terms: numTopTerms,
              min_word_length: minWordLength,
              strip_references: stripReferences,
              ...(selectedNer != null ? { ner_entity_types: nerEntityTypes } : {}),
            },
          })}
          className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
        >
          Continuar →
        </button>
      </div>

      {/* ── Importar configuración guardada ── */}
      <div className="pt-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-slate-700/60" />
          <span className="text-xs text-slate-500">o</span>
          <div className="flex-1 h-px bg-slate-700/60" />
        </div>

        <button
          onClick={() => { setImportError(null); configImportRef.current?.click(); }}
          disabled={importLoading}
          className="w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/60 text-slate-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {importLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Importando…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Cargar configuración guardada (.json)
            </>
          )}
        </button>
        <input
          ref={configImportRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleConfigImport}
        />

        {importError && (
          <p className="mt-2 text-xs text-red-400 flex items-start gap-1.5">
            <span className="shrink-0 mt-0.5">⚠</span>
            <span>{importError}</span>
          </p>
        )}
        <p className="mt-2 text-xs text-slate-600">
          Carga un JSON exportado previamente para restaurar modelos, parámetros y stopwords.
        </p>
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
        else if (ws.progress_percentage < 55) setStatusMsg('Aplicando Bolsa de Palabras…');
        else if (ws.progress_percentage < 65) setStatusMsg('Calculando TF-IDF…');
        else if (ws.progress_percentage < 75) setStatusMsg('Asignando temas…');
        else if (ws.progress_percentage < 88) setStatusMsg('Extrayendo entidades (NER)…');
        else if (ws.progress_percentage < 99) setStatusMsg('Calculando similitud BERTopic…');
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
  const [downloading, setDownloading] = useState<{ excel: boolean; config: boolean }>({
    excel: false,
    config: false,
  });

  const handleExportExcel = async () => {
    setDownloading(d => ({ ...d, excel: true }));
    try {
      await workspaceService.exportExcel(workspace.id);
    } catch {
      // Silencioso — el botón vuelve a estar disponible
    } finally {
      setDownloading(d => ({ ...d, excel: false }));
    }
  };

  const handleExportConfig = async () => {
    setDownloading(d => ({ ...d, config: true }));
    try {
      await workspaceService.exportConfig(workspace.id);
    } catch {
      // Silencioso
    } finally {
      setDownloading(d => ({ ...d, config: false }));
    }
  };

  const Section: React.FC<{ title: string; color: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, color, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div className="rounded-2xl border bg-slate-800/40 overflow-hidden" style={{ borderColor: `${color}33` }}>
        <button
          onClick={() => setOpen(!open)}
          className="w-full px-5 py-3 border-b flex items-center justify-between cursor-pointer hover:brightness-110 transition-all"
          style={{ borderColor: `${color}33`, backgroundColor: `${color}11` }}
        >
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && <div className="p-5">{children}</div>}
      </div>
    );
  };

  // Generar resumen interpretativo de temas
  const topicSummary = (() => {
    if (!results.topics?.all_topics_affinity?.length) return null;
    const sorted = [...results.topics.all_topics_affinity].sort((a, b) => b.weight - a.weight);
    const primary = sorted[0];
    const secondary = sorted.length > 1 ? sorted[1] : null;
    if (!primary) return null;

    let text = `El documento trata principalmente sobre "${primary.topic_label}" (${primary.percentage}%)`;
    if (secondary && secondary.percentage > 5) {
      text += `, con afinidad secundaria a "${secondary.topic_label}" (${secondary.percentage}%)`;
    }
    text += '.';
    return text;
  })();

  // Stats de preprocesamiento
  const stats = results.preprocessing_stats;
  const noiseFiltered = stats ? stats.total_raw_tokens - stats.total_clean_tokens : 0;
  const noisePercent = stats && stats.total_raw_tokens > 0
    ? ((noiseFiltered / stats.total_raw_tokens) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* ── Barra de acciones ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-white">Resultados de inferencia</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            {results.document_count ?? 0} documento{(results.document_count ?? 0) !== 1 ? 's' : ''} analizado{(results.document_count ?? 0) !== 1 ? 's' : ''}
            {' '}usando los modelos del corpus de referencia.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-colors"
          >
            ← Nueva análisis
          </button>
          <button
            onClick={handleExportExcel}
            disabled={downloading.excel}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
          >
            {downloading.excel ? '…' : '↓ Excel'}
          </button>
          <button
            onClick={handleExportConfig}
            disabled={downloading.config}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
          >
            {downloading.config ? '…' : '↓ Config JSON'}
          </button>
        </div>
      </div>

      {/* Resumen interpretativo */}
      {topicSummary && (
        <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/30">
          <p className="text-sm text-violet-200 font-medium">{topicSummary}</p>
        </div>
      )}

      {/* Indicador de calidad de preprocesamiento */}
      {stats && stats.total_raw_tokens > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 text-center">
            <p className="text-lg font-bold text-emerald-400">{stats.total_clean_tokens.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">Tokens útiles</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 text-center">
            <p className="text-lg font-bold text-slate-300">{stats.total_raw_tokens.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">Tokens extraídos</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 text-center">
            <p className="text-lg font-bold text-amber-400">{noisePercent}%</p>
            <p className="text-xs text-slate-400 mt-0.5">Ruido filtrado</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 text-center">
            <p className="text-lg font-bold text-white">{stats.documents_processed}</p>
            <p className="text-xs text-slate-400 mt-0.5">Docs procesados</p>
          </div>
        </div>
      )}

      {/* Documentos rechazados por idioma */}
      {results.rejected_documents && results.rejected_documents.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm font-semibold text-amber-300 mb-2">
            {results.rejected_documents.length} documento{results.rejected_documents.length !== 1 ? 's' : ''} rechazado{results.rejected_documents.length !== 1 ? 's' : ''} por idioma
          </p>
          <div className="space-y-1">
            {results.rejected_documents.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-amber-400 font-medium truncate max-w-[200px]">{d.filename}</span>
                <span className="text-slate-500">—</span>
                <span className="text-slate-400">
                  detectado: <span className="text-white font-medium">{d.detected_language}</span>
                  {' '}(esperado: {d.expected_language}, confianza: {(d.confidence * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <p className="text-xs text-slate-400 font-medium mb-2">Top 15 términos por frecuencia</p>
            {results.bow.top_terms.slice(0, 15).map((t, i) => {
              const maxScore = results.bow!.top_terms[0]?.score || 1;
              const pct = (t.score / maxScore) * 100;
              return (
                <div key={t.term} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 h-5 bg-slate-700/50 rounded overflow-hidden relative">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, rgba(139,92,246,0.7), rgba(139,92,246,${0.3 + (pct / 100) * 0.5}))`,
                      }}
                    />
                    <span className="absolute inset-y-0 left-2 flex items-center text-xs text-white font-medium">{t.term}</span>
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right font-mono">{t.score.toFixed(0)}</span>
                </div>
              );
            })}
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
            <p className="text-xs text-slate-400 font-medium mb-2">Top 15 términos por TF-IDF</p>
            {results.tfidf.top_terms.slice(0, 15).map((t, i) => {
              const maxScore = results.tfidf!.top_terms[0]?.score || 1;
              const pct = (t.score / maxScore) * 100;
              const isHighScore = pct > 70;
              return (
                <div key={t.term} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 h-5 bg-slate-700/50 rounded overflow-hidden relative">
                    <div
                      className="h-full rounded transition-all"
                      style={{
                        width: `${pct}%`,
                        background: isHighScore
                          ? 'linear-gradient(90deg, rgba(6,182,212,0.8), rgba(34,211,238,0.9))'
                          : `linear-gradient(90deg, rgba(6,182,212,0.5), rgba(6,182,212,${0.2 + (pct / 100) * 0.4}))`,
                      }}
                    />
                    <span className={`absolute inset-y-0 left-2 flex items-center text-xs font-medium ${isHighScore ? 'text-white' : 'text-slate-200'}`}>
                      {t.term}
                    </span>
                  </div>
                  <span className={`text-xs w-14 text-right font-mono ${isHighScore ? 'text-cyan-300 font-semibold' : 'text-slate-400'}`}>
                    {t.score.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Topics */}
      {results.topics && !results.topics.error && (
        <Section title={`Modelado de Temas — ${results.topics.algorithm.toUpperCase()}`} color="#f59e0b">
          {/* Distribución de temas dominantes */}
          <div className="space-y-3 mb-6">
            <p className="text-xs text-slate-400 font-medium">Distribución de temas dominantes en los nuevos documentos</p>
            {results.topics.topic_distribution.map(t => (
              <div key={t.topic_id} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-24 truncate shrink-0" title={t.topic_label || `Tema ${t.topic_id}`}>
                  {t.topic_label || `Tema ${t.topic_id}`}
                </span>
                <div className="flex-1 h-5 bg-slate-700/50 rounded overflow-hidden">
                  <div
                    className="h-full bg-amber-500/60 rounded flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(t.percentage, 3)}%` }}
                  >
                    {t.percentage >= 10 && (
                      <span className="text-xs text-amber-200 font-medium">{t.percentage}%</span>
                    )}
                  </div>
                </div>
                {t.percentage < 10 && (
                  <span className="text-xs text-amber-300 font-medium w-10">{t.percentage}%</span>
                )}
                <span className="text-xs text-slate-500 w-8 text-right shrink-0">{t.document_count}</span>
              </div>
            ))}
          </div>

          {/* Afinidad completa: Heatmap de todos los temas */}
          {results.topics.all_topics_affinity && results.topics.all_topics_affinity.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-700/50">
              <p className="text-xs text-slate-400 font-medium">Afinidad promedio con todos los temas del corpus</p>
              <div className="grid gap-2">
                {results.topics.all_topics_affinity.map(a => {
                  const maxWeight = results.topics!.all_topics_affinity[0]?.weight || 1;
                  const intensity = a.weight / maxWeight;
                  return (
                    <div key={a.topic_id} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-24 truncate shrink-0" title={a.topic_label}>
                        {a.topic_label}
                      </span>
                      <div className="flex-1 h-6 bg-slate-700/30 rounded overflow-hidden relative">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${Math.max(a.percentage, 2)}%`,
                            background: `rgba(245,158,11,${0.3 + intensity * 0.6})`,
                          }}
                        />
                        <span className="absolute inset-y-0 left-2 flex items-center text-xs text-slate-200">
                          {a.percentage}%
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {a.top_words?.slice(0, 3).map((w, wi) => (
                          <span key={wi} className="text-xs px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
                            {typeof w === 'string' ? w : w.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* NER */}
      {results.ner && !results.ner.error && (
        <Section title={`NER — ${results.ner.reference_ner_name}`} color="#10b981">
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total entidades', value: results.ner.total_entities_found.toLocaleString(), color: 'text-emerald-400' },
              { label: 'Entidades únicas', value: results.ner.unique_entities_count.toLocaleString(), color: 'text-white' },
              { label: 'Tipos analizados', value: results.ner.entity_types_used.length.toString(), color: 'text-white' },
              { label: 'Modelo spaCy', value: results.ner.spacy_model.replace('_', ' '), color: 'text-slate-300' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-3 rounded-xl bg-slate-900/50 text-center">
                <p className={`text-base font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Distribución por tipo */}
          {results.ner.entity_distribution.length > 0 && (
            <div className="space-y-2 mb-5">
              <p className="text-xs text-slate-400 font-medium mb-2">Distribución por tipo de entidad</p>
              {results.ner.entity_distribution.map(item => {
                const maxPct = results.ner!.entity_distribution[0]?.percentage || 1;
                const barWidth = (item.percentage / maxPct) * 100;
                return (
                  <div key={item.type} className="flex items-center gap-3">
                    <span className="text-xs text-slate-300 w-20 shrink-0 font-medium">{item.type}</span>
                    <div className="flex-1 h-5 bg-slate-700/50 rounded overflow-hidden relative">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${barWidth}%`, background: 'rgba(16,185,129,0.55)' }}
                      />
                      <span className="absolute inset-y-0 left-2 flex items-center text-xs text-white font-medium">
                        {item.unique_entities} únicas · {item.count} ocurrencias
                      </span>
                    </div>
                    <span className="text-xs text-emerald-300 font-mono w-10 text-right">{item.percentage.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top entidades por tipo */}
          {Object.keys(results.ner.top_entities_by_type).length > 0 && (
            <div className="border-t border-slate-700/50 pt-4">
              <p className="text-xs text-slate-400 font-medium mb-3">Top entidades por tipo</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(results.ner.top_entities_by_type).slice(0, 6).map(([type, entities]) => (
                  <div key={type} className="p-3 rounded-xl bg-slate-900/50">
                    <p className="text-xs font-semibold text-emerald-400 mb-2">{type}</p>
                    <div className="space-y-1">
                      {entities.slice(0, 5).map((e, i) => (
                        <div key={i} className="flex items-center justify-between gap-1">
                          <span className="text-xs text-slate-200 truncate">{e.text}</span>
                          <span className="text-xs text-slate-500 shrink-0 font-mono">{e.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* BERTopic Similarity */}
      {results.bertopic && !results.bertopic.error && (
        <Section title={`BERTopic — ${results.bertopic.reference_bertopic_name}`} color="#0ea5e9">
          {/* Badge de método */}
          <div className="flex items-start gap-3 mb-5 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
            <span className="text-xs font-semibold text-sky-300 bg-sky-900/60 px-2 py-0.5 rounded-full shrink-0 border border-sky-700/50">
              keyword matching
            </span>
            <p className="text-xs text-slate-400">{results.bertopic.method_note}</p>
          </div>

          {/* Distribución por tema */}
          {results.bertopic.topic_distribution.length > 0 && (
            <div className="space-y-2 mb-5">
              <p className="text-xs text-slate-400 font-medium mb-2">
                Distribución de documentos por tema ({results.bertopic.total_documents} docs)
              </p>
              {results.bertopic.topic_distribution.map(t => (
                <div key={t.topic_id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 w-28 truncate shrink-0" title={t.topic_label}>
                    {t.topic_label}
                  </span>
                  <div className="flex-1 h-5 bg-slate-700/50 rounded overflow-hidden relative">
                    <div
                      className="h-full rounded transition-all"
                      style={{ width: `${Math.max(t.percentage, 3)}%`, background: 'rgba(14,165,233,0.55)' }}
                    />
                    {t.percentage >= 10 && (
                      <span className="absolute inset-y-0 left-2 flex items-center text-xs text-white font-medium">
                        {t.percentage}%
                      </span>
                    )}
                  </div>
                  {t.percentage < 10 && (
                    <span className="text-xs text-sky-300 font-mono w-10 text-right">{t.percentage}%</span>
                  )}
                  {t.percentage >= 10 && (
                    <span className="text-xs text-slate-500 w-10 text-right font-mono">{t.percentage}%</span>
                  )}
                  <span className="text-xs text-slate-500 w-6 text-right shrink-0">{t.document_count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Asignaciones por documento */}
          {results.bertopic.document_assignments.length > 0 && (
            <div className="border-t border-slate-700/50 pt-4">
              <p className="text-xs text-slate-400 font-medium mb-3">Asignación por documento</p>
              <div className="space-y-1.5">
                {results.bertopic.document_assignments.map((da) => {
                  const simPct = Math.round(da.similarity_score * 100);
                  return (
                    <div key={da.document_index} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/40 border border-slate-700/30">
                      <span className="text-xs text-slate-500 w-5 text-right shrink-0 font-mono">
                        {da.document_index + 1}
                      </span>
                      <span className="flex-1 text-xs text-white font-medium truncate" title={da.dominant_topic_label}>
                        {da.dominant_topic_label}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 bg-slate-700 rounded overflow-hidden">
                          <div
                            className="h-full rounded"
                            style={{ width: `${simPct}%`, background: simPct >= 50 ? '#38bdf8' : simPct >= 25 ? '#7dd3fc' : '#475569' }}
                          />
                        </div>
                        <span className={`text-xs font-mono w-8 text-right ${simPct >= 50 ? 'text-sky-300' : 'text-slate-500'}`}>
                          {simPct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Error notices */}
      {[
        results.bow?.error && `BoW: ${results.bow.error}`,
        results.tfidf?.error && `TF-IDF: ${results.tfidf.error}`,
        results.topics?.error && `Temas: ${results.topics.error}`,
        results.ner?.error && `NER: ${results.ner.error}`,
        results.bertopic?.error && `BERTopic: ${results.bertopic.error}`,
      ].filter(Boolean).map((err, i) => (
        <div key={i} className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{err}</div>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

// ── Import Decision Modal ─────────────────────────────────────────────────────

interface ImportDecisionProps {
  result: ImportConfigResult & { workspace: Workspace };
  onViewResults: () => void;
  onRerun: () => void;
  onCancel: () => void;
}

const ImportDecisionModal: React.FC<ImportDecisionProps> = ({
  result,
  onViewResults,
  onRerun,
  onCancel,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Configuración importada</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Se creó un nuevo workspace con la configuración guardada.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none shrink-0"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
          <p className="text-xs font-semibold text-amber-300">
            {result.warnings.length} modelo{result.warnings.length !== 1 ? 's' : ''} no encontrado{result.warnings.length !== 1 ? 's' : ''}
          </p>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-200/80 flex items-start gap-1.5">
              <span className="shrink-0 mt-0.5">·</span>
              <span>{w}</span>
            </p>
          ))}
          <p className="text-xs text-slate-500 pt-1">
            Los modelos disponibles se mantienen; los faltantes se omitirán.
          </p>
        </div>
      )}

      {/* Sin warnings */}
      {result.warnings.length === 0 && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
          <p className="text-xs text-emerald-300">Todos los modelos del config están disponibles.</p>
        </div>
      )}

      {/* Opciones */}
      <div className="space-y-2">
        {result.has_results && (
          <button
            onClick={onViewResults}
            className="w-full px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors text-left"
          >
            <span className="block">Ver resultados anteriores</span>
            <span className="block text-xs text-violet-300 font-normal mt-0.5">
              Muestra los resultados guardados en el config, sin re-ejecutar
            </span>
          </button>
        )}
        <button
          onClick={onRerun}
          className="w-full px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-colors text-left"
        >
          <span className="block">{result.has_results ? 'Re-ejecutar con esta configuración' : 'Continuar → subir documentos'}</span>
          <span className="block text-xs text-slate-400 font-normal mt-0.5">
            Sube nuevos PDFs y ejecuta el análisis con los modelos del config
          </span>
        </button>
      </div>
    </div>
  </div>
);


// ── Main Component ────────────────────────────────────────────────────────────

export const LaboratorioDashboard: React.FC = () => {
  const { filters } = useFilter();
  const [stage, setStage] = useState<Stage>('configure');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importDecision, setImportDecision] = useState<(ImportConfigResult & { workspace: Workspace }) | null>(null);

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

  const handleImport = useCallback((result: ImportConfigResult & { workspace: Workspace }) => {
    setImportDecision(result);
  }, []);

  const handleImportViewResults = useCallback(() => {
    if (!importDecision) return;
    setWorkspace(importDecision.workspace);
    setStage('results');
    setImportDecision(null);
  }, [importDecision]);

  const handleImportRerun = useCallback(() => {
    if (!importDecision) return;
    setWorkspace(importDecision.workspace);
    setStage('upload');
    setImportDecision(null);
  }, [importDecision]);

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
      {/* Import decision modal */}
      {importDecision && (
        <ImportDecisionModal
          result={importDecision}
          onViewResults={handleImportViewResults}
          onRerun={handleImportRerun}
          onCancel={() => setImportDecision(null)}
        />
      )}

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
          <ConfigureStage datasetId={datasetId} onNext={handleConfigure} onImport={handleImport} />
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
