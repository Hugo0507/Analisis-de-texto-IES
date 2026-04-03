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

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import publicWorkspaceService, {
  Workspace,
  CreatePublicWorkspacePayload,
} from '../../services/publicWorkspaceService';
import publicDatasetsService from '../../services/publicDatasetsService';
import publicDataPreparationService from '../../services/publicDataPreparationService';
import publicBagOfWordsService from '../../services/publicBagOfWordsService';
import publicTfIdfAnalysisService from '../../services/publicTfidfAnalysisService';
import publicTopicModelingService from '../../services/publicTopicModelingService';
import publicNerAnalysisService from '../../services/publicNerAnalysisService';
import publicBertopicService from '../../services/publicBertopicService';
import type { DatasetListItem } from '../../services/datasetsService';
import type { DataPreparationListItem } from '../../services/dataPreparationService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Bar, Scatter } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  ChartTooltip,
  Legend,
);


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
  dataPreparationName: string | null;
  onNext: (payload: Omit<CreatePublicWorkspacePayload, 'dataset_id'>) => void;
}

const ConfigureStage: React.FC<ConfigureStageProps> = ({ datasetId, dataPreparationName, onNext }) => {
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
        setBertopicOptions(bertopics.map((a) => ({ id: a.id, name: `${a.name} (${a.num_topics_found ?? '?'} tópicos)` })));

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
    return <div className="text-slate-300 text-sm py-12 text-center">Cargando análisis disponibles…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Configurar sesión de análisis</h3>
        <p className="text-sm text-slate-300">
          Selecciona los modelos de referencia y personaliza las stopwords antes de subir los documentos.
        </p>
      </div>

      {/* ── Cargar configuración guardada ── */}
      <div>
        <button
          type="button"
          disabled={loading}
          onClick={() => { setImportWarnings([]); configImportRef.current?.click(); }}
          className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-600/60 text-slate-300 text-sm font-medium transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
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
        {importWarnings.length > 0 && (
          <div className="mt-2 space-y-1">
            {importWarnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-400 flex items-start gap-1.5">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>{w}</span>
              </p>
            ))}
          </div>
        )}
        {importWarnings.length === 0 && (
          <p className="mt-1.5 text-xs text-slate-600">
            Carga un JSON exportado previamente para restaurar modelos, parámetros y stopwords.
          </p>
        )}
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
              className="flex-1 text-xs bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <label className="block text-sm font-semibold text-white mb-1">
                Términos a mostrar
              </label>
              <p className="text-xs text-slate-300 mb-2">Top N en BoW / TF-IDF</p>
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
              <p className="text-xs text-slate-300 mb-2">Filtrar palabras cortas</p>
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
              <p className="text-xs text-slate-300 mt-0.5">
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
              <p className="text-xs text-slate-300 mb-3">
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
          className="px-6 py-2.5 min-h-[44px] rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-slate-900"
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
        await publicWorkspaceService.uploadDocument(workspaceId, file);
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
        <p className="text-sm text-slate-300">Solo archivos PDF · Máximo 50 MB por archivo</p>
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
        <button
          onClick={onBack}
          className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          ← Atrás
        </button>
        <button
          disabled={doneCount === 0 || uploading}
          onClick={onNext}
          className="px-6 py-2.5 min-h-[44px] rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-slate-900"
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

// Pasos del pipeline de inferencia (umbral superior de cada paso)
const PIPELINE_STEPS = [
  { label: 'Extrayendo texto de los PDFs',   maxPct: 20  },
  { label: 'Validando idioma',               maxPct: 30  },
  { label: 'Preparando inferencia',          maxPct: 40  },
  { label: 'Bolsa de Palabras',              maxPct: 55  },
  { label: 'TF-IDF',                         maxPct: 65  },
  { label: 'Asignando temas',               maxPct: 75  },
  { label: 'Entidades NER',                  maxPct: 88  },
  { label: 'Similitud BERTopic',             maxPct: 99  },
  { label: 'Completado',                     maxPct: 100 },
];

