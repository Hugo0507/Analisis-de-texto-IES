/**
 * VectorizacionDashboard - Vectorization visualization dashboard
 *
 * Features:
 * - Clickable word cloud ↔ full vocabulary table toggle
 * - N-gram tabs by size (bigrams, trigrams, etc.)
 * - TF vs IDF scatter plot
 * - WordDetailPanel slide-in on term click
 * - Export: complete vocabulary CSV, complete TF-IDF CSV, complete n-grams CSV, JSON, Python dict
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardGrid } from '../organisms';
import { ChartCard } from '../molecules';
import { useFilter } from '../../contexts/FilterContext';
import publicTfidfAnalysisService from '../../services/publicTfidfAnalysisService';
import type { DocTermMatrix } from '../../services/publicTfidfAnalysisService';
import { downloadFile, escapeCsvField } from '../../utils/download';
import { useVectorizationData } from '../../hooks/useVectorizationData';
import {
  SimpleWordCloud,
  VocabularyTable,
  HorizontalBarChart,
  TfIdfScatter,
  DownloadIcon,
  CloseIcon,
  TableIcon,
  CloudIcon,
  WordDetailPanel,
  ExportModal,
  getNgramLabel,
  CompareSection,
  HeatmapSection,
  CooccurrenceSection,
} from '../organisms/vectorizacion';
import type {
  SelectedTerm,
  ScatterPoint,
  HeatmapDataRow,
  ComparacionItem,
} from '../organisms/vectorizacion';

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Export utilities (COMPLETE data) ────────────────────────────────────────

// ─── Icons ────────────────────────────────────────────────────────────────────

// ─── ExportModal ──────────────────────────────────────────────────────────────

// ─── SimpleWordCloud (SVG — compatible con descarga PNG) ─────────────────────

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const VectorizacionDashboard: React.FC = () => {
  const [selectedTerm, setSelectedTerm] = useState<SelectedTerm | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [vocabView, setVocabView]     = useState<'cloud' | 'table'>('cloud');
  const [activeNgramConfig, setActiveNgramConfig] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'analysis' | 'compare' | 'heatmap' | 'cooccurrence' | 'zipf'>('analysis');
  const [idfRange, setIdfRange] = useState<[number, number]>([0, 1]);
  const [heatmapMode, setHeatmapMode] = useState<'metrics' | 'docterm'>('metrics');
  const [docTermMatrix, setDocTermMatrix] = useState<DocTermMatrix | null>(null);
  const [docTermLoading, setDocTermLoading] = useState(false);
  const [compareTerms, setCompareTerms] = useState<string[]>([]);
  const [showComparator, setShowComparator] = useState(false);
  const { filters, setSelectedBow, setSelectedNgram, setSelectedTfidf } = useFilter();

  const { data, isLoading, error, refetch } = useVectorizationData(setIdfRange);

  useEffect(() => {
    setSelectedTerm(null);
    setVocabView('cloud');
    setActiveNgramConfig(null);
    setActiveSection('analysis');
    setIdfRange([0, 1]);
    setHeatmapMode('metrics');
    setDocTermMatrix(null);
    setCompareTerms([]);
    setShowComparator(false);
  }, [filters.selectedDatasetId]);

  // ── VIZ-3: Fetch doc-term matrix when heatmap section is active in docterm mode ──
  useEffect(() => {
    if (activeSection !== 'heatmap' || heatmapMode !== 'docterm') return;
    const tfidfId = filters.selectedTfidfId ?? data?.selectedTfidf?.id;
    if (!tfidfId || docTermMatrix) return;
    setDocTermLoading(true);
    publicTfidfAnalysisService.getDocTermMatrix(tfidfId)
      .then(m => setDocTermMatrix(m))
      .catch(err => console.error('Doc-term matrix fetch error:', err))
      .finally(() => setDocTermLoading(false));
  }, [activeSection, heatmapMode, filters.selectedTfidfId, data?.selectedTfidf?.id, docTermMatrix]);

  // Reset doc-term matrix when TF-IDF selection changes
  useEffect(() => {
    setDocTermMatrix(null);
  }, [filters.selectedTfidfId]);

  // ── N-gram configurations ──
  const ngramConfigs = useMemo(() => {
    if (!data?.selectedNgram?.results) return [];
    return Object.entries(data.selectedNgram.results).map(([key, result]) => ({
      key,
      label: getNgramLabel(result.ngram_range || [1, 1]),
      terms: (result.top_terms || []).map(t => ({ id: t.term, label: t.term, value: t.score })),
      vocabSize: result.vocabulary_size,
    }));
  }, [data?.selectedNgram]);

  const activeConfig = ngramConfigs.find(c => c.key === activeNgramConfig) || ngramConfigs[0];
  const activeNgramTerms = activeConfig?.terms || data?.ngramBarData || [];

  // ── Scatter data: TF (from tf_matrix) × IDF (from idf_vector) ──
  const scatterData = useMemo<ScatterPoint[]>(() => {
    const tfidf = data?.selectedTfidf;
    if (!tfidf) return [];
    const tfMap     = new Map((tfidf.tf_matrix?.top_terms_by_tf  || []).map(t => [t.term, t.score]));
    const tfidfMap  = new Map((tfidf.tfidf_matrix?.top_terms     || []).map(t => [t.term, t.score]));
    const idfValues = tfidf.idf_vector?.idf_values || {};
    return Object.entries(idfValues)
      .filter(([term]) => tfMap.has(term))
      .map(([term, idf]) => ({
        term,
        tf:    tfMap.get(term)    || 0,
        idf,
        tfidf: tfidfMap.get(term) || 0,
      }))
      .sort((a, b) => b.tfidf - a.tfidf)
      .slice(0, 200); // top 200 by TF-IDF for clarity
  }, [data?.selectedTfidf]);

  // ── Vocabulary for table (full, from bow.vocabulary) ──
  const fullVocabulary = data?.selectedBow?.vocabulary || {};
  const idfValues      = data?.selectedTfidf?.idf_vector?.idf_values || {};
  const tfidfScoresMap = useMemo(() => {
    const m: Record<string, number> = {};
    (data?.selectedTfidf?.tfidf_matrix?.top_terms || []).forEach(t => { m[t.term] = t.score; });
    return m;
  }, [data?.selectedTfidf]);

  // ── Heatmap data: rows=metrics, cols=top terms ──
  const heatmapData = useMemo<HeatmapDataRow[]>(() => {
    if (!data?.selectedBow && !data?.selectedTfidf) return [];
    const topTerms = (data?.tfidfTopTerms?.length ? data.tfidfTopTerms : data?.selectedBow?.top_terms || [])
      .slice(0, 15).map(t => t.term);
    if (topTerms.length === 0) return [];
    const bowVocab = data?.selectedBow?.vocabulary || {};
    const maxBow   = Math.max(...topTerms.map(t => bowVocab[t] || 0)) || 1;
    const idfMap   = data?.selectedTfidf?.idf_vector?.idf_values || {};
    const maxIdf   = Math.max(...topTerms.map(t => idfMap[t] || 0)) || 1;
    const tfidfMap = new Map((data?.tfidfTopTerms || []).map(t => [t.term, t.score]));
    const maxTfidf = Math.max(...topTerms.map(t => tfidfMap.get(t) || 0)) || 1;
    const rows: HeatmapDataRow[] = [];
    if (Object.keys(bowVocab).length > 0)
      rows.push({ id: 'BoW Freq', data: topTerms.map(t => ({ x: t, y: Math.round(((bowVocab[t] || 0) / maxBow) * 100) })) });
    if (Object.keys(idfMap).length > 0)
      rows.push({ id: 'IDF', data: topTerms.map(t => ({ x: t, y: Math.round(((idfMap[t] || 0) / maxIdf) * 100) })) });
    if (tfidfMap.size > 0)
      rows.push({ id: 'TF-IDF', data: topTerms.map(t => ({ x: t, y: Math.round(((tfidfMap.get(t) || 0) / maxTfidf) * 100) })) });
    return rows;
  }, [data]);

  // ── Co-occurrence graph: from bigrams (any config that has multi-word terms) ──
  const cooccurrenceData = useMemo(() => {
    const availableConfigs = ngramConfigs.map(c => c.key);
    // 1. Prefer explicit bigram config [2,2]
    let bigramTerms = (ngramConfigs.find(c => c.key === '2_2') || ngramConfigs.find(c => c.label === 'Bigramas'))?.terms || [];
    // 2. Fallback: gather all multi-word terms from any config (handles [1,2] mixed configs)
    if (bigramTerms.length === 0) {
      bigramTerms = ngramConfigs.flatMap(c => c.terms.filter(t => t.id.trim().includes(' ')));
    }
    if (bigramTerms.length === 0) return { nodes: [], links: [], availableConfigs };
    const top       = bigramTerms.slice(0, 35);
    const maxVal    = Math.max(...top.map(t => t.value)) || 1;
    const nodeSet   = new Map<string, number>();
    const links: Array<{ source: string; target: string; distance: number; thickness: number }> = [];
    top.forEach(bg => {
      const parts = bg.id.trim().split(/\s+/);
      if (parts.length < 2) return;
      const [a, b] = [parts[0], parts[parts.length - 1]];
      nodeSet.set(a, (nodeSet.get(a) || 0) + bg.value);
      nodeSet.set(b, (nodeSet.get(b) || 0) + bg.value);
      links.push({ source: a, target: b, distance: 80 + (1 - bg.value / maxVal) * 60, thickness: 1 + (bg.value / maxVal) * 3 });
    });
    const maxNode = Math.max(...nodeSet.values()) || 1;
    const COLORS  = ['#06b6d4','#8b5cf6','#10b981','#f59e0b','#ec4899','#3b82f6','#2dd4bf','#f472b6'];
    const nodes   = Array.from(nodeSet.entries()).map(([id, freq], i) => ({
      id, size: 10 + (freq / maxNode) * 18, color: COLORS[i % COLORS.length],
    }));
    return { nodes, links, availableConfigs };
  }, [ngramConfigs]);

  // ── Comparar: shared terms ranked in BoW and TF-IDF ──
  const comparacionData = useMemo<ComparacionItem[]>(() => {
    if (!data?.selectedBow || !data?.tfidfTopTerms?.length) return [];
    const bowTerms  = data.selectedBow.top_terms || [];
    const tfidfMap  = new Map((data.tfidfTopTerms || []).map(t => [t.term, t]));
    return bowTerms
      .filter(t => tfidfMap.has(t.term))
      .slice(0, 30)
      .map(t => ({
        term: t.term,
        bowFreq: t.score,
        bowRank: t.rank,
        tfidfScore: tfidfMap.get(t.term)!.score,
        tfidfRank:  tfidfMap.get(t.term)!.rank,
        rankDiff: t.rank - tfidfMap.get(t.term)!.rank,
      }));
  }, [data]);

  // ── Max scores ──
  const maxBowScore   = useMemo(() => Math.max(...(data?.selectedBow?.top_terms?.map(t => t.score) || [0])), [data]);
  const maxTfidfScore = useMemo(() => Math.max(...(data?.tfidfTopTerms?.map(t => t.score)         || [0])), [data]);

  // ── VIZ-2: Zipf data (rank vs frequency, log-log) ──
  const zipfData = useMemo(() => {
    const vocab = data?.selectedBow?.vocabulary;
    if (!vocab || Object.keys(vocab).length === 0) {
      const topTerms = data?.selectedBow?.top_terms || [];
      if (topTerms.length === 0) return [];
      return topTerms.slice(0, 200).map((t, i) => ({ rank: i + 1, freq: t.score }));
    }
    return Object.entries(vocab)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 300)
      .map(([, freq], i) => ({ rank: i + 1, freq }));
  }, [data?.selectedBow]);

  // ── TRANS-5: IDF bounds for range slider ──
  const idfBounds = useMemo(() => {
    const vals = Object.values(idfValues);
    if (vals.length === 0) return { min: 0, max: 1, step: 0.01 };
    const mn = Math.floor(Math.min(...vals) * 100) / 100;
    const mx = Math.ceil(Math.max(...vals) * 100) / 100;
    return { min: mn, max: mx, step: Math.round(((mx - mn) / 100) * 100) / 100 || 0.01 };
  }, [idfValues]);

  // ── TRANS-5: filtered vocabulary by IDF range ──
  const idfFilteredVocab = useMemo(() => {
    if (Object.keys(idfValues).length === 0) return fullVocabulary;
    const [lo, hi] = idfRange;
    const filtered: Record<string, number> = {};
    Object.entries(fullVocabulary).forEach(([term, freq]) => {
      const idf = idfValues[term];
      if (idf === undefined || (idf >= lo && idf <= hi)) filtered[term] = freq;
    });
    return filtered;
  }, [fullVocabulary, idfValues, idfRange]);

  // ── Term selection handler ──
  const buildTerm = useCallback((text: string, source: SelectedTerm['source'], bowScore?: number, bowRank?: number): SelectedTerm => {
    const tfidfEntry = data?.tfidfTopTerms?.find(t => t.term === text);
    const idfScore   = data?.selectedTfidf?.idf_vector?.idf_values?.[text] ?? null;
    const relatedNgrams = (data?.ngramBarData || []).filter(ng => ng.label.toLowerCase().includes(text.toLowerCase()));
    return { text, bowScore: bowScore ?? null, bowRank: bowRank ?? null, tfidfScore: tfidfEntry?.score ?? null, tfidfRank: tfidfEntry?.rank ?? null, idfScore, relatedNgrams, source };
  }, [data]);

  const handleWordClick = useCallback((word: { text: string; value: number }) => {
    const bowEntry = data?.selectedBow?.top_terms?.find(t => t.term === word.text);
    const term = buildTerm(word.text, 'bow', word.value, bowEntry?.rank);
    setSelectedTerm(prev => prev?.text === word.text ? null : term);
  }, [data, buildTerm]);

  const handleVocabTableClick = useCallback((termText: string, freq: number) => {
    const bowEntry = data?.selectedBow?.top_terms?.find(t => t.term === termText);
    const term = buildTerm(termText, 'bow', freq, bowEntry?.rank);
    setSelectedTerm(prev => prev?.text === termText ? null : term);
  }, [data, buildTerm]);

  const handleBarClick = useCallback((source: 'tfidf' | 'ngram') => (item: { id: string; label: string; value: number }) => {
    if (source === 'tfidf') {
      const bowEntry = data?.selectedBow?.top_terms?.find(t => t.term === item.id);
      const term = buildTerm(item.id, 'tfidf', bowEntry?.score, bowEntry?.rank);
      setSelectedTerm(prev => prev?.text === item.id ? null : { ...term, tfidfScore: item.value });
    } else {
      const term = buildTerm(item.label, 'ngram');
      setSelectedTerm(prev => prev?.text === item.label ? null : term);
    }
  }, [data, buildTerm]);

  const handleScatterClick = useCallback((termText: string) => {
    const bowEntry  = data?.selectedBow?.top_terms?.find(t => t.term === termText);
    const tfidfEntry = data?.tfidfTopTerms?.find(t => t.term === termText);
    const term = buildTerm(termText, 'tfidf', bowEntry?.score, bowEntry?.rank);
    if (tfidfEntry) term.tfidfScore = tfidfEntry.score;
    setSelectedTerm(prev => prev?.text === termText ? null : term);
  }, [data, buildTerm]);

  const handleExportTerm = useCallback((term: SelectedTerm) => {
    const rows: (string | number)[][] = [
      ['termino', term.text],
      ['frecuencia_bow', term.bowScore ?? 'N/A'],
      ['rank_bow', term.bowRank ?? 'N/A'],
      ['score_tfidf', term.tfidfScore ?? 'N/A'],
      ['rank_tfidf', term.tfidfRank ?? 'N/A'],
      ['idf', term.idfScore ?? 'N/A'],
      ['ngramas_relacionados', term.relatedNgrams.map(ng => ng.label).join(' | ')],
    ];
    const csv = rows.map(r => r.map(v => escapeCsvField(String(v))).join(',')).join('\n');
    downloadFile(csv, `termino_${term.text.replace(/\s+/g, '_')}.csv`, 'text/csv');
  }, []);

  // ── Early returns ──
  if (!filters.selectedDatasetId) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
          <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Selecciona un Dataset</h3>
        <p className="text-slate-400 text-sm">Usa el selector en el panel lateral izquierdo.</p>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Cargando análisis de vectorización...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-slate-300 mb-4">{error}</p>
        <button onClick={() => refetch()}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all">
          Reintentar
        </button>
      </div>
    </div>
  );

  const hasAnyData = (data?.bowAnalyses?.length || 0) > 0 || (data?.ngramAnalyses?.length || 0) > 0 || (data?.tfidfAnalyses?.length || 0) > 0;
  if (!hasAnyData) return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-white">Vectorización</h2></div>
      <div className="p-8 rounded-xl bg-slate-800/30 border border-slate-700/50 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Sin Análisis de Vectorización</h3>
        <p className="text-slate-400 max-w-md mx-auto mb-6">Crea un análisis desde Administración.</p>
        <a href="/admin/bow" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg">
          Crear Análisis
        </a>
      </div>
    </div>
  );

  const hasExportableData = !!data?.selectedBow || !!data?.selectedTfidf || !!data?.selectedNgram;

  // ── Render ──
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white">Vectorización</h2>
          <p className="text-slate-400 text-sm mt-1">Haz clic en cualquier término para ver su análisis detallado</p>
        </div>
        {hasExportableData && (
          <button onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-cyan-400 border border-cyan-500/40 rounded-xl hover:bg-cyan-500/10 transition-colors flex-shrink-0"
          >
            <DownloadIcon />Exportar datos completos
          </button>
        )}
      </div>

      {/* ── Analysis Selector Bar ── */}
      {(
        (data?.bowAnalyses?.length ?? 0) > 1 ||
        (data?.ngramAnalyses?.length ?? 0) > 1 ||
        (data?.tfidfAnalyses?.length ?? 0) > 1
      ) && (
        <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
          {(data?.bowAnalyses?.length ?? 0) > 1 && (
            <div className="flex items-center gap-2 min-w-[200px] flex-1">
              <span className="text-xs text-slate-400 whitespace-nowrap font-medium">BoW:</span>
              <select
                value={filters.selectedBowId ?? data?.selectedBow?.id ?? ''}
                onChange={e => setSelectedBow(Number(e.target.value))}
                className="flex-1 bg-slate-900/70 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 cursor-pointer"
              >
                {data?.bowAnalyses.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          {(data?.ngramAnalyses?.length ?? 0) > 1 && (
            <div className="flex items-center gap-2 min-w-[200px] flex-1">
              <span className="text-xs text-slate-400 whitespace-nowrap font-medium">N-gramas:</span>
              <select
                value={filters.selectedNgramId ?? data?.selectedNgram?.id ?? ''}
                onChange={e => setSelectedNgram(Number(e.target.value))}
                className="flex-1 bg-slate-900/70 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 cursor-pointer"
              >
                {data?.ngramAnalyses.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          {(data?.tfidfAnalyses?.length ?? 0) > 1 && (
            <div className="flex items-center gap-2 min-w-[200px] flex-1">
              <span className="text-xs text-slate-400 whitespace-nowrap font-medium">TF-IDF:</span>
              <select
                value={filters.selectedTfidfId ?? data?.selectedTfidf?.id ?? ''}
                onChange={e => setSelectedTfidf(Number(e.target.value))}
                className="flex-1 bg-slate-900/70 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 cursor-pointer"
              >
                {data?.tfidfAnalyses.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Analytics KPI Bar ── */}
      {(() => {
        const bow   = data?.selectedBow;
        const tfidf = data?.selectedTfidf;
        const ngram = data?.selectedNgram;
        const ttr   = bow && bow.total_term_occurrences > 0
          ? ((bow.vocabulary_size / bow.total_term_occurrences) * 100).toFixed(2) + '%' : '—';
        const density   = bow ? ((1 - bow.matrix_sparsity) * 100).toFixed(1) + '%' : '—';
        const avgIdf    = tfidf?.idf_vector?.avg_idf != null ? tfidf.idf_vector.avg_idf.toFixed(2) : '—';
        const tokPerDoc = bow?.avg_terms_per_document != null ? bow.avg_terms_per_document.toFixed(1) : '—';
        const ngramVocab = ngram
          ? Object.values(ngram.results || {}).reduce((s, r) => s + (r.vocabulary_size || 0), 0).toLocaleString()
          : '—';
        const ngramConfs = ngram ? Object.keys(ngram.results || {}).length : 0;
        const vocabSize  = bow ? (bow.vocabulary_size || 0).toLocaleString() : '—';

        const kpis = [
          {
            label: 'Vocabulario Único', value: vocabSize, unit: 'tipos de palabras',
            sub: bow ? `min_df ${bow.min_df} · ${bow.document_count} docs` : 'sin BoW',
            accent: 'border-cyan-300 bg-cyan-50', val: 'text-cyan-800', bar: 'bg-cyan-500',
            icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129',
            tip: 'Número de palabras únicas (types) detectadas por CountVectorizer. Influenciado por min_df y max_features.',
          },
          {
            label: 'Riqueza Léxica (TTR)', value: ttr, unit: 'type-token ratio',
            sub: bow ? `${bow.total_term_occurrences.toLocaleString()} tokens totales` : 'sin BoW',
            accent: 'border-emerald-300 bg-emerald-50', val: 'text-emerald-800', bar: 'bg-emerald-500',
            icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
            tip: 'TTR = términos_únicos / total_ocurrencias × 100. Alto = corpus diverso; bajo = corpus repetitivo. Útil para medir la riqueza lingüística del corpus.',
          },
          {
            label: 'Densidad de Matriz', value: density, unit: 'densidad doc-término',
            sub: bow ? `dispersión ${(bow.matrix_sparsity * 100).toFixed(1)}%` : 'sin BoW',
            accent: 'border-blue-300 bg-blue-50', val: 'text-blue-800', bar: 'bg-blue-500',
            icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
            tip: 'Densidad = 1 − dispersión de la matriz documento-término. Alto = documentos comparten vocabulario. Bajo = vocabularios muy distintos por documento.',
          },
          {
            label: 'Especificidad IDF', value: avgIdf, unit: 'IDF promedio',
            sub: tfidf ? `smooth_idf: ${tfidf.smooth_idf ? 'sí' : 'no'} · sublinear: ${tfidf.sublinear_tf ? 'sí' : 'no'}` : 'sin TF-IDF',
            accent: 'border-violet-300 bg-violet-50', val: 'text-violet-800', bar: 'bg-violet-500',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            tip: 'IDF promedio del corpus (log(N/df) por término). Alto = corpus con términos raros y específicos. Bajo = vocabulario muy común entre documentos.',
          },
          {
            label: 'Tokens por Documento', value: tokPerDoc, unit: 'términos únicos/doc',
            sub: bow ? `matriz ${bow.matrix_shape?.rows ?? '?'}×${bow.matrix_shape?.cols ?? '?'}` : 'sin BoW',
            accent: 'border-amber-300 bg-amber-50', val: 'text-amber-800', bar: 'bg-amber-500',
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
            tip: 'Media de términos únicos por documento en la matriz BoW. Indica la extensión promedio del vocabulario activo en cada documento del corpus.',
          },
          {
            label: 'Cobertura N-gramas', value: ngramVocab, unit: 'n-gramas únicos',
            sub: ngram ? `${ngramConfs} config${ngramConfs !== 1 ? 's' : ''} · ${ngram.document_count} docs` : 'sin análisis',
            accent: 'border-rose-300 bg-rose-50', val: 'text-rose-800', bar: 'bg-rose-500',
            icon: 'M13 10V3L4 14h7v7l9-11h-7z',
            tip: 'Total de n-gramas únicos sumando todas las configuraciones (unigramas, bigramas, trigramas…). Mide la riqueza de secuencias de tokens capturadas.',
          },
        ];

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map(kpi => (
              <div key={kpi.label} title={kpi.tip}
                className={`relative rounded-xl border ${kpi.accent} p-3.5 flex flex-col gap-1.5 overflow-hidden cursor-help`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-medium text-gray-500 leading-tight">{kpi.label}</span>
                  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={kpi.icon} />
                  </svg>
                </div>
                <div className={`text-xl font-bold ${kpi.val} leading-none tracking-tight`}>{kpi.value}</div>
                <div>
                  <div className="text-xs text-gray-400">{kpi.unit}</div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">{kpi.sub}</div>
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${kpi.bar} opacity-70`} />
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Selected term indicator ── */}
      {selectedTerm && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm text-cyan-300">
              Término seleccionado: <span className="font-semibold text-white">"{selectedTerm.text}"</span>
            </span>
          </div>
          <button onClick={() => setSelectedTerm(null)}
            className="text-xs text-cyan-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-cyan-500/20 transition-colors">
            <CloseIcon />Cerrar panel
          </button>
        </div>
      )}

      {/* ── Section tabs ── */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secciones de análisis">
        {([
          {
            key: 'analysis',
            label: 'Análisis',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            activeClass: 'bg-cyan-500/20 text-cyan-100 border-cyan-500/60 shadow-[0_0_14px_rgba(6,182,212,0.2)]',
            inactiveClass: 'text-slate-400 border-slate-700/50 hover:text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500/30',
            dotActive: 'bg-cyan-400',
            dotInactive: 'bg-slate-600',
          },
          {
            key: 'compare',
            label: 'Comparar',
            icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
            activeClass: 'bg-blue-500/20 text-blue-100 border-blue-500/60 shadow-[0_0_14px_rgba(59,130,246,0.2)]',
            inactiveClass: 'text-slate-400 border-slate-700/50 hover:text-blue-300 hover:bg-blue-500/10 hover:border-blue-500/30',
            dotActive: 'bg-blue-400',
            dotInactive: 'bg-slate-600',
          },
          {
            key: 'heatmap',
            label: 'Heatmap',
            icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
            activeClass: 'bg-violet-500/20 text-violet-100 border-violet-500/60 shadow-[0_0_14px_rgba(139,92,246,0.2)]',
            inactiveClass: 'text-slate-400 border-slate-700/50 hover:text-violet-300 hover:bg-violet-500/10 hover:border-violet-500/30',
            dotActive: 'bg-violet-400',
            dotInactive: 'bg-slate-600',
          },
          {
            key: 'cooccurrence',
            label: 'Co-ocurrencia',
            icon: 'M13 10V3L4 14h7v7l9-11h-7z',
            activeClass: 'bg-emerald-500/20 text-emerald-100 border-emerald-500/60 shadow-[0_0_14px_rgba(16,185,129,0.2)]',
            inactiveClass: 'text-slate-400 border-slate-700/50 hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/30',
            dotActive: 'bg-emerald-400',
            dotInactive: 'bg-slate-600',
          },
          {
            key: 'zipf',
            label: 'Ley de Zipf',
            icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
            activeClass: 'bg-rose-500/20 text-rose-100 border-rose-500/60 shadow-[0_0_14px_rgba(244,63,94,0.2)]',
            inactiveClass: 'text-slate-400 border-slate-700/50 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/30',
            dotActive: 'bg-rose-400',
            dotInactive: 'bg-slate-600',
          },
        ] as const).map(tab => {
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveSection(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                isActive ? tab.activeClass : tab.inactiveClass
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 transition-colors ${isActive ? tab.dotActive : tab.dotInactive}`} />
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════ ANÁLISIS section ═══════════════ */}
      {activeSection === 'analysis' && <>

      {/* ── BoW: Nube de Palabras ↔ Tabla de Vocabulario ── */}
      {(data?.wordCloudData?.length || 0) > 0 || Object.keys(fullVocabulary).length > 0 ? (
        <ChartCard
          title={vocabView === 'cloud' ? 'Nube de Palabras' : 'Tabla de Vocabulario Completa'}
          subtitle={vocabView === 'cloud'
            ? `Haz clic en una palabra para ver su análisis${data?.selectedBow ? ` · ${data.selectedBow.name}` : ''}`
            : `${Object.keys(fullVocabulary).length > 0 ? Object.keys(fullVocabulary).length.toLocaleString() : data?.selectedBow?.vocabulary_size?.toLocaleString() || 0} términos — haz clic para analizar`}
          accentColor="cyan"
          size="lg"
          icon={vocabView === 'cloud' ? <CloudIcon /> : <TableIcon />}
          downloadable={vocabView === 'cloud'}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
          headerExtra={
            <button
              onClick={() => setVocabView(v => v === 'cloud' ? 'table' : 'cloud')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-600/50 text-slate-300 hover:bg-slate-700/40 hover:text-white transition-colors"
            >
              {vocabView === 'cloud' ? <><TableIcon /><span>Ver tabla</span></> : <><CloudIcon /><span>Ver nube</span></>}
            </button>
          }
        >
          {vocabView === 'cloud' ? (
            <div className="min-h-[280px] overflow-hidden">
              <SimpleWordCloud
                data={data?.wordCloudData || []}
                maxWords={60}
                onWordClick={handleWordClick}
                selectedWord={selectedTerm?.source === 'bow' ? selectedTerm.text : null}
              />
            </div>
          ) : (
            <div className="p-1">
              {/* TRANS-5: IDF range filter */}
              {Object.keys(idfValues).length > 0 && (
                <div className="flex items-center gap-3 mb-3 px-1 py-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
                  <span className="text-xs text-slate-400 whitespace-nowrap font-medium shrink-0">Filtrar IDF:</span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-slate-500 w-10 text-right shrink-0">{idfRange[0].toFixed(2)}</span>
                    <input
                      type="range" min={idfBounds.min} max={idfBounds.max} step={idfBounds.step}
                      value={idfRange[0]}
                      onChange={e => setIdfRange([Math.min(Number(e.target.value), idfRange[1] - idfBounds.step), idfRange[1]])}
                      className="flex-1 h-1.5 accent-blue-500"
                    />
                    <input
                      type="range" min={idfBounds.min} max={idfBounds.max} step={idfBounds.step}
                      value={idfRange[1]}
                      onChange={e => setIdfRange([idfRange[0], Math.max(Number(e.target.value), idfRange[0] + idfBounds.step)])}
                      className="flex-1 h-1.5 accent-blue-500"
                    />
                    <span className="text-xs text-slate-500 w-10 shrink-0">{idfRange[1].toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => setIdfRange([idfBounds.min, idfBounds.max])}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700/50 transition-colors shrink-0"
                  >Reset</button>
                  <span className="text-xs text-blue-400 shrink-0">{Object.keys(idfFilteredVocab).length} términos</span>
                </div>
              )}
              <VocabularyTable
                vocabulary={Object.keys(idfFilteredVocab).length > 0 ? idfFilteredVocab : Object.fromEntries((data?.selectedBow?.top_terms || []).map(t => [t.term, t.score]))}
                idfValues={idfValues}
                tfidfScores={tfidfScoresMap}
                onTermClick={handleVocabTableClick}
                selectedTerm={selectedTerm?.text ?? null}
                compareTerms={compareTerms}
                onCompareToggle={term => {
                  setCompareTerms(prev => prev.includes(term) ? prev.filter(t => t !== term) : prev.length < 3 ? [...prev, term] : prev);
                }}
              />
            </div>
          )}
        </ChartCard>
      ) : null}

      {/* ── N-gramas con Tabs + TF-IDF side by side ── */}
      <DashboardGrid columns={2} gap="lg">
        {/* N-gramas con tabs por tamaño */}
        <ChartCard
          title="N-gramas"
          subtitle={activeConfig
            ? `${activeConfig.label} · ${activeConfig.vocabSize?.toLocaleString() || activeConfig.terms.length} términos`
            : data?.selectedNgram ? data.selectedNgram.name : 'Secuencias más frecuentes'}
          accentColor="purple"
          size="lg"
          downloadable
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
        >
          {/* Tabs por configuración */}
          {ngramConfigs.length > 1 && (
            <div className="flex gap-1 mb-3 flex-wrap border-b border-slate-700/40 pb-2">
              {ngramConfigs.map(cfg => (
                <button key={cfg.key}
                  onClick={() => setActiveNgramConfig(cfg.key)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    (activeNgramConfig === cfg.key || (!activeNgramConfig && cfg === ngramConfigs[0]))
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
                  }`}
                >
                  {cfg.label}
                  <span className="ml-1.5 text-slate-500 text-xs">({cfg.vocabSize?.toLocaleString() || cfg.terms.length})</span>
                </button>
              ))}
            </div>
          )}
          <div className="h-[280px] overflow-y-auto pr-1">
            {activeNgramTerms.length > 0 ? (
              <HorizontalBarChart
                data={activeNgramTerms}
                maxBars={15}
                colorClass="bg-gradient-to-r from-purple-500 to-violet-500"
                onItemClick={handleBarClick('ngram')}
                selectedId={selectedTerm?.source === 'ngram' ? selectedTerm.text : null}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                {data?.ngramAnalyses?.length === 0 ? 'No hay análisis de N-gramas disponibles' : 'Sin datos de N-gramas'}
              </div>
            )}
          </div>
        </ChartCard>

        {/* TF-IDF Top Terms */}
        <ChartCard
          title="Top TF-IDF"
          subtitle={`Haz clic para analizar · ${data?.selectedTfidf ? data.selectedTfidf.name : 'Términos con mayor peso'}`}
          accentColor="blue"
          size="lg"
          downloadable
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
        >
          <div className="h-[300px] overflow-y-auto pr-1">
            {data?.tfidfTopTerms && data.tfidfTopTerms.length > 0 ? (
              <HorizontalBarChart
                data={data.tfidfTopTerms.slice(0, 15).map(t => ({ id: t.term, label: t.term, value: Math.round(t.score * 10000) / 10000 }))}
                maxBars={15}
                colorClass="bg-gradient-to-r from-blue-500 to-cyan-500"
                onItemClick={handleBarClick('tfidf')}
                selectedId={selectedTerm?.source === 'tfidf' ? selectedTerm.text : null}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                {data?.tfidfAnalyses?.length === 0 ? 'No hay análisis TF-IDF disponibles' : 'Sin datos TF-IDF'}
              </div>
            )}
          </div>
        </ChartCard>
      </DashboardGrid>

      {/* ── Scatter Plot TF vs IDF ── */}
      {data?.selectedTfidf && (
        <ChartCard
          title="Scatter: TF vs IDF"
          subtitle={`Cada punto es un término — posición: frecuencia (X) vs especificidad (Y) — tamaño: score TF-IDF · ${scatterData.length} términos`}
          accentColor="blue"
          size="lg"
          downloadable
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
        >
          <div className="pt-2 pl-4">
            <TfIdfScatter
              data={scatterData}
              onPointClick={handleScatterClick}
              selectedTerm={selectedTerm?.text ?? null}
            />
          </div>
          {/* Interpretation guide */}
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-400 border-t border-slate-700/40 pt-3">
            <div className="space-y-1">
              <p className="font-medium text-slate-300">↗ Arriba-izquierda</p>
              <p>IDF alto + TF bajo → Términos raros y específicos (muy descriptivos)</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-slate-300">↘ Abajo-derecha</p>
              <p>IDF bajo + TF alto → Términos comunes (stopwords residuales o ruido)</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-slate-300">↗ Arriba-derecha</p>
              <p>IDF alto + TF alto → Términos clave del corpus (ideal para análisis)</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-slate-300">↙ Abajo-izquierda</p>
              <p>IDF bajo + TF bajo → Términos poco significativos en general</p>
            </div>
          </div>
        </ChartCard>
      )}

      {/* ── Analysis Selector (when multiple) ── */}
      {((data?.bowAnalyses?.length || 0) > 1 || (data?.ngramAnalyses?.length || 0) > 1 || (data?.tfidfAnalyses?.length || 0) > 1) && (
        <ChartCard
          title="Selección de Análisis"
          subtitle="Elige qué análisis visualizar"
          accentColor="emerald"
          size="sm"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
        >
          <div className="grid grid-cols-3 gap-4 p-2">
            {data?.bowAnalyses && data.bowAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Bag of Words</label>
                <select value={filters.selectedBowId || ''} onChange={e => setSelectedBow(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white">
                  <option value="">Más reciente</option>
                  {data.bowAnalyses.map(bow => <option key={bow.id} value={bow.id}>{bow.name}</option>)}
                </select>
              </div>
            )}
            {data?.ngramAnalyses && data.ngramAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">N-gramas</label>
                <select value={filters.selectedNgramId || ''} onChange={e => setSelectedNgram(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white">
                  <option value="">Más reciente</option>
                  {data.ngramAnalyses.map(ng => <option key={ng.id} value={ng.id}>{ng.name}</option>)}
                </select>
              </div>
            )}
            {data?.tfidfAnalyses && data.tfidfAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">TF-IDF</label>
                <select value={filters.selectedTfidfId || ''} onChange={e => setSelectedTfidf(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white">
                  <option value="">Más reciente</option>
                  {data.tfidfAnalyses.map(tf => <option key={tf.id} value={tf.id}>{tf.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </ChartCard>
      )}

      {/* ── BoW Details ── */}
      {data?.selectedBow && (
        <ChartCard
          title="Detalles del Análisis BoW"
          subtitle={data.selectedBow.name}
          accentColor="cyan"
          size="md"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2">
            {[
              { label: 'Vocabulario', value: data.selectedBow.vocabulary_size?.toLocaleString(), color: 'text-cyan-400' },
              { label: 'Documentos',  value: data.selectedBow.document_count?.toLocaleString(),  color: 'text-emerald-400' },
              { label: 'Min DF',      value: data.selectedBow.min_df || 1,                        color: 'text-purple-400' },
              { label: 'Max Features',value: data.selectedBow.max_features || '∞',               color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-lg bg-slate-800/30">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      </> /* end analysis section */}

      <CompareSection
        activeSection={activeSection}
        data={data}
        isLoading={isLoading}
        refetch={refetch}
        comparacionData={comparacionData}
        selectedTerm={selectedTerm}
        setSelectedTerm={setSelectedTerm}
        buildTerm={buildTerm}
      />

      <HeatmapSection
        activeSection={activeSection}
        data={data}
        isLoading={isLoading}
        refetch={refetch}
        filters={filters}
        heatmapData={heatmapData}
        heatmapMode={heatmapMode}
        setHeatmapMode={setHeatmapMode}
        docTermMatrix={docTermMatrix}
        setDocTermMatrix={setDocTermMatrix}
        docTermLoading={docTermLoading}
        setSelectedTerm={setSelectedTerm}
        buildTerm={buildTerm}
      />

      <CooccurrenceSection
        activeSection={activeSection}
        data={data}
        isLoading={isLoading}
        refetch={refetch}
        cooccurrenceData={cooccurrenceData}
        setSelectedTerm={setSelectedTerm}
        buildTerm={buildTerm}
      />
      {/* ═══════════════ ZIPF section (VIZ-2) ═══════════════ */}
      {activeSection === 'zipf' && (() => {
        if (zipfData.length < 5) return (
          <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
            Se necesita un análisis BoW con vocabulario para generar la curva de Zipf
          </div>
        );
        const logRanks = zipfData.map(d => Math.log10(d.rank));
        const logFreqs = zipfData.map(d => Math.log10(Math.max(d.freq, 1)));
        const maxLogR = Math.max(...logRanks);
        const minLogF = Math.min(...logFreqs);
        const maxLogF = Math.max(...logFreqs);
        const W = 520, H = 300, PAD = { top: 20, right: 20, bottom: 50, left: 60 };
        const chartW = W - PAD.left - PAD.right;
        const chartH = H - PAD.top - PAD.bottom;
        const sx = (r: number) => (r / maxLogR) * chartW;
        const sy = (f: number) => chartH - ((f - minLogF) / (maxLogF - minLogF || 1)) * chartH;
        const pathD = zipfData.map((_d, i) => `${i === 0 ? 'M' : 'L'}${sx(logRanks[i])},${sy(logFreqs[i])}`).join(' ');
        // Ideal Zipf line: frequency ∝ 1/rank → log(freq) = log(C) - log(rank)
        const idealD = [0, maxLogR].map((lr, i) => `${i === 0 ? 'M' : 'L'}${sx(lr)},${sy(maxLogF - lr)}`).join(' ');
        const yTicks = [minLogF, (minLogF + maxLogF) / 2, maxLogF].map(v => ({
          v, label: Math.round(10 ** v).toLocaleString(), y: sy(v),
        }));
        const xTicks = [0, maxLogR / 3, (2 * maxLogR) / 3, maxLogR].map(v => ({
          v, label: Math.round(10 ** v), x: sx(v),
        }));
        return (
          <ChartCard
            title="Distribución de Frecuencias — Ley de Zipf"
            subtitle={`Gráfico log-log: rango vs frecuencia — ${zipfData.length} términos del vocabulario BoW`}
            accentColor="rose"
            size="lg"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            }
          >
            <div className="px-2 pb-2 overflow-x-auto">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: `${H}px` }}>
                <g transform={`translate(${PAD.left},${PAD.top})`}>
                  {/* Grid lines */}
                  {yTicks.map(t => (
                    <g key={t.v}>
                      <line x1={0} y1={t.y} x2={chartW} y2={t.y} stroke="#1e293b" strokeWidth={1} />
                      <text x={-8} y={t.y + 4} textAnchor="end" fill="#64748b" fontSize={10}>{t.label}</text>
                    </g>
                  ))}
                  {xTicks.map(t => (
                    <g key={t.v}>
                      <line x1={t.x} y1={0} x2={t.x} y2={chartH} stroke="#1e293b" strokeWidth={1} />
                      <text x={t.x} y={chartH + 16} textAnchor="middle" fill="#64748b" fontSize={10}>{t.label}</text>
                    </g>
                  ))}
                  {/* Axis labels */}
                  <text x={chartW / 2} y={chartH + 36} textAnchor="middle" fill="#94a3b8" fontSize={11}>Rango (log)</text>
                  <text x={-40} y={chartH / 2} textAnchor="middle" fill="#94a3b8" fontSize={11} transform={`rotate(-90,-40,${chartH / 2})`}>Frecuencia (log)</text>
                  {/* Ideal Zipf reference line */}
                  <path d={idealD} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6,4" />
                  {/* Actual data line */}
                  <path d={pathD} fill="none" stroke="#f43f5e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  {/* Scatter dots (sample) */}
                  {zipfData.filter((_, i) => i % 10 === 0).map((d, i) => (
                    <circle key={i} cx={sx(logRanks[zipfData.indexOf(d)])} cy={sy(logFreqs[zipfData.indexOf(d)])} r={3} fill="#f43f5e" fillOpacity={0.7}>
                      <title>"{d.rank}º" — {d.freq.toLocaleString()} apariciones</title>
                    </circle>
                  ))}
                </g>
              </svg>
              <div className="flex gap-5 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-rose-500 rounded" />
                  <span className="text-xs text-slate-400">Distribución real del corpus</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 border-t-2 border-amber-400 border-dashed" />
                  <span className="text-xs text-slate-400">Ley de Zipf ideal (α=1)</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                La <strong className="text-slate-300">Ley de Zipf</strong> predice que en lenguaje natural, la frecuencia de una palabra es inversamente proporcional a su rango.
                Si la curva real sigue la línea ideal, el corpus exhibe distribución léxica típica del lenguaje humano.
                Desviaciones indican sesgo temático o corpus especializado.
              </p>
            </div>
          </ChartCard>
        );
      })()}

      {/* ── TRANS-4: Floating Compare Badge ── */}
      {compareTerms.length > 0 && !showComparator && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-slate-800 border border-violet-500/40 rounded-2xl px-4 py-2.5 shadow-2xl">
          <div className="flex gap-1.5">
            {compareTerms.map(t => (
              <span key={t} className="px-2.5 py-1 rounded-lg bg-violet-500/20 text-violet-300 text-xs font-semibold border border-violet-500/30">{t}</span>
            ))}
          </div>
          <button
            onClick={() => setShowComparator(true)}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
          >
            Comparar →
          </button>
          <button
            onClick={() => setCompareTerms([])}
            className="p-1 text-slate-500 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* ── TRANS-4: Term Comparator Panel ── */}
      {showComparator && compareTerms.length > 0 && (() => {
        const bowVocab     = Object.keys(idfFilteredVocab).length > 0 ? idfFilteredVocab : Object.fromEntries((data?.selectedBow?.top_terms || []).map(t => [t.term, t.score]));
        const allTermsData = Object.entries(bowVocab).sort((a, b) => b[1] - a[1]).map(([term, freq], i) => ({ term, freq, rank: i + 1 }));
        const maxFreq      = allTermsData[0]?.freq || 1;
        const termData     = compareTerms.map(t => {
          const entry = allTermsData.find(x => x.term === t);
          return {
            term: t,
            freq: entry?.freq ?? 0,
            rank: entry?.rank ?? '—',
            idf: idfValues[t] ?? null,
            tfidf: tfidfScoresMap[t] ?? null,
            pct: ((entry?.freq ?? 0) / maxFreq) * 100,
          };
        });
        const metrics = [
          { key: 'freq',  label: 'Frecuencia (BoW)', color: 'text-cyan-400',    fmt: (v: number | null) => v != null ? v.toLocaleString() : '—' },
          { key: 'rank',  label: 'Rango',            color: 'text-slate-300',   fmt: (v: number | null) => v != null ? `#${v}` : '—' },
          { key: 'idf',   label: 'IDF',              color: 'text-violet-400',  fmt: (v: number | null) => v != null ? v.toFixed(4) : '—' },
          { key: 'tfidf', label: 'TF-IDF Score',     color: 'text-emerald-400', fmt: (v: number | null) => v != null ? v.toFixed(4) : '—' },
        ] as const;
        return (
          <>
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowComparator(false)} />
            <div className="fixed inset-x-4 bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[700px] z-50 bg-slate-900 rounded-2xl border border-violet-500/30 shadow-2xl">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/60">
                <div>
                  <h3 className="text-sm font-semibold text-white">Comparador de Términos</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{compareTerms.length} términos seleccionados</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setCompareTerms([]); setShowComparator(false); }}
                    className="text-xs text-slate-400 hover:text-rose-400 transition-colors px-2 py-1"
                  >Limpiar</button>
                  <button onClick={() => setShowComparator(false)} className="p-1.5 text-slate-500 hover:text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/40">
                      <th className="text-left px-5 py-2.5 text-xs text-slate-500 font-medium uppercase tracking-wider w-32">Métrica</th>
                      {termData.map(td => (
                        <th key={td.term} className="text-center px-4 py-2.5 text-xs font-bold text-violet-300 bg-violet-500/5">{td.term}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {metrics.map(m => (
                      <tr key={m.key} className="hover:bg-slate-800/30">
                        <td className="px-5 py-2.5 text-xs text-slate-400 font-medium">{m.label}</td>
                        {termData.map(td => {
                          const raw = td[m.key as keyof typeof td] as number | null | string;
                          const val = typeof raw === 'number' ? raw : null;
                          const display = m.fmt(val);
                          return (
                            <td key={td.term} className={`text-center px-4 py-2.5 font-mono text-sm font-semibold ${m.color}`}>
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Frequency bar row */}
                    <tr className="hover:bg-slate-800/30">
                      <td className="px-5 py-2.5 text-xs text-slate-400 font-medium">Frecuencia relativa</td>
                      {termData.map(td => (
                        <td key={td.term} className="px-4 py-2.5">
                          <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-2 bg-violet-500 rounded-full transition-all" style={{ width: `${td.pct}%` }} />
                          </div>
                          <p className="text-xs text-slate-500 text-center mt-1">{td.pct.toFixed(1)}%</p>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── WordDetailPanel ── */}
      {selectedTerm && (
        <WordDetailPanel
          term={selectedTerm}
          totalDocs={data?.selectedBow?.document_count || 0}
          maxBowScore={maxBowScore}
          maxTfidfScore={maxTfidfScore}
          onClose={() => setSelectedTerm(null)}
          onExportTerm={handleExportTerm}
        />
      )}

      {/* ── ExportModal ── */}
      {showExportModal && data && (
        <ExportModal data={data} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
};
