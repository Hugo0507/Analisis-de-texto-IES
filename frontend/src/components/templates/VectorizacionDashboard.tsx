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
import { ChartCard, StageHeading } from '../molecules';
import { useFilter } from '../../contexts/FilterContext';
import publicTfidfAnalysisService from '../../services/publicTfidfAnalysisService';
import type { DocTermMatrix } from '../../services/publicTfidfAnalysisService';
import { downloadFile, escapeCsvField } from '../../utils/download';
import { useVectorizationData } from '../../hooks/useVectorizationData';
import { useVocabularyView } from '../../hooks/useVocabularyView';
import { useNgramConfigs } from '../../hooks/useNgramConfigs';
import { useTermSelection } from '../../hooks/useTermSelection';
import {
  DownloadIcon,
  CloseIcon,
  WordDetailPanel,
  ExportModal,
  AnalysisSection,
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'analysis' | 'compare' | 'heatmap' | 'cooccurrence' | 'zipf'>('analysis');
  const [heatmapMode, setHeatmapMode] = useState<'metrics' | 'docterm'>('metrics');
  const [docTermMatrix, setDocTermMatrix] = useState<DocTermMatrix | null>(null);
  const [docTermLoading, setDocTermLoading] = useState(false);
  const [showComparator, setShowComparator] = useState(false);
  const { filters, setSelectedBow, setSelectedNgram, setSelectedTfidf } = useFilter();

  const { data, isLoading, error, refetch } = useVectorizationData(
    (range) => vocab.setIdfRange(range),
  );

  // Estado agrupado en hooks cohesivos. Se desestructura para que el cuerpo
  // del componente siga leyendose igual, y los objetos completos se pasan
  // enteros a las secciones extraidas.
  const vocab = useVocabularyView(data);
  const ngram = useNgramConfigs(data);
  const terms = useTermSelection(data);

  // Lo que el cuerpo del dashboard sigue necesitando; el resto viaja dentro
  // de los objetos vocab / ngram / terms hacia las secciones.
  const { idfValues, idfFilteredVocab, setVocabView, setIdfRange,
          compareTerms, setCompareTerms } = vocab;
  const { ngramConfigs, setActiveNgramConfig } = ngram;
  const { selectedTerm, setSelectedTerm, buildTerm } = terms;

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

  // ── Term selection handler ──
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
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-ink-850/50 flex items-center justify-center">
          <svg className="w-10 h-10 text-fog" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Selecciona un Dataset</h3>
        <p className="text-mist text-sm">Usa el selector en el panel lateral izquierdo.</p>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-stage-vec/25 border-t-stage-vec rounded-full animate-spin" />
        <p className="text-mist text-sm">Cargando análisis de vectorización…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-stage-lab/10 border border-stage-lab/25 flex items-center justify-center">
          <svg className="w-7 h-7 text-stage-lab" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-haze mb-4">{error}</p>
        <button onClick={() => refetch()}
          className="px-4 py-2 text-sm font-medium text-paper bg-ink-850 border border-ink-600 rounded-xl hover:bg-ink-800 transition-colors">
          Reintentar
        </button>
      </div>
    </div>
  );

  const hasAnyData = (data?.bowAnalyses?.length || 0) > 0 || (data?.ngramAnalyses?.length || 0) > 0 || (data?.tfidfAnalyses?.length || 0) > 0;
  if (!hasAnyData) return (
    <div className="space-y-6">
      <StageHeading stage="vec" title="Vectorización" />
      <div className="p-10 rounded-2xl bg-ink-900 border border-ink-700 text-center">
        <h3 className="font-display text-lg font-semibold text-paper mb-1.5">Este corpus aún no tiene vectorización</h3>
        <p className="text-mist max-w-md mx-auto mb-6">Crea una bolsa de palabras, n-gramas o TF-IDF desde Administración para verlos aquí.</p>
        <a href="/admin/bow" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-paper bg-stage-vec/15 border border-stage-vec/40 rounded-xl hover:bg-stage-vec/25 transition-colors">
          Crear análisis
        </a>
      </div>
    </div>
  );

  const hasExportableData = !!data?.selectedBow || !!data?.selectedTfidf || !!data?.selectedNgram;

  // ── Render ──
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <StageHeading
        stage="vec"
        title="Vectorización"
        subtitle="Cómo se convirtió el texto en números. Haz clic en cualquier término para ver su análisis."
        actions={hasExportableData ? (
          <button onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-paper bg-ink-850 border border-ink-600 rounded-xl hover:bg-ink-800 transition-colors flex-shrink-0"
          >
            <DownloadIcon />Exportar datos completos
          </button>
        ) : undefined}
      />

      {/* ── Analysis Selector Bar ── */}
      {(
        (data?.bowAnalyses?.length ?? 0) > 1 ||
        (data?.ngramAnalyses?.length ?? 0) > 1 ||
        (data?.tfidfAnalyses?.length ?? 0) > 1
      ) && (
        <div className="flex flex-wrap gap-3 p-3 rounded-2xl bg-ink-900 border border-ink-700">
          {(data?.bowAnalyses?.length ?? 0) > 1 && (
            <label className="flex items-center gap-2.5 min-w-[220px] flex-1 pl-2">
              <span className="text-xs text-mist whitespace-nowrap">Bolsa de palabras</span>
              <select
                value={filters.selectedBowId ?? data?.selectedBow?.id ?? ''}
                onChange={e => setSelectedBow(Number(e.target.value))}
                className="min-w-0 flex-1 bg-ink-850 border border-ink-600 text-paper text-sm rounded-xl px-3 py-2 transition-colors hover:border-fog/50 focus:outline-none focus:border-stage-vec/60 cursor-pointer"
              >
                {data?.bowAnalyses.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
          )}
          {(data?.ngramAnalyses?.length ?? 0) > 1 && (
            <label className="flex items-center gap-2.5 min-w-[220px] flex-1 pl-2">
              <span className="text-xs text-mist whitespace-nowrap">N-gramas</span>
              <select
                value={filters.selectedNgramId ?? data?.selectedNgram?.id ?? ''}
                onChange={e => setSelectedNgram(Number(e.target.value))}
                className="min-w-0 flex-1 bg-ink-850 border border-ink-600 text-paper text-sm rounded-xl px-3 py-2 transition-colors hover:border-fog/50 focus:outline-none focus:border-stage-vec/60 cursor-pointer"
              >
                {data?.ngramAnalyses.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
          )}
          {(data?.tfidfAnalyses?.length ?? 0) > 1 && (
            <label className="flex items-center gap-2.5 min-w-[220px] flex-1 pl-2">
              <span className="text-xs text-mist whitespace-nowrap">TF-IDF</span>
              <select
                value={filters.selectedTfidfId ?? data?.selectedTfidf?.id ?? ''}
                onChange={e => setSelectedTfidf(Number(e.target.value))}
                className="min-w-0 flex-1 bg-ink-850 border border-ink-600 text-paper text-sm rounded-xl px-3 py-2 transition-colors hover:border-fog/50 focus:outline-none focus:border-stage-vec/60 cursor-pointer"
              >
                {data?.tfidfAnalyses.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
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
            icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129',
            tip: 'Número de palabras únicas (types) detectadas por CountVectorizer. Influenciado por min_df y max_features.',
          },
          {
            label: 'Riqueza Léxica (TTR)', value: ttr, unit: 'type-token ratio',
            sub: bow ? `${bow.total_term_occurrences.toLocaleString()} tokens totales` : 'sin BoW',
            icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
            tip: 'TTR = términos_únicos / total_ocurrencias × 100. Alto = corpus diverso; bajo = corpus repetitivo. Útil para medir la riqueza lingüística del corpus.',
          },
          {
            label: 'Densidad de Matriz', value: density, unit: 'densidad doc-término',
            sub: bow ? `dispersión ${(bow.matrix_sparsity * 100).toFixed(1)}%` : 'sin BoW',
            icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
            tip: 'Densidad = 1 − dispersión de la matriz documento-término. Alto = documentos comparten vocabulario. Bajo = vocabularios muy distintos por documento.',
          },
          {
            label: 'Especificidad IDF', value: avgIdf, unit: 'IDF promedio',
            sub: tfidf ? `smooth_idf: ${tfidf.smooth_idf ? 'sí' : 'no'} · sublinear: ${tfidf.sublinear_tf ? 'sí' : 'no'}` : 'sin TF-IDF',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            tip: 'IDF promedio del corpus (log(N/df) por término). Alto = corpus con términos raros y específicos. Bajo = vocabulario muy común entre documentos.',
          },
          {
            label: 'Tokens por Documento', value: tokPerDoc, unit: 'términos únicos/doc',
            sub: bow ? `matriz ${bow.matrix_shape?.rows ?? '?'}×${bow.matrix_shape?.cols ?? '?'}` : 'sin BoW',
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
            tip: 'Media de términos únicos por documento en la matriz BoW. Indica la extensión promedio del vocabulario activo en cada documento del corpus.',
          },
          {
            label: 'Cobertura N-gramas', value: ngramVocab, unit: 'n-gramas únicos',
            sub: ngram ? `${ngramConfs} config${ngramConfs !== 1 ? 's' : ''} · ${ngram.document_count} docs` : 'sin análisis',
            icon: 'M13 10V3L4 14h7v7l9-11h-7z',
            tip: 'Total de n-gramas únicos sumando todas las configuraciones (unigramas, bigramas, trigramas…). Mide la riqueza de secuencias de tokens capturadas.',
          },
        ];

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map(kpi => (
              <div key={kpi.label} title={kpi.tip}
                className="flex flex-col rounded-2xl border border-ink-700 bg-ink-900 p-4 cursor-help transition-colors hover:border-ink-600"
              >
                {/* La etiqueta reserva dos líneas para que las cifras queden alineadas */}
                <div className="flex min-h-[2.5rem] items-start justify-between gap-2">
                  <span className="text-xs leading-snug text-mist">{kpi.label}</span>
                  <svg className="w-3.5 h-3.5 text-fog shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={kpi.icon} />
                  </svg>
                </div>
                <div className="num mt-1 font-display text-[26px] font-semibold leading-none tracking-[-0.02em] text-paper">{kpi.value}</div>
                <div className="mt-2.5">
                  <div className="text-xs text-mist">{kpi.unit}</div>
                  <div className="num text-xs text-fog truncate mt-0.5">{kpi.sub}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── Selected term indicator ── */}
      {selectedTerm && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-stage-vec/[0.08] border border-stage-vec/30">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-stage-vec" />
            <span className="text-sm text-mist">
              Término seleccionado: <span className="font-semibold text-paper">"{selectedTerm.text}"</span>
            </span>
          </div>
          <button onClick={() => setSelectedTerm(null)}
            className="text-xs text-mist hover:text-paper flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-ink-800 transition-colors">
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
            activeClass: 'bg-stage-vec/10 text-paper border-stage-vec/40',
            inactiveClass: 'text-mist border-ink-700 hover:text-paper hover:bg-ink-850',
            dotActive: 'bg-stage-vec',
            dotInactive: 'bg-ink-600',
          },
          {
            key: 'compare',
            label: 'Comparar',
            icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
            activeClass: 'bg-stage-vec/10 text-paper border-stage-vec/40',
            inactiveClass: 'text-mist border-ink-700 hover:text-paper hover:bg-ink-850',
            dotActive: 'bg-stage-vec',
            dotInactive: 'bg-ink-600',
          },
          {
            key: 'heatmap',
            label: 'Heatmap',
            icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
            activeClass: 'bg-stage-vec/10 text-paper border-stage-vec/40',
            inactiveClass: 'text-mist border-ink-700 hover:text-paper hover:bg-ink-850',
            dotActive: 'bg-stage-vec',
            dotInactive: 'bg-ink-600',
          },
          {
            key: 'cooccurrence',
            label: 'Co-ocurrencia',
            icon: 'M13 10V3L4 14h7v7l9-11h-7z',
            activeClass: 'bg-stage-vec/10 text-paper border-stage-vec/40',
            inactiveClass: 'text-mist border-ink-700 hover:text-paper hover:bg-ink-850',
            dotActive: 'bg-stage-vec',
            dotInactive: 'bg-ink-600',
          },
          {
            key: 'zipf',
            label: 'Ley de Zipf',
            icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
            activeClass: 'bg-stage-vec/10 text-paper border-stage-vec/40',
            inactiveClass: 'text-mist border-ink-700 hover:text-paper hover:bg-ink-850',
            dotActive: 'bg-stage-vec',
            dotInactive: 'bg-ink-600',
          },
        ] as const).map(tab => {
          const isActive = activeSection === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveSection(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-stage-vec/50 ${
                isActive ? tab.activeClass : tab.inactiveClass
              }`}
            >
              <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${isActive ? tab.dotActive : tab.dotInactive}`} />
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnalysisSection
        activeSection={activeSection}
        data={data}
        isLoading={isLoading}
        refetch={refetch}
        filters={filters}
        filterSetters={{ setSelectedBow, setSelectedNgram, setSelectedTfidf }}
        vocab={vocab}
        ngram={ngram}
        terms={terms}
        scatterData={scatterData}
        tfidfScoresMap={tfidfScoresMap}
      />

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
          <div className="flex items-center justify-center h-[300px] text-mist text-sm">
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
            accentColor="purple"
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
                      <line x1={0} y1={t.y} x2={chartW} y2={t.y} stroke="#1F2A44" strokeWidth={1} />
                      <text x={-8} y={t.y + 4} textAnchor="end" fill="#7A89A3" fontSize={10}>{t.label}</text>
                    </g>
                  ))}
                  {xTicks.map(t => (
                    <g key={t.v}>
                      <line x1={t.x} y1={0} x2={t.x} y2={chartH} stroke="#1F2A44" strokeWidth={1} />
                      <text x={t.x} y={chartH + 16} textAnchor="middle" fill="#7A89A3" fontSize={10}>{t.label}</text>
                    </g>
                  ))}
                  {/* Axis labels */}
                  <text x={chartW / 2} y={chartH + 36} textAnchor="middle" fill="#97A6BE" fontSize={11}>Rango (log)</text>
                  <text x={-40} y={chartH / 2} textAnchor="middle" fill="#97A6BE" fontSize={11} transform={`rotate(-90,-40,${chartH / 2})`}>Frecuencia (log)</text>
                  {/* Ideal Zipf reference line */}
                  <path d={idealD} fill="none" stroke="#7A89A3" strokeWidth={1.5} strokeDasharray="6,4" />
                  {/* Actual data line */}
                  <path d={pathD} fill="none" stroke="#3987e5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  {/* Scatter dots (sample) */}
                  {zipfData.filter((_, i) => i % 10 === 0).map((d, i) => (
                    <circle key={i} cx={sx(logRanks[zipfData.indexOf(d)])} cy={sy(logFreqs[zipfData.indexOf(d)])} r={3} fill="#3987e5" fillOpacity={0.8}>
                      <title>"{d.rank}º" — {d.freq.toLocaleString()} apariciones</title>
                    </circle>
                  ))}
                </g>
              </svg>
              <div className="flex gap-5 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-[#3987e5] rounded" />
                  <span className="text-xs text-mist">Distribución real del corpus</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 border-t-2 border-fog border-dashed" />
                  <span className="text-xs text-mist">Ley de Zipf ideal (α=1)</span>
                </div>
              </div>
              <p className="text-xs text-mist mt-2 leading-relaxed">
                La <strong className="text-haze">Ley de Zipf</strong> predice que en lenguaje natural, la frecuencia de una palabra es inversamente proporcional a su rango.
                Si la curva real sigue la línea ideal, el corpus exhibe distribución léxica típica del lenguaje humano.
                Desviaciones indican sesgo temático o corpus especializado.
              </p>
            </div>
          </ChartCard>
        );
      })()}

      {/* ── TRANS-4: Floating Compare Badge ── */}
      {compareTerms.length > 0 && !showComparator && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-ink-850 border border-stage-vec/40 rounded-2xl px-4 py-2.5 shadow-2xl shadow-black/50">
          <div className="flex gap-1.5">
            {compareTerms.map(t => (
              <span key={t} className="px-2.5 py-1 rounded-lg bg-stage-vec/15 text-paper text-xs font-medium border border-stage-vec/30">{t}</span>
            ))}
          </div>
          <button
            onClick={() => setShowComparator(true)}
            className="px-3 py-1.5 rounded-lg bg-stage-vec text-ink-950 hover:bg-violet-300 text-xs font-semibold transition-colors"
          >
            Comparar →
          </button>
          <button
            onClick={() => setCompareTerms([])}
            className="p-1 text-fog hover:text-white transition-colors"
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
          { key: 'freq',  label: 'Frecuencia (BoW)', color: 'text-paper',    fmt: (v: number | null) => v != null ? v.toLocaleString() : '—' },
          { key: 'rank',  label: 'Rango',            color: 'text-haze',   fmt: (v: number | null) => v != null ? `#${v}` : '—' },
          { key: 'idf',   label: 'IDF',              color: 'text-paper',  fmt: (v: number | null) => v != null ? v.toFixed(4) : '—' },
          { key: 'tfidf', label: 'TF-IDF',           color: 'text-paper', fmt: (v: number | null) => v != null ? v.toFixed(4) : '—' },
        ] as const;
        return (
          <>
            <div className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm" onClick={() => setShowComparator(false)} />
            <div className="fixed inset-x-4 bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[700px] z-50 bg-ink-900 rounded-2xl border border-ink-600 shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-700/60">
                <div>
                  <h3 className="font-display text-[15px] font-semibold text-paper">Comparador de términos</h3>
                  <p className="text-xs text-mist mt-0.5">{compareTerms.length} términos seleccionados</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setCompareTerms([]); setShowComparator(false); }}
                    className="text-xs text-mist hover:text-rose-400 transition-colors px-2 py-1"
                  >Limpiar</button>
                  <button onClick={() => setShowComparator(false)} className="p-1.5 text-fog hover:text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-700/40">
                      <th className="text-left px-5 py-2.5 text-xs text-fog font-medium uppercase tracking-wider w-32">Métrica</th>
                      {termData.map(td => (
                        <th key={td.term} className="text-center px-4 py-2.5 text-xs font-semibold text-paper bg-stage-vec/[0.06]">{td.term}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-700/30">
                    {metrics.map(m => (
                      <tr key={m.key} className="hover:bg-ink-850/30">
                        <td className="px-5 py-2.5 text-xs text-mist font-medium">{m.label}</td>
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
                    <tr className="hover:bg-ink-850/30">
                      <td className="px-5 py-2.5 text-xs text-mist font-medium">Frecuencia relativa</td>
                      {termData.map(td => (
                        <td key={td.term} className="px-4 py-2.5">
                          <div className="h-2 w-full bg-ink-800 rounded-full overflow-hidden">
                            <div className="h-2 bg-stage-vec rounded-full transition-all" style={{ width: `${td.pct}%` }} />
                          </div>
                          <p className="text-xs text-fog text-center mt-1">{td.pct.toFixed(1)}%</p>
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
