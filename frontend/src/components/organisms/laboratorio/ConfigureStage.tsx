/**
 * Etapa de configuracion: eleccion de corpus, modelos y parametros.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { AnalysisOption } from './types';
import publicWorkspaceService, {
  Workspace,
  WorkspaceResults,
  CreatePublicWorkspacePayload,
} from '../../../services/publicWorkspaceService';
import publicBagOfWordsService from '../../../services/publicBagOfWordsService';
import publicTfIdfAnalysisService from '../../../services/publicTfidfAnalysisService';
import publicTopicModelingService from '../../../services/publicTopicModelingService';
import publicNerAnalysisService from '../../../services/publicNerAnalysisService';
import publicBertopicService from '../../../services/publicBertopicService';

export interface ConfigureStageProps {
  datasetId: number;
  dataPreparationName: string | null;
  onNext: (payload: Omit<CreatePublicWorkspacePayload, 'dataset_id'>) => void;
  onViewImportedResults: (ws: Workspace) => void;
}

export const ConfigureStage: React.FC<ConfigureStageProps> = ({ datasetId, dataPreparationName, onNext, onViewImportedResults }) => {
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

  // Import config JSON
  const configImportRef = useRef<HTMLInputElement>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedWorkspace, setImportedWorkspace] = useState<Workspace | null>(null);


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
        const [allBows, allTfidfs, allTopics, allNers, allBertopics] = await Promise.all([
          publicBagOfWordsService.getBagOfWords(datasetId),
          publicTfIdfAnalysisService.getTfIdfAnalyses(datasetId),
          publicTopicModelingService.getTopicModelings(datasetId),
          publicNerAnalysisService.getNerAnalyses(datasetId),
          publicBertopicService.getBERTopicAnalyses(datasetId),
        ]);

        // Filter by completion and optionally by DataPreparation name (B4)
        const matchDP = (sourceName: string, srcType: string) => {
          if (!dataPreparationName) return true;
          if (srcType === 'dataset') return true;
          return sourceName === dataPreparationName;
        };

        const bows = allBows
          .filter((a) => a.status === 'completed' && a.has_artifact && (!dataPreparationName || a.data_preparation_name === dataPreparationName))
          .sort((a, b) => a.name.localeCompare(b.name));
        const tfidfs = allTfidfs
          .filter((a) => a.status === 'completed' && a.has_artifact && matchDP(a.source_name, a.source_type))
          .sort((a, b) => a.name.localeCompare(b.name));
        const topics = allTopics
          .filter((a) => a.status === 'completed' && a.has_artifact && matchDP(a.source_name, a.source_type))
          .sort((a, b) => a.name.localeCompare(b.name));
        const ners = allNers
          .filter((a) => a.status === 'completed' && matchDP(a.source_name, a.source_type))
          .sort((a, b) => a.name.localeCompare(b.name));
        const bertopics = allBertopics
          .filter((a) => a.status === 'completed' && matchDP(a.source_name, a.source_type))
          .sort((a, b) => a.name.localeCompare(b.name));

        setBowOptions(bows.map((a) => ({ id: a.id, name: a.name })));
        setTfidfOptions(tfidfs.map((a) => ({ id: a.id, name: a.name })));
        setTopicOptions(topics.map((a) => ({ id: a.id, name: `${a.name} (${a.algorithm_display})` })));
        setNerOptions(ners.map((a) => ({ id: a.id, name: `${a.name} (${a.spacy_model_label || a.spacy_model})`, selectedEntities: [] })));
        setBertopicOptions(bertopics.map((a) => ({ id: a.id, name: `${a.name} (${a.num_topics_found ?? '?'} temas)` })));

        if (bows.length > 0) setSelectedBow(bows[0].id);
        if (tfidfs.length > 0) setSelectedTfidf(tfidfs[0].id);
        if (topics.length > 0) setSelectedTopic(topics[0].id);
      } catch (err) {
        console.error('Error cargando análisis disponibles:', err);
      } finally {
        setLoading(false);
      }

      try {
        const sw = await publicWorkspaceService.getCorpusStopwords(datasetId);
        setCorpusStopwords(sw);
      } catch {
        // No crítico — se omite si falla
      }
    };
    load();
  }, [datasetId, dataPreparationName]);

  // Limpiar workspace importado al cambiar dataset/DataPrep
  useEffect(() => {
    setImportedWorkspace(null);
    setImportSuccess(false);
    setImportWarnings([]);
  }, [datasetId, dataPreparationName]);

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
    if (!w) return;
    if (!customStopwords.includes(w)) {
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
        const combined = new Set([...prev, ...words]);
        return [...combined].sort();
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Importar config JSON localmente (sin backend autenticado)
  const handleConfigImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportWarnings([]);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(ev.target?.result as string);
      } catch {
        setImportWarnings(['El archivo no es un JSON válido.']);
        return;
      }
      if (!parsed.schema_version || !parsed.models) {
        setImportWarnings(['El archivo no parece ser una configuración exportada del Laboratorio.']);
        return;
      }

      const models = parsed.models as Record<string, { id: number | null; name: string | null } | null>;
      const warns: string[] = [];

      const applyModel = (
        field: string,
        options: AnalysisOption[],
        setter: (v: number | null) => void,
        label: string,
      ) => {
        const entry = models[field];
        if (!entry?.id) return;
        const found = options.find((o) => o.id === entry.id);
        if (found) {
          setter(entry.id);
        } else {
          warns.push(`${label} "${entry.name ?? entry.id}" no encontrado en el dataset actual.`);
        }
      };

      applyModel('bow',         bowOptions,      setSelectedBow,      'BoW');
      applyModel('tfidf',       tfidfOptions,    setSelectedTfidf,    'TF-IDF');
      applyModel('topic_model', topicOptions,    setSelectedTopic,    'Modelo de temas');
      applyModel('ner',         nerOptions,      setSelectedNer,      'NER');
      applyModel('bertopic',    bertopicOptions, setSelectedBertopic, 'BERTopic');

      // Restore stopwords and inference params
      const sw = parsed.custom_stopwords as string[] | undefined;
      if (Array.isArray(sw) && sw.length > 0) {
        setCustomStopwords(sw.slice().sort());
      }
      const params = parsed.inference_params as Record<string, unknown> | undefined;
      if (params) {
        if (typeof params.num_top_terms === 'number') setNumTopTerms(params.num_top_terms);
        if (typeof params.min_word_length === 'number') setMinWordLength(params.min_word_length);
        if (typeof params.strip_references === 'boolean') setStripReferences(params.strip_references);
        if (Array.isArray(params.ner_entity_types)) setNerEntityTypes(params.ner_entity_types as string[]);
      }

      setImportWarnings(warns);
      setImportSuccess(true);

      // Build in-memory workspace if the JSON has results — enables "Ver resultados anteriores"
      const rawResults = parsed.results as Record<string, unknown> | undefined;
      const hasResults = rawResults && (rawResults.bow || rawResults.tfidf || rawResults.topics || rawResults.ner || rawResults.bertopic);
      if (hasResults) {
        const r = rawResults as unknown as WorkspaceResults;
        setImportedWorkspace({
          id: (parsed.workspace_id as string) || 'imported',
          dataset: datasetId,
          dataset_name: (parsed.dataset_name as string) || '',
          bow_id: models.bow?.id ?? null,
          tfidf_id: models.tfidf?.id ?? null,
          topic_model_id: models.topic_model?.id ?? null,
          ner_id: models.ner?.id ?? null,
          bertopic_id: models.bertopic?.id ?? null,
          custom_stopwords: (parsed.custom_stopwords as string[]) || [],
          inference_params: (parsed.inference_params as Record<string, unknown>) || {},
          status: 'completed',
          progress_percentage: 100,
          error_message: null,
          results: r,
          documents: [],
          document_count: r.document_count ?? 0,
          created_at: (parsed.created_at as string) || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          expires_at: null,
        });
      } else {
        setImportedWorkspace(null);
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
    <div className="flex items-start gap-4 p-4 rounded-xl bg-ink-850/50 border border-ink-700/50">
      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${accentColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white mb-1">{label}</p>
        {options.length === 0 ? (
          <p className="text-xs text-amber-400">{noOptionsMsg}</p>
        ) : (
          <select
            value={value ?? ''}
            onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className="w-full text-xs bg-ink-900 border border-ink-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">(ninguno — opcional)</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
      </div>
    </div>
  );

  if (loading) {
    return <div className="text-haze text-sm py-12 text-center">Cargando análisis disponibles…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Configurar sesión de análisis</h3>
        <p className="text-sm text-haze">
          Selecciona los modelos de referencia y personaliza las stopwords antes de subir los documentos.
        </p>
      </div>

      {/* ── Cargar configuración guardada ── */}
      <div>
        <button
          type="button"
          disabled={loading}
          onClick={() => { setImportWarnings([]); configImportRef.current?.click(); }}
          className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-ink-850 hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed border border-ink-600/60 text-haze text-sm font-medium transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-mist focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Cargar configuración guardada (.json)
        </button>
        <input
          ref={configImportRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleConfigImport}
        />
        {importSuccess && importWarnings.length === 0 && (
          <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
            <span>&#10003;</span>
            <span>Configuración aplicada — modelos, stopwords y parámetros restaurados.</span>
          </p>
        )}
        {importWarnings.length > 0 && (
          <div className="mt-2 space-y-1">
            {importSuccess && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 mb-1">
                <span>&#10003;</span>
                <span>Configuración aplicada con advertencias:</span>
              </p>
            )}
            {importWarnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-400 flex items-start gap-1.5">
                <span className="shrink-0 mt-0.5">&#9888;</span>
                <span>{w}</span>
              </p>
            ))}
          </div>
        )}
        {importSuccess && importedWorkspace && (
          <button
            type="button"
            onClick={() => onViewImportedResults(importedWorkspace)}
            className="mt-3 w-full px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors text-left focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <span className="block">Ver resultados anteriores</span>
            <span className="block text-xs text-violet-300 font-normal mt-0.5">
              Muestra los resultados guardados en el JSON, sin re-ejecutar
            </span>
          </button>
        )}
        {!importSuccess && importWarnings.length === 0 && (
          <p className="mt-1.5 text-xs text-fog">
            Carga un JSON exportado previamente para restaurar modelos, parámetros y stopwords.
          </p>
        )}
      </div>

      {/* ── Sección A: Modelos ── */}
      <div>
        <p className="text-xs font-semibold text-mist uppercase tracking-wider mb-3">
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
            <p className="text-xs text-fog italic pl-6">
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
        <p className="text-xs font-semibold text-mist uppercase tracking-wider mb-3">
          B — Stopwords
        </p>

        {/* Corpus stopwords (read-only) */}
        <div className="p-4 rounded-xl bg-ink-900/60 border border-ink-700/50 mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-mist">
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
            <p className="text-xs text-fog italic">No se pudieron cargar las stopwords del corpus.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {(corpusExpanded ? corpusStopwords : corpusStopwords.slice(0, 20)).map(w => (
                <span key={w} className="text-xs px-2 py-0.5 rounded-full bg-ink-850 text-fog border border-ink-700">
                  {w}
                </span>
              ))}
              {!corpusExpanded && corpusStopwords.length > 20 && (
                <span className="text-xs text-fog self-center">
                  +{corpusStopwords.length - 20} más…
                </span>
              )}
            </div>
          )}
        </div>

        {/* Custom stopwords editor */}
        <div className="p-4 rounded-xl bg-ink-850/50 border border-ink-700/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-mist">
              Stopwords propias ({customStopwords.length})
            </p>
            <button
              type="button"
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
              className="flex-1 text-xs bg-ink-900 border border-ink-600 rounded-lg px-3 py-2 text-white placeholder-fog focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              type="button"
              onClick={addCustomStopword}
              className="px-3 py-2 rounded-lg bg-violet-700 hover:bg-violet-600 text-white text-xs font-semibold transition-colors"
            >
              Añadir
            </button>
          </div>
        </div>

        <p className="text-xs text-fog mt-1.5">
          {corpusStopwords.length} corpus + {customStopwords.length} propias = {corpusStopwords.length + customStopwords.length} stopwords en total
        </p>
      </div>

      {/* ── Sección C: Parámetros ── */}
      <div>
        <p className="text-xs font-semibold text-mist uppercase tracking-wider mb-3">
          C — Parámetros de inferencia
        </p>
        <div className="space-y-3">

          {/* Fila: num_top_terms + min_word_length */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-ink-850/50 border border-ink-700/50">
              <label className="block text-sm font-semibold text-white mb-1">
                Términos a mostrar
              </label>
              <p className="text-xs text-haze mb-2">Top N en BoW / TF-IDF</p>
              <input
                type="number"
                min={10}
                max={200}
                value={numTopTerms}
                onChange={e => setNumTopTerms(Math.min(200, Math.max(10, Number(e.target.value))))}
                className="w-full text-sm bg-ink-900 border border-ink-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-fog mt-1">Rango: 10 – 200</p>
            </div>

            <div className="p-4 rounded-xl bg-ink-850/50 border border-ink-700/50">
              <label className="block text-sm font-semibold text-white mb-1">
                Long. mínima de token
              </label>
              <p className="text-xs text-haze mb-2">Filtrar palabras cortas</p>
              <input
                type="number"
                min={1}
                max={5}
                value={minWordLength}
                onChange={e => setMinWordLength(Math.min(5, Math.max(1, Number(e.target.value))))}
                className="w-full text-sm bg-ink-900 border border-ink-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-fog mt-1">Rango: 1 – 5 caracteres</p>
            </div>
          </div>

          {/* strip_references toggle */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-ink-850/50 border border-ink-700/50">
            <div>
              <p className="text-sm font-semibold text-white">Cortar sección de referencias</p>
              <p className="text-xs text-haze mt-0.5">
                Elimina automáticamente la bibliografía al final del PDF antes de analizar
              </p>
            </div>
            <button
              onClick={() => setStripReferences(v => !v)}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${stripReferences ? 'bg-violet-600' : 'bg-ink-800'}`}
              role="switch"
              aria-checked={stripReferences}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${stripReferences ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* ner_entity_types checkboxes — solo visible si hay NER seleccionado */}
          {selectedNer != null && (
            <div className="p-4 rounded-xl bg-ink-850/50 border border-ink-700/50">
              <p className="text-sm font-semibold text-white mb-1">Tipos de entidad NER</p>
              <p className="text-xs text-haze mb-3">
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
                          : 'bg-ink-900/60 text-fog border-ink-700/50'
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
          className="px-6 py-2.5 min-h-[44px] rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Continuar →
        </button>
      </div>

    </div>
  );
};

// ── Stage 2: Upload ───────────────────────────────────────────────────────────