const ProcessingStage: React.FC<ProcessingStageProps> = ({ workspaceId, onDone, onError }) => {
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    // Kick off inference
    publicWorkspaceService.runInference(workspaceId).catch(() => {
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
        const ws = await publicWorkspaceService.getWorkspace(workspaceId);
        setProgress(ws.progress_percentage);

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

  // Determinar qué paso está activo según el progreso actual
  const activeStepIdx = PIPELINE_STEPS.findIndex(s => progress < s.maxPct);

  return (
    <div className="py-8 flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-10 justify-center">

      {/* Círculo de progreso */}
      <div className="flex flex-col items-center gap-3 shrink-0">
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
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
            {progress}%
          </span>
        </div>

        {errorMsg ? (
          <div className="text-center max-w-[200px]">
            <p className="text-red-400 font-semibold text-sm">Error en la inferencia</p>
            <p className="text-red-300 text-xs mt-1">{errorMsg}</p>
          </div>
        ) : (
          <p className="text-slate-400 text-xs text-center">
            {formatElapsed(elapsed)}
          </p>
        )}
      </div>

      {/* Pasos del pipeline */}
      {!errorMsg && (
        <div className="w-full sm:w-auto space-y-2 max-w-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Pipeline de inferencia
          </p>
          {PIPELINE_STEPS.map((step, i) => {
            const done   = progress >= step.maxPct;
            const active = !done && i === activeStepIdx;
            return (
              <div key={i} className="flex items-center gap-3">
                {/* Indicador */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  done   ? 'bg-emerald-500/20 border border-emerald-500/60' :
                  active ? 'bg-violet-500/20 border border-violet-400'      :
                           'bg-slate-800 border border-slate-700'
                }`}>
                  {done ? (
                    <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : active ? (
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  )}
                </div>
                {/* Label */}
                <span className={`text-sm transition-colors ${
                  done   ? 'text-emerald-400' :
                  active ? 'text-white font-medium' :
                           'text-slate-500'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Mensaje de error expandido en mobile */}
      {errorMsg && (
        <div className="w-full max-w-sm sm:hidden p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <p className="text-red-400 font-semibold text-sm">Error en la inferencia</p>
          <p className="text-red-300 text-sm mt-1">{errorMsg}</p>
        </div>
      )}
    </div>
  );
};

// ── BoW Word Cloud ─────────────────────────────────────────────────────────────

const BOW_CLOUD_W = 660;
const BOW_CLOUD_H = 300;

/** Color semántico por frecuencia relativa: naranja (alta) → amarillo → cyan → violeta (baja) */
const bowCloudColor = (ratio: number): string => {
  if (ratio >= 0.75) return '#f97316'; // naranja  — muy frecuente
  if (ratio >= 0.50) return '#eab308'; // amarillo — frecuente
  if (ratio >= 0.25) return '#22d3ee'; // cyan     — media
  return '#a78bfa';                    // violeta  — menos frecuente
};

const BoWWordCloud: React.FC<{ terms: Array<{ term: string; score: number }>; maxWords?: number }> = ({
  terms,
  maxWords = 60,
}) => {
  const layout = useMemo(() => {
    if (!terms.length) return [];
    const words  = terms.slice(0, maxWords);
    const maxVal = words[0]?.score || 1;
    const minVal = words[words.length - 1]?.score || 0;
    const range  = maxVal - minVal || 1;
    const fs = (v: number) => Math.round(11 + ((v - minVal) / range) * 29);
    type Box = { x1: number; y1: number; x2: number; y2: number };
    const placed: Box[] = [];
    const hits = (x1: number, y1: number, x2: number, y2: number) =>
      placed.some(p => x1 < p.x2 + 5 && x2 > p.x1 - 5 && y1 < p.y2 + 3 && y2 > p.y1 - 3);
    return words.map((word) => {
      const size = fs(word.score);
      const ww = word.term.length * size * 0.57;
      const wh = size * 1.25;
      let fx = BOW_CLOUD_W / 2 - ww / 2;
      let fy = BOW_CLOUD_H / 2 - wh / 2;
      for (let s = 0; s < 700; s++) {
        const x = BOW_CLOUD_W / 2 + s * 1.05 * Math.cos(s * 0.48) - ww / 2;
        const y = BOW_CLOUD_H / 2 + s * 0.62 * Math.sin(s * 0.48) - wh / 2;
        if (x < 4 || x + ww > BOW_CLOUD_W - 4 || y < 4 || y + wh > BOW_CLOUD_H - 4) continue;
        if (!hits(x, y, x + ww, y + wh)) { fx = x; fy = y; break; }
      }
      placed.push({ x1: fx, y1: fy, x2: fx + ww, y2: fy + wh });
      const ratio = (word.score - minVal) / range;
      return { word, fx, fy, size, ratio } as {
        word: { term: string; score: number };
        fx: number; fy: number; size: number; ratio: number;
      };
    });
  }, [terms, maxWords]);

  if (!layout.length) return null;
  return (
    <svg viewBox={`0 0 ${BOW_CLOUD_W} ${BOW_CLOUD_H}`} className="w-full" style={{ minHeight: '240px' }}>
      {layout.map(({ word, fx, fy, size, ratio }) => (
        <text
          key={word.term}
          x={fx} y={fy + size}
          fontSize={size}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontWeight={ratio > 0.6 ? 700 : ratio > 0.3 ? 600 : 400}
          fill={bowCloudColor(ratio)}
          fillOpacity={0.52 + ratio * 0.48}
          style={{ cursor: 'default' }}
        >
          <title>{word.term}: {word.score.toFixed(0)} ocurrencias</title>
          {word.term}
        </text>
      ))}
    </svg>
  );
};

// ── NER entity-type color map ──────────────────────────────────────────────────
// Colores fijos por tipo: el analista aprende la asociación tipo → color.

const NER_TYPE_COLORS: Record<string, string> = {
  PERSON:   'rgba(96,165,250,0.85)',   // blue-400
  PER:      'rgba(96,165,250,0.85)',
  ORG:      'rgba(251,146,60,0.85)',   // orange-400
  GPE:      'rgba(74,222,128,0.85)',   // green-400
  DATE:     'rgba(192,132,252,0.85)',  // purple-400
  LOC:      'rgba(45,212,191,0.85)',   // teal-400
  FAC:      'rgba(251,191,36,0.85)',   // amber-400
  NORP:     'rgba(244,114,182,0.85)',  // pink-400
  PRODUCT:  'rgba(56,189,248,0.85)',   // sky-400
  EVENT:    'rgba(245,158,11,0.85)',   // amber-500
  MONEY:    'rgba(163,230,53,0.85)',   // lime-400
  TIME:     'rgba(232,121,249,0.85)',  // fuchsia-400
  PERCENT:  'rgba(52,211,153,0.85)',   // emerald-400
  CARDINAL: 'rgba(148,163,184,0.85)', // slate-400
  ORDINAL:  'rgba(100,116,139,0.85)', // slate-500
  QUANTITY: 'rgba(34,211,238,0.85)',  // cyan-400
  WORK_OF_ART: 'rgba(248,113,113,0.85)', // red-400
  LAW:      'rgba(167,139,250,0.85)', // violet-400
  LANGUAGE: 'rgba(94,234,212,0.85)',  // teal-300
};
const getNerChartColor = (type: string): string =>
  NER_TYPE_COLORS[type.toUpperCase()] ?? 'rgba(148,163,184,0.85)';

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
      await publicWorkspaceService.exportExcel(workspace.id);
    } catch {
      // Silencioso — el botón vuelve a estar disponible
    } finally {
      setDownloading(d => ({ ...d, excel: false }));
    }
  };

  const handleExportConfig = async () => {
    setDownloading(d => ({ ...d, config: true }));
    try {
      await publicWorkspaceService.exportConfig(workspace.id);
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
          <p className="text-sm text-slate-300 mt-0.5">
            {results.document_count ?? 0} documento{(results.document_count ?? 0) !== 1 ? 's' : ''} analizado{(results.document_count ?? 0) !== 1 ? 's' : ''}
            {' '}usando los modelos del corpus de referencia.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={onReset}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            ← Nueva análisis
          </button>
          <button
            onClick={handleExportExcel}
            disabled={downloading.excel}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {downloading.excel ? '…' : '↓ Excel'}
          </button>
          <button
            onClick={handleExportConfig}
            disabled={downloading.config}
            className="px-4 py-2 min-h-[44px] rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
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
            <p className="text-xs text-slate-300 mt-0.5">Tokens útiles</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 text-center">
            <p className="text-lg font-bold text-slate-300">{stats.total_raw_tokens.toLocaleString()}</p>
            <p className="text-xs text-slate-300 mt-0.5">Tokens extraídos</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 text-center">
            <p className="text-lg font-bold text-amber-400">{noisePercent}%</p>
            <p className="text-xs text-slate-300 mt-0.5">Ruido filtrado</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 text-center">
            <p className="text-lg font-bold text-white">{stats.documents_processed}</p>
            <p className="text-xs text-slate-300 mt-0.5">Docs procesados</p>
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
                <span className="text-slate-300">
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
                <p className="text-xs text-slate-300 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {/* Nube de palabras — SVG espiral, colores por frecuencia */}
          <div className="mb-5 p-4 rounded-xl bg-slate-900/40 border border-violet-800/20">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <p className="text-xs text-slate-400 font-medium">
                Nube de palabras — top {Math.min(results.bow!.top_terms.length, 60)} términos
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#f97316' }} />
                  Alta
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#eab308' }} />
                  Media-alta
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#22d3ee' }} />
                  Media
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#a78bfa' }} />
                  Baja
                </span>
              </div>
            </div>
            <BoWWordCloud terms={results.bow!.top_terms} maxWords={60} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-slate-300 font-medium mb-2">Top 15 términos por frecuencia</p>
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
                <p className="text-xs text-slate-300 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {/* Scatter: rango vs. peso TF-IDF */}
          <div className="mb-5 p-3 rounded-xl bg-slate-900/40 border border-cyan-800/20" style={{ height: 260 }}>
            <p className="text-xs text-slate-400 font-medium mb-2">Rango vs. peso TF-IDF (scatter)</p>
            <div style={{ height: 210 }}>
              <Scatter
                data={{
                  datasets: [{
                    label: 'TF-IDF',
                    data: results.tfidf!.top_terms.map((t, i) => ({ x: i + 1, y: t.score })),
                    backgroundColor: 'rgba(6,182,212,0.75)',
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBorderColor: 'transparent',
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const idx = ctx.dataIndex;
                          const term = results.tfidf!.top_terms[idx]?.term ?? '';
                          return ` ${term}: ${(ctx.parsed.y as number).toFixed(4)}`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      title: { display: true, text: 'Rango', color: '#94a3b8', font: { size: 10 } },
                      ticks: { color: '#94a3b8', font: { size: 10 } },
                      grid: { color: 'rgba(148,163,184,0.08)' },
                    },
                    y: {
                      title: { display: true, text: 'Peso TF-IDF', color: '#94a3b8', font: { size: 10 } },
                      ticks: { color: '#94a3b8', font: { size: 10 } },
                      grid: { color: 'rgba(148,163,184,0.08)' },
                    },
                  },
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-slate-300 font-medium mb-2">Top 15 términos por TF-IDF</p>
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
          {/* Donut: distribución de temas dominantes */}
          {results.topics!.topic_distribution.length > 0 && (
            <div className="mb-5 p-3 rounded-xl bg-slate-900/40 border border-amber-800/20" style={{ height: 260 }}>
              <p className="text-xs text-slate-400 font-medium mb-2">Distribución de temas (% documentos)</p>
              <div style={{ height: 210 }}>
                <Doughnut
                  data={{
                    labels: results.topics!.topic_distribution.map(t => t.topic_label || `Tema ${t.topic_id}`),
                    datasets: [{
                      data: results.topics!.topic_distribution.map(t => t.percentage),
                      backgroundColor: [
                        'rgba(245,158,11,0.82)',
                        'rgba(251,191,36,0.82)',
                        'rgba(217,119,6,0.82)',
                        'rgba(180,83,9,0.82)',
                        'rgba(161,98,7,0.82)',
                        'rgba(120,53,15,0.82)',
                        'rgba(234,88,12,0.82)',
                        'rgba(194,65,12,0.82)',
                      ],
                      borderColor: 'rgba(15,23,42,0.6)',
                      borderWidth: 2,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '58%',
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: { color: '#cbd5e1', font: { size: 10 }, boxWidth: 12, padding: 6 },
                      },
                      tooltip: {
                        callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}%` },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}
          {/* Distribución de temas dominantes */}
          <div className="space-y-3 mb-6">
            <p className="text-xs text-slate-300 font-medium">Distribución de temas dominantes en los nuevos documentos</p>
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
              <p className="text-xs text-slate-300 font-medium">Afinidad promedio con todos los temas del corpus</p>
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
                <p className="text-xs text-slate-300 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Donut: distribución por tipo de entidad */}
          {results.ner!.entity_distribution.length > 0 && (
            <div className="mb-5 p-3 rounded-xl bg-slate-900/40 border border-emerald-800/20" style={{ height: 260 }}>
              <p className="text-xs text-slate-400 font-medium mb-2">Distribución por tipo de entidad</p>
              <div style={{ height: 210 }}>
                <Doughnut
                  data={{
                    labels: results.ner!.entity_distribution.map(e => e.type),
                    datasets: [{
                      data: results.ner!.entity_distribution.map(e => e.count),
                      backgroundColor: results.ner!.entity_distribution.map(e => getNerChartColor(e.type)),
                      borderColor: 'rgba(15,23,42,0.6)',
                      borderWidth: 2,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '58%',
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          color: '#cbd5e1',
                          font: { size: 10 },
                          boxWidth: 12,
                          padding: 6,
                          generateLabels: (chart) => {
                            const ds = chart.data.datasets[0];
                            return (chart.data.labels as string[]).map((label, i) => ({
                              text: label,
                              fillStyle: (ds.backgroundColor as string[])[i],
                              strokeStyle: 'rgba(15,23,42,0.6)',
                              lineWidth: 1,
                              hidden: false,
                              index: i,
                            }));
                          },
                        },
                      },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => ` ${ctx.label}: ${ctx.raw} ocurrencias`,
                          labelColor: (ctx) => ({
                            borderColor: 'transparent',
                            backgroundColor: getNerChartColor(results.ner!.entity_distribution[ctx.dataIndex]?.type ?? ''),
                          }),
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}
          {/* Distribución por tipo */}
          {results.ner.entity_distribution.length > 0 && (
            <div className="space-y-2 mb-5">
              <p className="text-xs text-slate-300 font-medium mb-2">Distribución por tipo de entidad</p>
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
              <p className="text-xs text-slate-300 font-medium mb-3">Top entidades por tipo</p>
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

          {/* Horizontal bar: distribución de documentos por tema */}
          {results.bertopic!.topic_distribution.length > 0 && (
            <div
              className="mb-5 p-3 rounded-xl bg-slate-900/40 border border-sky-800/20"
              style={{ height: Math.max(180, results.bertopic!.topic_distribution.length * 38 + 50) }}
            >
              <p className="text-xs text-slate-400 font-medium mb-2">Documentos por tema (BERTopic)</p>
              <div style={{ height: Math.max(140, results.bertopic!.topic_distribution.length * 38) }}>
                <Bar
                  data={{
                    labels: results.bertopic!.topic_distribution.map(t => t.topic_label),
                    datasets: [{
                      label: 'Documentos',
                      data: results.bertopic!.topic_distribution.map(t => t.document_count),
                      backgroundColor: 'rgba(14,165,233,0.72)',
                      borderColor: 'rgba(56,189,248,0.9)',
                      borderWidth: 1,
                      borderRadius: 4,
                    }],
                  }}
                  options={{
                    indexAxis: 'y' as const,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: { label: (ctx) => ` ${ctx.raw} documento${(ctx.raw as number) !== 1 ? 's' : ''}` },
                      },
                    },
                    scales: {
                      x: {
                        ticks: { color: '#94a3b8', font: { size: 10 } },
                        grid: { color: 'rgba(148,163,184,0.08)' },
                      },
                      y: {
                        ticks: { color: '#cbd5e1', font: { size: 10 } },
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}
          {/* Distribución por tema */}
          {results.bertopic.topic_distribution.length > 0 && (
            <div className="space-y-2 mb-5">
              <p className="text-xs text-slate-300 font-medium mb-2">
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
              <p className="text-xs text-slate-300 font-medium mb-3">Asignación por documento</p>
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

export const LaboratorioDashboard: React.FC = () => {
  const [stage, setStage] = useState<Stage>('configure');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setStage('results');
  }, []);

  const handleReset = useCallback(() => {
    setWorkspace(null);
    setError(null);
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
          />
        )}
        {stage === 'configure' && !selectedDatasetId && (
          <p className="text-slate-400 text-sm text-center py-8">Selecciona un dataset para continuar.</p>
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
