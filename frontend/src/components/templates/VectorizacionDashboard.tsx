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
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { ResponsiveNetwork } from '@nivo/network';
import { DashboardGrid, MetricCardDark } from '../organisms';
import { ChartCard } from '../molecules';
import dashboardService from '../../services/dashboardService';
import type { VectorizationDashboardData } from '../../services/dashboardService';
import { useFilter } from '../../contexts/FilterContext';
import type { BagOfWords } from '../../services/bagOfWordsService';
import type { NgramAnalysis } from '../../services/ngramAnalysisService';
import type { TfIdfAnalysis } from '../../services/tfidfAnalysisService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectedTerm {
  text: string;
  bowScore: number | null;
  bowRank: number | null;
  tfidfScore: number | null;
  tfidfRank: number | null;
  idfScore: number | null;
  relatedNgrams: Array<{ label: string; value: number }>;
  source: 'bow' | 'tfidf' | 'ngram';
}

interface ScatterPoint {
  term: string;
  tf: number;
  idf: number;
  tfidf: number;
}

interface HeatmapDataRow {
  id: string;
  data: Array<{ x: string; y: number | null }>;
}

interface ComparacionItem {
  term: string;
  bowFreq: number;
  bowRank: number;
  tfidfScore: number;
  tfidfRank: number;
  rankDiff: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getNgramLabel = ([min, max]: [number, number]): string => {
  if (min === 1 && max === 1) return 'Unigramas';
  if (min === 2 && max === 2) return 'Bigramas';
  if (min === 3 && max === 3) return 'Trigramas';
  if (min === 4 && max === 4) return 'Cuatrigramas';
  if (min === max) return `${min}-gramas`;
  return `(${min},${max})-gramas`;
};

// ─── Export utilities (COMPLETE data) ────────────────────────────────────────

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const BOM = mimeType.includes('csv') ? '\uFEFF' : '';
  const blob = new Blob([BOM + content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const escapeCsvField = (v: string | number): string => {
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"` : s;
};

const buildCsv = (headers: string[], rows: (string | number)[][]): string =>
  [headers.map(escapeCsvField).join(','), ...rows.map(r => r.map(escapeCsvField).join(','))].join('\n');

/** BoW: exports FULL vocabulary (all terms, not just top N) */
const exportBowCompleteCsv = (bow: BagOfWords, analysisName: string) => {
  const slug = analysisName.replace(/\s+/g, '_');
  // vocabulary: Record<string, number> has ALL terms with frequencies
  const rows = Object.entries(bow.vocabulary || {})
    .sort((a, b) => b[1] - a[1])
    .map(([term, freq], i) => [i + 1, term, freq]);
  // If vocabulary empty, fall back to top_terms
  const finalRows = rows.length > 0
    ? rows
    : (bow.top_terms || []).map(t => [t.rank, t.term, t.score]);
  const csv = buildCsv(['rank', 'termino', 'frecuencia'], finalRows);
  downloadFile(csv, `bow_vocabulario_completo_${slug}.csv`, 'text/csv');
};

/** TF-IDF: exports ALL terms using idf_values (every term in corpus) */
const exportTfidfCompleteCsv = (tfidf: TfIdfAnalysis, analysisName: string) => {
  const slug = analysisName.replace(/\s+/g, '_');
  const tfMap   = new Map((tfidf.tf_matrix?.top_terms_by_tf  || []).map(t => [t.term, t.score]));
  const tfidfMap = new Map((tfidf.tfidf_matrix?.top_terms    || []).map(t => [t.term, t.score]));
  // idf_values has ALL terms in the vocabulary
  const idfEntries = Object.entries(tfidf.idf_vector?.idf_values || {});
  const rows = idfEntries
    .sort((a, b) => (tfidfMap.get(b[0]) || 0) - (tfidfMap.get(a[0]) || 0))
    .map(([term, idf], i) => [
      i + 1, term,
      tfMap.has(term)   ? tfMap.get(term)!.toFixed(4)   : 'N/A',
      idf.toFixed(4),
      tfidfMap.has(term) ? tfidfMap.get(term)!.toFixed(4) : 'N/A',
    ]);
  // If idf_values empty, fall back to top_terms
  const finalRows = rows.length > 0
    ? rows
    : (tfidf.tfidf_matrix?.top_terms || []).map(t => [t.rank, t.term, 'N/A', 'N/A', t.score.toFixed(4)]);
  const csv = buildCsv(['rank', 'termino', 'tf', 'idf', 'tfidf'], finalRows);
  downloadFile(csv, `tfidf_completo_${slug}.csv`, 'text/csv');
};

/** N-grams: exports ALL configurations, ALL available terms */
const exportNgramCompleteCsv = (ngram: NgramAnalysis, analysisName: string) => {
  const slug = analysisName.replace(/\s+/g, '_');
  const rows: (string | number)[][] = [];
  Object.entries(ngram.results || {}).forEach(([, result]) => {
    const label = getNgramLabel(result.ngram_range || [1, 1]);
    (result.top_terms || []).forEach((t, i) => {
      rows.push([label, i + 1, t.term, t.score]);
    });
  });
  const csv = buildCsv(['configuracion', 'rank', 'ngrama', 'frecuencia'], rows);
  downloadFile(csv, `ngramas_completo_${slug}.csv`, 'text/csv');
};

/** JSON: complete export with full vocabularies */
const exportJsonComplete = (data: VectorizationDashboardData) => {
  const bow   = data.selectedBow;
  const tfidf = data.selectedTfidf;
  const ngram = data.selectedNgram;
  const payload = {
    metadata: {
      exported_at: new Date().toISOString(),
      bow_analysis:   bow?.name   || null,
      tfidf_analysis: tfidf?.name || null,
      ngram_analysis: ngram?.name || null,
      note: 'Exportación completa — incluye vocabulario completo, no solo top términos',
    },
    bow: bow ? {
      name:                    bow.name,
      vocabulary_size:         bow.vocabulary_size,
      document_count:          bow.document_count,
      min_df:                  bow.min_df,
      max_df:                  bow.max_df,
      max_features:            bow.max_features,
      avg_terms_per_document:  bow.avg_terms_per_document,
      total_term_occurrences:  bow.total_term_occurrences,
      matrix_shape:            bow.matrix_shape,
      matrix_sparsity:         bow.matrix_sparsity,
      vocabulary: bow.vocabulary || {},       // COMPLETE vocabulary
      feature_names: bow.feature_names || [], // all feature names
    } : null,
    tfidf: tfidf ? {
      name:             tfidf.name,
      vocabulary_size:  tfidf.vocabulary_size,
      document_count:   tfidf.document_count,
      parameters: {
        use_idf:     tfidf.use_idf,
        smooth_idf:  tfidf.smooth_idf,
        sublinear_tf: tfidf.sublinear_tf,
        min_df:      tfidf.min_df,
        max_df:      tfidf.max_df,
        max_features: tfidf.max_features,
      },
      idf_values:          tfidf.idf_vector?.idf_values           || {}, // ALL terms IDF
      top_terms_by_tf:     tfidf.tf_matrix?.top_terms_by_tf       || [],
      top_terms_by_idf:    tfidf.idf_vector?.top_terms_by_idf     || [],
      bottom_terms_by_idf: tfidf.idf_vector?.bottom_terms_by_idf  || [],
      top_terms_tfidf:     tfidf.tfidf_matrix?.top_terms          || [],
      avg_idf:             tfidf.idf_vector?.avg_idf              ?? null,
    } : null,
    ngrams: ngram ? {
      name:           ngram.name,
      document_count: ngram.document_count,
      configurations: Object.entries(ngram.results || {}).map(([key, result]) => ({
        config_key:    key,
        ngram_range:   result.ngram_range,
        label:         getNgramLabel(result.ngram_range || [1, 1]),
        vocabulary_size:           result.vocabulary_size,
        unique_terms:              result.unique_terms,
        total_term_occurrences:    result.total_term_occurrences,
        avg_terms_per_document:    result.avg_terms_per_document,
        matrix_sparsity:           result.matrix_sparsity,
        terms: result.top_terms || [],  // all available terms
      })),
      comparisons: ngram.comparisons || null,
    } : null,
  };
  downloadFile(JSON.stringify(payload, null, 2), 'vectorizacion_completo.json', 'application/json');
};

/** Python dict: complete vocabularies, ready for Pandas/sklearn */
const exportPythonDictComplete = (data: VectorizationDashboardData) => {
  const now  = new Date().toISOString().split('T')[0];
  const bow  = data.selectedBow;
  const tfidf = data.selectedTfidf;
  const ngram = data.selectedNgram;

  // BoW: full vocabulary
  const bowVocabEntries = Object.entries(bow?.vocabulary || {})
    .sort((a, b) => b[1] - a[1]);
  const bowLines = bowVocabEntries.length > 0
    ? bowVocabEntries.map(([t, f]) => `    "${t}": ${f},`).join('\n')
    : (bow?.top_terms || []).map(t => `    "${t.term}": ${t.score},`).join('\n');

  // IDF: all values
  const idfLines = Object.entries(tfidf?.idf_vector?.idf_values || {})
    .slice(0, 5000)
    .map(([t, v]) => `    "${t}": ${v.toFixed(6)},`).join('\n');

  // TF-IDF top terms
  const tfidfLines = (tfidf?.tfidf_matrix?.top_terms || [])
    .map(t => `    "${t.term}": {"score": ${t.score.toFixed(6)}, "rank": ${t.rank}},`).join('\n');

  // N-grams: all configs
  const ngramBlocks = Object.entries(ngram?.results || {}).map(([key, result]) => {
    const label = getNgramLabel(result.ngram_range || [1, 1]);
    const lines = (result.top_terms || [])
      .map(t => `        {"ngrama": "${t.term}", "frecuencia": ${t.score}, "rank": ${t.rank}},`)
      .join('\n');
    return `    "${key}": {  # ${label}\n        "ngram_range": ${JSON.stringify(result.ngram_range)},\n        "vocabulary_size": ${result.vocabulary_size},\n        "terms": [\n${lines}\n        ],\n    },`;
  }).join('\n');

  const py = `# ============================================================
# Exportación COMPLETA de Vectorización — Análisis de Texto IES
# Generado: ${now}
# BoW:     ${bow?.name || 'N/A'} (vocabulario: ${bow?.vocabulary_size || 0} términos)
# TF-IDF:  ${tfidf?.name || 'N/A'}
# N-gramas: ${ngram?.name || 'N/A'}
# ============================================================

# ── Bolsa de Palabras (vocabulario completo) ──────────────
# Clave: término | valor: frecuencia total en el corpus
bow_vocabulary = {
${bowLines}
}

bow_metadata = {
    "vocabulary_size":          ${bow?.vocabulary_size || 0},
    "document_count":           ${bow?.document_count  || 0},
    "min_df":                   ${bow?.min_df          || 1},
    "max_df":                   ${bow?.max_df          || 1.0},
    "max_features":             ${bow?.max_features    || 'None'},
    "avg_terms_per_document":   ${bow?.avg_terms_per_document || 0},
    "total_term_occurrences":   ${bow?.total_term_occurrences || 0},
}

# ── TF-IDF: valores IDF completos (todos los términos) ───
# IDF alto = término raro/específico | IDF bajo = término común
tfidf_idf_values = {
${idfLines}
}

# TF-IDF: top términos por score combinado
tfidf_top_terms = {
${tfidfLines}
}

tfidf_metadata = {
    "vocabulary_size": ${tfidf?.vocabulary_size || 0},
    "document_count":  ${tfidf?.document_count  || 0},
    "use_idf":         ${tfidf?.use_idf ? 'True' : 'False'},
    "smooth_idf":      ${tfidf?.smooth_idf ? 'True' : 'False'},
    "sublinear_tf":    ${tfidf?.sublinear_tf ? 'True' : 'False'},
    "avg_idf":         ${tfidf?.idf_vector?.avg_idf ?? 'None'},
}

# ── N-gramas: todas las configuraciones ──────────────────
ngrams_by_config = {
${ngramBlocks}
}

# ── Uso sugerido con Pandas ───────────────────────────────
# import pandas as pd
#
# df_bow = pd.DataFrame([
#     {"termino": k, "frecuencia": v, "rank": i+1}
#     for i, (k, v) in enumerate(sorted(bow_vocabulary.items(), key=lambda x: -x[1]))
# ])
#
# df_idf = pd.DataFrame([
#     {"termino": k, "idf": v}
#     for k, v in tfidf_idf_values.items()
# ]).sort_values("idf")
#
# df_tfidf = pd.DataFrame([
#     {"termino": k, **v} for k, v in tfidf_top_terms.items()
# ]).sort_values("score", ascending=False)
#
# # Merge BoW + IDF para análisis combinado:
# df_combined = df_bow.merge(df_idf, on="termino", how="inner")
`;
  downloadFile(py, 'vectorizacion_completo.py', 'text/x-python');
};

/** Jupyter notebook (.ipynb) with code cells for Pandas analysis */
const exportJupyterNotebook = (data: VectorizationDashboardData) => {
  const now = new Date().toISOString().split('T')[0];
  const bow = data.selectedBow;
  const tfidf = data.selectedTfidf;
  const ngram = data.selectedNgram;
  const cell = (source: string[], type: 'code' | 'markdown' = 'code') =>
    type === 'code'
      ? { cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source }
      : { cell_type: 'markdown', metadata: {}, source };

  const bowVocab = JSON.stringify(Object.fromEntries(Object.entries(bow?.vocabulary || {}).slice(0, 3000)), null, 2);
  const idfVals  = JSON.stringify(Object.fromEntries(Object.entries(tfidf?.idf_vector?.idf_values || {}).slice(0, 3000)), null, 2);

  const ngramCells = Object.entries(ngram?.results || {}).slice(0, 3).map(([key, result]) => {
    const label = getNgramLabel(result.ngram_range || [1, 1]);
    const terms = JSON.stringify((result.top_terms || []).slice(0, 100).map(t => ({ ngrama: t.term, frecuencia: t.score })));
    const safeKey = key.replace(/-/g, '_');
    return cell([
      `# ${label}\n`,
      `ngrams_${safeKey} = ${terms}\n`,
      `df_ng = pd.DataFrame(ngrams_${safeKey})\n`,
      `df_ng.head(20).plot.barh(x="ngrama", y="frecuencia", figsize=(12,5), title="Top 20 ${label}", color="#8b5cf6", legend=False)\n`,
      `plt.tight_layout(); plt.show()`,
    ]);
  });

  const notebook = {
    nbformat: 4, nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.8.0' },
    },
    cells: [
      cell([`# Análisis de Vectorización — IES\n`, `**Generado:** ${now}  \n`, `**BoW:** ${bow?.name || 'N/A'}  \n`, `**TF-IDF:** ${tfidf?.name || 'N/A'}  \n`, `**N-gramas:** ${ngram?.name || 'N/A'}`], 'markdown'),
      cell(['## 1. Dependencias'], 'markdown'),
      cell(['# !pip install pandas matplotlib seaborn scikit-learn\n', 'import pandas as pd\n', 'import matplotlib.pyplot as plt\n', 'import seaborn as sns\n', 'print("✅ Librerías cargadas")']),
      cell(['## 2. Bolsa de Palabras'], 'markdown'),
      cell([`bow_vocabulary = ${bowVocab}\n`, `\n`, `df_bow = pd.DataFrame([{"termino": k, "frecuencia": v} for k, v in sorted(bow_vocabulary.items(), key=lambda x: -x[1])])\n`, `df_bow["rank"] = range(1, len(df_bow)+1)\n`, `print(f"Vocabulario: {len(df_bow)} términos")\n`, `df_bow.head(20)`]),
      cell([`df_bow.head(20).plot.barh(x="termino", y="frecuencia", figsize=(12,5), title="Top 20 Términos — BoW", color="#06b6d4", legend=False)\n`, `plt.tight_layout(); plt.show()`]),
      cell(['## 3. TF-IDF'], 'markdown'),
      cell([`tfidf_idf_values = ${idfVals}\n`, `\n`, `df_idf = pd.DataFrame([{"termino": k, "idf": v} for k, v in tfidf_idf_values.items()]).sort_values("idf")\n`, `print(f"IDF: {len(df_idf)} términos")\n`, `df_idf.head(10)`]),
      cell([`df_combined = df_bow.merge(df_idf, on="termino", how="inner")\n`, `df_combined["tfidf_score"] = df_combined["frecuencia"] * df_combined["idf"]\n`, `df_combined = df_combined.sort_values("tfidf_score", ascending=False)\n`, `\n`, `# Scatter TF vs IDF\n`, `fig, ax = plt.subplots(figsize=(10,7))\n`, `sc = ax.scatter(df_combined["frecuencia"].head(100), df_combined["idf"].head(100), c=df_combined["tfidf_score"].head(100), cmap="viridis", s=60, alpha=0.7)\n`, `plt.colorbar(sc, label="TF-IDF Score")\n`, `for _, r in df_combined.head(10).iterrows():\n`, `    ax.annotate(r["termino"], (r["frecuencia"], r["idf"]), fontsize=8)\n`, `ax.set_xlabel("TF"); ax.set_ylabel("IDF"); ax.set_title("Scatter TF vs IDF")\n`, `plt.tight_layout(); plt.show()`]),
      cell(['## 4. N-gramas'], 'markdown'),
      ...ngramCells,
      cell(['## 5. Heatmap términos × métricas'], 'markdown'),
      cell([`top = df_combined.head(20)\n`, `hm = top.set_index("termino")[["frecuencia","idf","tfidf_score"]]\n`, `hm_norm = (hm - hm.min()) / (hm.max() - hm.min())\n`, `\n`, `fig, ax = plt.subplots(figsize=(14,4))\n`, `sns.heatmap(hm_norm.T, annot=True, fmt=".2f", cmap="Blues", ax=ax, linewidths=0.5)\n`, `ax.set_title("Heatmap: Top 20 términos × Métricas (normalizado)")\n`, `plt.tight_layout(); plt.show()`]),
    ],
  };
  downloadFile(JSON.stringify(notebook, null, 2), `vectorizacion_${now}.ipynb`, 'application/json');
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const TableIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
  </svg>
);
const CloudIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
);
const SortAscIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);
const SortDescIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);
const CheckboxIcon = ({ checked }: { checked: boolean }) => (
  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'bg-cyan-500 border-cyan-500' : 'border-gray-500 bg-transparent'}`}>
    {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
  </div>
);

// ─── WordDetailPanel ──────────────────────────────────────────────────────────

interface WordDetailPanelProps {
  term: SelectedTerm;
  totalDocs: number;
  maxBowScore: number;
  maxTfidfScore: number;
  onClose: () => void;
  onExportTerm: (term: SelectedTerm) => void;
}

const WordDetailPanel: React.FC<WordDetailPanelProps> = ({
  term, totalDocs, maxBowScore, maxTfidfScore, onClose, onExportTerm,
}) => {
  const bowPct   = term.bowScore   != null && maxBowScore   > 0 ? (term.bowScore   / maxBowScore)   * 100 : 0;
  const tfidfPct = term.tfidfScore != null && maxTfidfScore > 0 ? (term.tfidfScore / maxTfidfScore) * 100 : 0;
  const sourceLabel = term.source === 'bow' ? 'Bolsa de Palabras' : term.source === 'tfidf' ? 'TF-IDF' : 'N-Gramas';
  const sourceBadgeClass = term.source === 'bow'
    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    : term.source === 'tfidf' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    : 'bg-purple-500/20 text-purple-400 border-purple-500/30';

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto w-96 bg-slate-900 border-l border-slate-700/50 shadow-2xl flex flex-col h-full overflow-hidden animate-[slideInRight_0.25s_ease-out]">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${sourceBadgeClass}`}>{sourceLabel}</span>
              {term.bowRank && <span className="text-xs text-slate-500">#{term.bowRank}</span>}
            </div>
            <h3 className="text-xl font-bold text-white break-all leading-tight" title={term.text}>{term.text}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors flex-shrink-0 mt-0.5">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* BoW */}
          {term.bowScore != null && (
            <section>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />Bolsa de Palabras
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-300">Frecuencia total</span>
                    <span className="font-bold text-cyan-400">{term.bowScore.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700/60">
                    <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-700" style={{ width: `${bowPct}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{bowPct.toFixed(1)}% del término más frecuente</p>
                </div>
                {term.bowRank && (
                  <div className="flex justify-between text-sm py-2 border-b border-slate-700/40">
                    <span className="text-slate-400">Ranking en BoW</span>
                    <span className="text-white font-medium">#{term.bowRank}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm py-2 border-b border-slate-700/40">
                  <span className="text-slate-400">Corpus analizado</span>
                  <span className="text-white font-medium">{totalDocs} documentos</span>
                </div>
              </div>
            </section>
          )}

          {/* TF-IDF */}
          <section>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />TF-IDF
            </h4>
            {term.tfidfScore != null ? (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-300">Score TF-IDF</span>
                    <span className="font-bold text-blue-400">{term.tfidfScore.toFixed(4)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700/60">
                    <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-700" style={{ width: `${tfidfPct}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{tfidfPct.toFixed(1)}% del score máximo</p>
                </div>
                {term.idfScore != null && (
                  <div className="flex justify-between text-sm py-2 border-b border-slate-700/40">
                    <span className="text-slate-400">Valor IDF</span>
                    <span className="text-white font-medium">{term.idfScore.toFixed(4)}</span>
                  </div>
                )}
                {term.tfidfRank && (
                  <div className="flex justify-between text-sm py-2 border-b border-slate-700/40">
                    <span className="text-slate-400">Ranking TF-IDF</span>
                    <span className="text-white font-medium">#{term.tfidfRank}</span>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-300 leading-relaxed">
                    {term.tfidfScore > 0.3 ? '⭐ Término muy relevante y distintivo en el corpus.'
                     : term.tfidfScore > 0.1 ? '📊 Término con relevancia moderada en el corpus.'
                     : '📌 Término común — alta frecuencia pero bajo poder discriminativo.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                <p className="text-xs text-slate-500 text-center">No aparece en el análisis TF-IDF activo.</p>
              </div>
            )}
          </section>

          {/* N-grams */}
          <section>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Aparece en N-gramas
            </h4>
            {term.relatedNgrams.length > 0 ? (
              <div className="space-y-2">
                {term.relatedNgrams.slice(0, 6).map((ng, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-slate-700/30 last:border-0">
                    <span className="text-sm text-purple-300 font-medium truncate" title={ng.label}>"{ng.label}"</span>
                    <span className="text-xs text-slate-400 flex-shrink-0 bg-slate-800/50 px-2 py-0.5 rounded">{ng.value.toLocaleString()}×</span>
                  </div>
                ))}
                {term.relatedNgrams.length > 6 && (
                  <p className="text-xs text-slate-500 text-center pt-1">+{term.relatedNgrams.length - 6} n-gramas más</p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                <p className="text-xs text-slate-500 text-center">No encontrado en el top N-gramas activo.</p>
              </div>
            )}
          </section>

          {/* Interpretation */}
          <section className="p-4 rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Interpretación</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {term.bowScore != null && term.tfidfScore != null
                ? term.tfidfScore > 0.2
                  ? `"${term.text}" es un término clave: alta frecuencia (${term.bowScore.toLocaleString()}) y alto poder discriminativo (TF-IDF ${term.tfidfScore.toFixed(3)}).`
                  : `"${term.text}" aparece frecuentemente (${term.bowScore.toLocaleString()} veces) pero su TF-IDF (${term.tfidfScore.toFixed(3)}) indica que es poco diferenciador entre documentos.`
                : term.bowScore != null
                ? `"${term.text}" tiene frecuencia ${term.bowScore.toLocaleString()} en el corpus.`
                : `"${term.text}" aparece en N-gramas con frecuencia ${term.relatedNgrams[0]?.value || 0}.`}
            </p>
          </section>
        </div>

        <div className="px-5 py-4 border-t border-slate-700/50">
          <button
            onClick={() => onExportTerm(term)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-cyan-400 border border-cyan-500/40 rounded-xl hover:bg-cyan-500/10 transition-colors"
          >
            <DownloadIcon />
            Exportar "{term.text.length > 20 ? term.text.slice(0, 20) + '…' : term.text}"
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ExportModal ──────────────────────────────────────────────────────────────

type ExportOption = 'bow_csv' | 'tfidf_csv' | 'ngram_csv' | 'all_json' | 'python_dict' | 'jupyter_notebook';

interface ExportModalProps {
  data: VectorizationDashboardData;
  onClose: () => void;
}

const EXPORT_OPTIONS: Array<{ id: ExportOption; label: string; desc: string; icon: string; color: string }> = [
  { id: 'bow_csv',     label: 'Vocabulario completo BoW (.csv)',    desc: 'Todos los términos del corpus con su frecuencia — no solo top N', icon: '📊', color: 'cyan'   },
  { id: 'tfidf_csv',  label: 'TF-IDF completo (.csv)',             desc: 'Todos los términos: TF, IDF y score TF-IDF',                    icon: '📈', color: 'blue'   },
  { id: 'ngram_csv',  label: 'N-gramas completos (.csv)',          desc: 'Todas las configuraciones: bigramas, trigramas, etc.',           icon: '🔗', color: 'purple' },
  { id: 'all_json',   label: 'Exportación completa (.json)',       desc: 'Todos los análisis con vocabulario completo + metadatos',        icon: '📦', color: 'amber'  },
  { id: 'python_dict',     label: 'Diccionario Python (.py)',       desc: 'Listo para Pandas, scikit-learn o spaCy — con uso sugerido',           icon: '🐍', color: 'emerald'},
  { id: 'jupyter_notebook', label: 'Jupyter Notebook (.ipynb)',    desc: 'Análisis completo con visualizaciones listas para ejecutar en Jupyter', icon: '📓', color: 'amber' },
];

const exportColorMap: Record<string, string> = {
  cyan:    'border-cyan-500/40   bg-cyan-500/10   text-cyan-400',
  blue:    'border-blue-500/40   bg-blue-500/10   text-blue-400',
  purple:  'border-purple-500/40 bg-purple-500/10 text-purple-400',
  amber:   'border-amber-500/40  bg-amber-500/10  text-amber-400',
  emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
};

const ExportModal: React.FC<ExportModalProps> = ({ data, onClose }) => {
  const [selected, setSelected] = useState<Set<ExportOption>>(new Set(['bow_csv', 'tfidf_csv']));
  const [exporting, setExporting] = useState(false);

  const toggle = (id: ExportOption) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleExport = async () => {
    setExporting(true);
    try {
      const bowName   = data.selectedBow?.name   || 'bow';
      const tfidfName = data.selectedTfidf?.name || 'tfidf';
      const ngramName = data.selectedNgram?.name || 'ngrams';
      if (selected.has('bow_csv')    && data.selectedBow)   exportBowCompleteCsv(data.selectedBow, bowName);
      if (selected.has('tfidf_csv')  && data.selectedTfidf) exportTfidfCompleteCsv(data.selectedTfidf, tfidfName);
      if (selected.has('ngram_csv')  && data.selectedNgram) exportNgramCompleteCsv(data.selectedNgram, ngramName);
      if (selected.has('all_json'))    exportJsonComplete(data);
      if (selected.has('python_dict'))     exportPythonDictComplete(data);
      if (selected.has('jupyter_notebook')) exportJupyterNotebook(data);
    } finally {
      setExporting(false);
      onClose();
    }
  };

  const isAvailable = (id: ExportOption) => {
    if (id === 'bow_csv')    return !!data.selectedBow;
    if (id === 'tfidf_csv')  return !!data.selectedTfidf;
    if (id === 'ngram_csv')  return !!data.selectedNgram;
    return true;
  };

  const sizeHint = (id: ExportOption): string | null => {
    if (id === 'bow_csv' && data.selectedBow)   return `${(data.selectedBow.vocabulary_size || 0).toLocaleString()} términos`;
    if (id === 'tfidf_csv' && data.selectedTfidf) {
      const n = Object.keys(data.selectedTfidf.idf_vector?.idf_values || {}).length;
      return `${n > 0 ? n.toLocaleString() : data.selectedTfidf.vocabulary_size.toLocaleString()} términos`;
    }
    if (id === 'ngram_csv' && data.selectedNgram) {
      const total = Object.values(data.selectedNgram.results || {}).reduce((s, r) => s + (r.top_terms?.length || 0), 0);
      return `${total.toLocaleString()} n-gramas`;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><DownloadIcon />Exportar Datos Completos</h2>
            <p className="text-xs text-slate-400 mt-0.5">Se exporta el vocabulario completo, no solo los top términos</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"><CloseIcon /></button>
        </div>

        <div className="px-6 py-4 space-y-2.5">
          {EXPORT_OPTIONS.map(opt => {
            const available = isAvailable(opt.id);
            const checked   = selected.has(opt.id);
            const hint      = sizeHint(opt.id);
            return (
              <button key={opt.id} onClick={() => available && toggle(opt.id)} disabled={!available}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  !available ? 'opacity-40 cursor-not-allowed border-slate-700/30 bg-slate-800/20'
                  : checked  ? `border ${exportColorMap[opt.color]}`
                  : 'border-slate-700/40 bg-slate-800/20 hover:bg-slate-800/40'
                }`}
              >
                <CheckboxIcon checked={checked && available} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{opt.icon}</span>
                    <span className="text-sm font-medium text-slate-200">{opt.label}</span>
                    {!available && <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">Sin datos</span>}
                    {hint && available && <span className="text-xs text-slate-400 bg-slate-700/30 px-1.5 py-0.5 rounded">{hint}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-700/50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-400 border border-slate-700/50 rounded-xl hover:bg-slate-800/40 transition-colors">Cancelar</button>
          <button onClick={handleExport} disabled={selected.size === 0 || exporting}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {exporting
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Descargando…</>
              : <><DownloadIcon />Descargar {selected.size > 0 ? `(${selected.size})` : ''}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── SimpleWordCloud ──────────────────────────────────────────────────────────

interface WordCloudProps {
  data: Array<{ text: string; value: number }>;
  maxWords?: number;
  onWordClick?: (word: { text: string; value: number }) => void;
  selectedWord?: string | null;
}

const SimpleWordCloud: React.FC<WordCloudProps> = ({ data, maxWords = 60, onWordClick, selectedWord }) => {
  if (!data || data.length === 0) return null;
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  const getFontSize = (v: number) => 12 + ((v - minValue) / range) * 26;
  const colors = ['text-cyan-400','text-emerald-400','text-purple-400','text-blue-400','text-amber-400','text-rose-400','text-teal-400','text-violet-400'];
  return (
    <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2 p-4">
      {data.slice(0, maxWords).map((word, i) => {
        const isSelected = selectedWord === word.text;
        const n = (word.value - minValue) / range;
        return (
          <button key={word.text} onClick={() => onWordClick?.(word)}
            className={`${colors[i % colors.length]} transition-all duration-150 cursor-pointer leading-tight hover:scale-110 hover:opacity-100 hover:drop-shadow-[0_0_6px_currentColor] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:rounded ${isSelected ? 'scale-110 drop-shadow-[0_0_8px_currentColor] ring-2 ring-current ring-offset-1 ring-offset-slate-900 rounded px-1' : ''}`}
            style={{ fontSize: `${getFontSize(word.value)}px`, opacity: isSelected ? 1 : 0.45 + n * 0.55, fontWeight: n > 0.6 ? 700 : n > 0.3 ? 600 : 400 }}
            title={`${word.text}: ${word.value.toLocaleString()} apariciones`}
          >
            {word.text}
          </button>
        );
      })}
    </div>
  );
};

// ─── VocabularyTable ─────────────────────────────────────────────────────────

interface VocabularyTableProps {
  vocabulary: Record<string, number>;
  idfValues?: Record<string, number>;
  tfidfScores?: Record<string, number>;
  onTermClick?: (term: string, freq: number) => void;
  selectedTerm?: string | null;
}

const VOCAB_PER_PAGE = 50;

const VocabularyTable: React.FC<VocabularyTableProps> = ({
  vocabulary, idfValues = {}, tfidfScores = {}, onTermClick, selectedTerm,
}) => {
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [sortField, setSortField] = useState<'rank' | 'term' | 'freq' | 'idf' | 'tfidf'>('rank');
  const [sortAsc, setSortAsc]   = useState(true);

  const hasIdf   = Object.keys(idfValues).length > 0;
  const hasTfidf = Object.keys(tfidfScores).length > 0;

  const allTerms = useMemo(() => {
    const ranked = Object.entries(vocabulary)
      .sort((a, b) => b[1] - a[1])
      .map(([term, freq], i) => ({
        rank: i + 1, term, freq,
        idf:   idfValues[term]   ?? null,
        tfidf: tfidfScores[term] ?? null,
      }));
    return ranked;
  }, [vocabulary, idfValues, tfidfScores]);

  const filtered = useMemo(() => {
    let res = allTerms;
    if (search.trim()) res = res.filter(r => r.term.toLowerCase().includes(search.toLowerCase()));
    return [...res].sort((a, b) => {
      let va: number | string, vb: number | string;
      if      (sortField === 'term')  { va = a.term;  vb = b.term; }
      else if (sortField === 'idf')   { va = a.idf   ?? -Infinity; vb = b.idf   ?? -Infinity; }
      else if (sortField === 'tfidf') { va = a.tfidf ?? -Infinity; vb = b.tfidf ?? -Infinity; }
      else if (sortField === 'freq')  { va = a.freq;  vb = b.freq; }
      else                            { va = a.rank;  vb = b.rank; }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [allTerms, search, sortField, sortAsc]);

  const totalPages    = Math.max(1, Math.ceil(filtered.length / VOCAB_PER_PAGE));
  const paginated     = filtered.slice((page - 1) * VOCAB_PER_PAGE, page * VOCAB_PER_PAGE);
  const handleSort    = (f: typeof sortField) => { if (sortField === f) setSortAsc(a => !a); else { setSortField(f); setSortAsc(true); } };
  const SortIndicator = ({ f }: { f: typeof sortField }) => sortField === f ? (sortAsc ? <SortAscIcon /> : <SortDescIcon />) : <span className="w-3 h-3 inline-block" />;

  return (
    <div className="flex flex-col gap-3">
      {/* Search + count */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-400">
          {filtered.length.toLocaleString()} términos
          {search && ` para "${search}"`}
          {' · '}vocabulario completo
        </p>
        <input
          type="text" value={search} placeholder="Buscar término…"
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 w-52"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/40">
              {[
                { f: 'rank' as const, label: '#', w: 'w-12' },
                { f: 'term' as const, label: 'Término', w: '' },
                { f: 'freq' as const, label: 'Frecuencia', w: 'w-28' },
                ...(hasIdf   ? [{ f: 'idf'   as const, label: 'IDF',    w: 'w-24' }] : []),
                ...(hasTfidf ? [{ f: 'tfidf' as const, label: 'TF-IDF', w: 'w-24' }] : []),
              ].map(col => (
                <th key={col.f} onClick={() => handleSort(col.f)}
                  className={`${col.w} px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 select-none`}
                >
                  <span className="flex items-center gap-1">{col.label}<SortIndicator f={col.f} /></span>
                </th>
              ))}
              <th className="w-16 px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Bar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {paginated.map(row => {
              const isSelected = selectedTerm === row.term;
              const maxFreq = allTerms[0]?.freq || 1;
              const pct = (row.freq / maxFreq) * 100;
              return (
                <tr key={row.term}
                  onClick={() => onTermClick?.(row.term, row.freq)}
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-cyan-500/10' : 'hover:bg-slate-700/20'}`}
                >
                  <td className="px-3 py-2 text-slate-500 text-xs">{row.rank}</td>
                  <td className="px-3 py-2">
                    <span className={`font-medium ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>{row.term}</span>
                  </td>
                  <td className="px-3 py-2 text-cyan-400 font-mono text-xs">{row.freq.toLocaleString()}</td>
                  {hasIdf   && <td className="px-3 py-2 text-blue-400 font-mono text-xs">{row.idf   != null ? row.idf.toFixed(3)   : '—'}</td>}
                  {hasTfidf && <td className="px-3 py-2 text-purple-400 font-mono text-xs">{row.tfidf != null ? row.tfidf.toFixed(4) : '—'}</td>}
                  <td className="px-3 py-2">
                    <div className="h-1.5 w-16 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className="h-1.5 bg-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-slate-500">
            {Math.min((page - 1) * VOCAB_PER_PAGE + 1, filtered.length)}–{Math.min(page * VOCAB_PER_PAGE, filtered.length)} de {filtered.length.toLocaleString()}
          </p>
          <div className="flex gap-1">
            {['«','‹'].map((ch, i) => (
              <button key={ch} onClick={() => setPage(i === 0 ? 1 : p => p - 1)} disabled={page === 1}
                className="px-2 py-1 text-xs rounded border border-slate-700/50 text-slate-400 hover:bg-slate-700/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >{ch}</button>
            ))}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return p <= totalPages ? (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${p === page ? 'bg-cyan-500 border-cyan-500 text-white' : 'border-slate-700/50 text-slate-400 hover:bg-slate-700/30'}`}
                >{p}</button>
              ) : null;
            })}
            {['›','»'].map((ch, i) => (
              <button key={ch} onClick={() => setPage(i === 0 ? p => p + 1 : totalPages)} disabled={page === totalPages}
                className="px-2 py-1 text-xs rounded border border-slate-700/50 text-slate-400 hover:bg-slate-700/30 disabled:opacity-30 disabled:cursor-not-allowed"
              >{ch}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── HorizontalBarChart ──────────────────────────────────────────────────────

interface HorizontalBarChartProps {
  data: Array<{ id: string; label: string; value: number }>;
  maxBars?: number;
  colorClass?: string;
  onItemClick?: (item: { id: string; label: string; value: number }) => void;
  selectedId?: string | null;
}

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data, maxBars = 15, colorClass = 'bg-cyan-500', onItemClick, selectedId,
}) => {
  if (!data || data.length === 0) return null;
  const maxValue = Math.max(...data.map(d => d.value));
  return (
    <div className="space-y-1.5">
      {data.slice(0, maxBars).map(item => {
        const isSelected = selectedId === item.id;
        const pct = (item.value / maxValue) * 100;
        return (
          <button key={item.id} onClick={() => onItemClick?.(item)}
            className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-all text-left group ${onItemClick ? 'cursor-pointer hover:bg-slate-700/30' : 'cursor-default'} ${isSelected ? 'bg-slate-700/50 ring-1 ring-cyan-500/40' : ''}`}
          >
            <div className="w-28 flex-shrink-0 text-right">
              <span className={`text-xs truncate block transition-colors ${isSelected ? 'text-white font-medium' : 'text-slate-300 group-hover:text-slate-100'}`} title={item.label}>{item.label}</span>
            </div>
            <div className="flex-1 h-5 bg-slate-800/50 rounded-full overflow-hidden">
              <div className={`h-full ${colorClass} rounded-full transition-all duration-500 ${isSelected ? 'brightness-110' : ''}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="w-16 flex-shrink-0 text-right">
              <span className={`text-xs transition-colors ${isSelected ? 'text-white font-semibold' : 'text-slate-400 group-hover:text-slate-300'}`}>
                {typeof item.value === 'number' && item.value < 1 ? item.value.toFixed(3) : item.value.toLocaleString()}
              </span>
            </div>
            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  );
};

// ─── TF vs IDF Scatter Plot ───────────────────────────────────────────────────

interface TfIdfScatterProps {
  data: ScatterPoint[];
  onPointClick?: (term: string) => void;
  selectedTerm?: string | null;
}

const TfIdfScatter: React.FC<TfIdfScatterProps> = ({ data, onPointClick, selectedTerm }) => {
  const [hovered, setHovered] = useState<ScatterPoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
        Se necesitan datos de TF y IDF para generar el gráfico
      </div>
    );
  }

  const W = 600; const H = 320;
  const pad = { top: 20, right: 30, bottom: 50, left: 65 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const maxTf  = Math.max(...data.map(d => d.tf));
  const minTf  = Math.min(...data.map(d => d.tf));
  const maxIdf = Math.max(...data.map(d => d.idf));
  const minIdf = Math.min(...data.map(d => d.idf));
  const maxTfidf = Math.max(...data.map(d => d.tfidf)) || 1;

  const sx = (tf: number)   => ((tf  - minTf)  / (maxTf  - minTf  || 1)) * iW;
  const sy = (idf: number)  => iH - ((idf - minIdf) / (maxIdf - minIdf || 1)) * iH;
  const sr = (tfidf: number) => 3 + (tfidf / maxTfidf) * 7;
  // Color: cyan for low TF-IDF → amber for high TF-IDF
  const sColor = (tfidf: number, isHighlighted: boolean) => {
    if (isHighlighted) return '#f59e0b';
    const t = tfidf / maxTfidf;
    if (t > 0.7) return '#06b6d4';  // cyan
    if (t > 0.4) return '#8b5cf6';  // violet
    return '#64748b';               // slate
  };

  // X axis ticks (5)
  const xTicks = Array.from({ length: 5 }, (_, i) => minTf + (maxTf - minTf) * i / 4);
  // Y axis ticks (5)
  const yTicks = Array.from({ length: 5 }, (_, i) => minIdf + (maxIdf - minIdf) * i / 4);

  const formatNum = (n: number) =>
    n < 0.01 ? n.toExponential(1) : n < 1 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.round(n).toLocaleString();

  return (
    <div className="relative select-none">
      {/* Axis labels */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-400 pointer-events-none" style={{ left: '-10px' }}>
        IDF (especificidad)
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={e => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        {/* Grid */}
        <g opacity="0.2">
          {xTicks.map((v, i) => (
            <line key={`xg-${i}`} x1={pad.left + sx(v)} y1={pad.top} x2={pad.left + sx(v)} y2={pad.top + iH} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
          ))}
          {yTicks.map((v, i) => (
            <line key={`yg-${i}`} x1={pad.left} y1={pad.top + sy(v)} x2={pad.left + iW} y2={pad.top + sy(v)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
          ))}
        </g>

        {/* Axes */}
        <line x1={pad.left} y1={pad.top + iH} x2={pad.left + iW} y2={pad.top + iH} stroke="#475569" strokeWidth="1.5" />
        <line x1={pad.left} y1={pad.top}      x2={pad.left}       y2={pad.top + iH} stroke="#475569" strokeWidth="1.5" />

        {/* X ticks */}
        {xTicks.map((v, i) => (
          <g key={`xt-${i}`}>
            <line x1={pad.left + sx(v)} y1={pad.top + iH} x2={pad.left + sx(v)} y2={pad.top + iH + 4} stroke="#475569" />
            <text x={pad.left + sx(v)} y={pad.top + iH + 14} textAnchor="middle" fontSize="9" fill="#64748b">{formatNum(v)}</text>
          </g>
        ))}

        {/* Y ticks */}
        {yTicks.map((v, i) => (
          <g key={`yt-${i}`}>
            <line x1={pad.left - 4} y1={pad.top + sy(v)} x2={pad.left} y2={pad.top + sy(v)} stroke="#475569" />
            <text x={pad.left - 8} y={pad.top + sy(v) + 4} textAnchor="end" fontSize="9" fill="#64748b">{formatNum(v)}</text>
          </g>
        ))}

        {/* X axis label */}
        <text x={pad.left + iW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#64748b">TF (frecuencia del término)</text>

        {/* Points */}
        {data.map(d => {
          const cx = pad.left + sx(d.tf);
          const cy = pad.top  + sy(d.idf);
          const r  = sr(d.tfidf);
          const highlighted = hovered?.term === d.term || selectedTerm === d.term;
          return (
            <circle
              key={d.term}
              cx={cx} cy={cy} r={highlighted ? r + 2 : r}
              fill={sColor(d.tfidf, highlighted)}
              fillOpacity={highlighted ? 1 : 0.75}
              stroke={selectedTerm === d.term ? '#f59e0b' : highlighted ? '#e2e8f0' : 'none'}
              strokeWidth={selectedTerm === d.term ? 2 : 1}
              className="cursor-pointer transition-all duration-100"
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onPointClick?.(d.term)}
            />
          );
        })}

        {/* Label for selected term */}
        {selectedTerm && (() => {
          const d = data.find(p => p.term === selectedTerm);
          if (!d) return null;
          const cx = pad.left + sx(d.tf);
          const cy = pad.top  + sy(d.idf);
          return (
            <text x={cx + 6} y={cy - 4} fontSize="9" fill="#f59e0b" fontWeight="600">{d.term}</text>
          );
        })()}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute z-10 pointer-events-none bg-slate-900 border border-slate-600/60 rounded-lg px-3 py-2 shadow-xl text-xs"
          style={{
            left: Math.min(mousePos.x + 12, 480),
            top:  Math.max(mousePos.y - 60, 0),
          }}
        >
          <p className="font-bold text-white mb-1">"{hovered.term}"</p>
          <p className="text-slate-400">TF: <span className="text-cyan-400 font-mono">{formatNum(hovered.tf)}</span></p>
          <p className="text-slate-400">IDF: <span className="text-blue-400 font-mono">{hovered.idf.toFixed(4)}</span></p>
          <p className="text-slate-400">TF-IDF: <span className="text-purple-400 font-mono">{hovered.tfidf.toFixed(4)}</span></p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center mt-2 flex-wrap">
        <span className="text-xs text-slate-500">TF-IDF score:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-500 opacity-75" /><span className="text-xs text-slate-400">Bajo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-violet-500 opacity-75" /><span className="text-xs text-slate-400">Medio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-cyan-500 opacity-75" /><span className="text-xs text-slate-400">Alto — término relevante y específico</span>
        </div>
      </div>
    </div>
  );
};

// ─── TermHeatmap ──────────────────────────────────────────────────────────────

const TermHeatmap: React.FC<{
  data: HeatmapDataRow[];
  onTermClick?: (term: string) => void;
}> = ({ data, onTermClick }) => {
  if (!data || data.length === 0 || data[0]?.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
        Se necesitan análisis BoW y TF-IDF para generar el heatmap
      </div>
    );
  }
  const termCount = data[0]?.data.length || 0;
  const h = Math.max(180, data.length * 52 + 90);
  return (
    <div style={{ height: `${h}px` }}>
      <ResponsiveHeatMap
        data={data as any}
        margin={{ top: 40, right: 30, bottom: 70, left: 90 }}
        valueFormat=">-.1f"
        axisTop={{
          tickSize: 5, tickPadding: 5, tickRotation: -40,
          legend: `Top ${termCount} términos`, legendOffset: -36,
        } as any}
        axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0 } as any}
        colors={{ type: 'sequential', scheme: 'blues' } as any}
        emptyColor="#1e293b"
        borderRadius={3}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.5]] } as any}
        enableLabels={false}
        legends={[{
          anchor: 'bottom', translateX: 0, translateY: 60,
          length: 220, thickness: 8, direction: 'row',
          tickPosition: 'after', tickSize: 3, tickSpacing: 4, tickOverlap: false,
          title: 'Score normalizado →', titleAlign: 'start', titleOffset: 4,
        }] as any}
        theme={{
          text: { fill: '#94a3b8', fontSize: 11 },
          axis: { ticks: { text: { fill: '#64748b' } } },
          tooltip: { container: { background: '#1e293b', color: '#f8fafc', fontSize: 12, borderRadius: '8px', border: '1px solid #334155' } },
        }}
        onClick={(cell: any) => onTermClick?.(String(cell.data?.x ?? cell.id))}
      />
    </div>
  );
};

// ─── CooccurrenceGraph ────────────────────────────────────────────────────────

const CooccurrenceGraph: React.FC<{
  nodes: Array<{ id: string; size: number; color: string }>;
  links: Array<{ source: string; target: string; distance: number; thickness: number }>;
  onNodeClick?: (nodeId: string) => void;
}> = ({ nodes, links, onNodeClick }) => {
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-slate-500 text-sm">
        Se necesitan n-gramas (bigramas) para generar el grafo de co-ocurrencia
      </div>
    );
  }
  return (
    <div style={{ height: '400px' }}>
      <ResponsiveNetwork
        data={{ nodes, links } as any}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        linkDistance={(e: any) => e.distance}
        centeringStrength={0.3}
        repulsivity={8}
        nodeSize={(n: any) => n.size}
        activeNodeSize={(n: any) => n.size * 1.4}
        nodeColor={(n: any) => n.color}
        nodeBorderWidth={1}
        nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] } as any}
        linkThickness={(l: any) => l.thickness}
        motionConfig="gentle"
        onClick={(node: any) => onNodeClick?.(node.id)}
        theme={{
          tooltip: { container: { background: '#1e293b', color: '#f8fafc', fontSize: 12, borderRadius: '8px', border: '1px solid #334155' } },
        }}
      />
    </div>
  );
};

// ─── ComparacionView ──────────────────────────────────────────────────────────

const ComparacionView: React.FC<{
  items: ComparacionItem[];
  onTermClick?: (term: string) => void;
  selectedTerm?: string | null;
}> = ({ items, onTermClick, selectedTerm }) => {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">
        Se necesitan análisis BoW y TF-IDF con términos comunes para generar la comparación
      </div>
    );
  }
  const maxBow   = Math.max(...items.map(i => i.bowFreq));
  const maxTfidf = Math.max(...items.map(i => i.tfidfScore));
  return (
    <div className="space-y-3">
      <div className="flex gap-6 text-xs px-1">
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-cyan-500" /><span className="text-slate-400">Frecuencia BoW</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-blue-500" /><span className="text-slate-400">Score TF-IDF</span></div>
        <div className="ml-auto flex items-center gap-1.5"><span className="text-slate-500 text-xs">↑ BoW  |  ↑ TF-IDF</span></div>
      </div>
      <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
        {items.map(item => {
          const bowPct   = (item.bowFreq / maxBow) * 100;
          const tfidfPct = (item.tfidfScore / maxTfidf) * 100;
          const isSelected = selectedTerm === item.term;
          return (
            <button key={item.term} onClick={() => onTermClick?.(item.term)}
              className={`w-full px-3 py-2.5 rounded-xl text-left transition-all ${isSelected ? 'bg-slate-700/60 ring-1 ring-cyan-500/40' : 'hover:bg-slate-700/30'}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-200'}`}>{item.term}</span>
                <span className="text-xs text-slate-600 ml-auto">BoW #{item.bowRank}</span>
                {item.rankDiff > 5  && <span className="text-xs text-cyan-400">↑ más en BoW</span>}
                {item.rankDiff < -5 && <span className="text-xs text-blue-400">↑ más en TF-IDF</span>}
                <span className="text-xs text-slate-600">TF-IDF #{item.tfidfRank}</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-12 shrink-0">BoW</span>
                  <div className="flex-1 h-2 bg-slate-800/50 rounded-full overflow-hidden">
                    <div className="h-2 bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${bowPct}%` }} />
                  </div>
                  <span className="text-xs text-cyan-400 font-mono w-16 text-right">{item.bowFreq.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-12 shrink-0">TF-IDF</span>
                  <div className="flex-1 h-2 bg-slate-800/50 rounded-full overflow-hidden">
                    <div className="h-2 bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${tfidfPct}%` }} />
                  </div>
                  <span className="text-xs text-blue-400 font-mono w-16 text-right">{item.tfidfScore.toFixed(4)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const VectorizacionDashboard: React.FC = () => {
  const [data, setData]               = useState<VectorizationDashboardData | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<SelectedTerm | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [vocabView, setVocabView]     = useState<'cloud' | 'table'>('cloud');
  const [activeNgramConfig, setActiveNgramConfig] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'analysis' | 'compare' | 'heatmap' | 'cooccurrence'>('analysis');
  const { filters, setSelectedBow, setSelectedNgram, setSelectedTfidf } = useFilter();

  useEffect(() => {
    if (filters.selectedDatasetId) fetchData(filters.selectedDatasetId);
    else { setData(null); setIsLoading(false); }
  }, [filters.selectedDatasetId]);

  useEffect(() => {
    setSelectedTerm(null);
    setVocabView('cloud');
    setActiveNgramConfig(null);
    setActiveSection('analysis');
  }, [filters.selectedDatasetId]);

  const fetchData = async (datasetId: number) => {
    try {
      setIsLoading(true); setError(null);
      const result = await dashboardService.getVectorizationData(datasetId);
      setData(result);
    } catch (err) {
      setError('Error al cargar los datos de vectorización');
      console.error('Vectorization dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

  // ── Co-occurrence graph: from bigrams ──
  const cooccurrenceData = useMemo(() => {
    const bigramConfig = ngramConfigs.find(c => c.key === '2_2') || ngramConfigs.find(c => c.label === 'Bigramas');
    if (!bigramConfig || bigramConfig.terms.length === 0) return { nodes: [], links: [] };
    const maxVal   = Math.max(...bigramConfig.terms.slice(0, 35).map(t => t.value)) || 1;
    const nodeSet  = new Map<string, number>();
    const links: Array<{ source: string; target: string; distance: number; thickness: number }> = [];
    bigramConfig.terms.slice(0, 35).forEach(bg => {
      const parts = bg.id.trim().split(/\s+/);
      if (parts.length < 2) return;
      const [a, b] = parts;
      nodeSet.set(a, (nodeSet.get(a) || 0) + bg.value);
      nodeSet.set(b, (nodeSet.get(b) || 0) + bg.value);
      links.push({ source: a, target: b, distance: 80 + (1 - bg.value / maxVal) * 60, thickness: 1 + (bg.value / maxVal) * 3 });
    });
    const maxNode = Math.max(...nodeSet.values()) || 1;
    const COLORS = ['#06b6d4','#8b5cf6','#10b981','#f59e0b','#ec4899','#3b82f6'];
    const nodes = Array.from(nodeSet.entries()).map(([id, freq], i) => ({
      id, size: 10 + (freq / maxNode) * 18, color: COLORS[i % COLORS.length],
    }));
    return { nodes, links };
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
        <button onClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
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

      {/* ── KPI Row ── */}
      <DashboardGrid columns={4} gap="md">
        <MetricCardDark title="Análisis BoW" value={data?.bowAnalyses?.length || 0}
          subtitle={data?.selectedBow ? data.selectedBow.name : 'Bag of Words'}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
          accentColor="cyan"
        />
        <MetricCardDark title="Análisis N-gramas" value={data?.ngramAnalyses?.length || 0}
          subtitle={ngramConfigs.length > 0 ? `${ngramConfigs.length} configuracion${ngramConfigs.length !== 1 ? 'es' : ''}` : 'Secuencias de tokens'}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
          accentColor="purple"
        />
        <MetricCardDark title="Análisis TF-IDF" value={data?.tfidfAnalyses?.length || 0}
          subtitle={scatterData.length > 0 ? `${scatterData.length} términos en scatter` : 'Ponderación de términos'}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          accentColor="blue"
        />
        <MetricCardDark
          title="Vocabulario"
          value={Object.keys(fullVocabulary).length > 0
            ? Object.keys(fullVocabulary).length.toLocaleString()
            : data?.selectedBow?.vocabulary_size?.toLocaleString() || '—'}
          subtitle={Object.keys(fullVocabulary).length > 0 ? 'términos únicos (completo)' : data?.selectedBow ? `min_df=${data.selectedBow.min_df}` : 'Términos únicos'}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>}
          accentColor="emerald"
        />
      </DashboardGrid>

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
      <div className="flex gap-1 p-1 bg-slate-800/40 border border-slate-700/50 rounded-xl w-fit">
        {([
          { key: 'analysis',     label: 'Análisis',       icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          { key: 'compare',      label: 'Comparar',       icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
          { key: 'heatmap',      label: 'Heatmap',        icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
          { key: 'cooccurrence', label: 'Co-ocurrencia',  icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveSection(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeSection === tab.key
                ? 'bg-slate-700/80 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
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
          downloadable
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
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
              <VocabularyTable
                vocabulary={Object.keys(fullVocabulary).length > 0 ? fullVocabulary : Object.fromEntries((data?.selectedBow?.top_terms || []).map(t => [t.term, t.score]))}
                idfValues={idfValues}
                tfidfScores={tfidfScoresMap}
                onTermClick={handleVocabTableClick}
                selectedTerm={selectedTerm?.text ?? null}
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
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
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
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
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
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
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

      {/* ═══════════════ COMPARAR section ═══════════════ */}
      {activeSection === 'compare' && (
        <DashboardGrid columns={1} gap="lg">
          <ChartCard
            title="Comparar BoW vs TF-IDF"
            subtitle={`${comparacionData.length} términos en común — barras comparativas de frecuencia y relevancia`}
            accentColor="cyan"
            size="xl"
            downloadable
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
            onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
            isLoading={isLoading}
          >
            <ComparacionView
              items={comparacionData}
              onTermClick={termText => {
                const bow = data?.selectedBow?.top_terms?.find(t => t.term === termText);
                const term = buildTerm(termText, 'bow', bow?.score, bow?.rank);
                setSelectedTerm(prev => prev?.text === termText ? null : term);
              }}
              selectedTerm={selectedTerm?.text ?? null}
            />
          </ChartCard>
        </DashboardGrid>
      )}

      {/* ═══════════════ HEATMAP section ═══════════════ */}
      {activeSection === 'heatmap' && (
        <ChartCard
          title="Heatmap Documento × Término"
          subtitle={`Top ${heatmapData[0]?.data.length || 0} términos × métricas normalizadas (0–100) — haz clic en una celda para analizar el término`}
          accentColor="blue"
          size="xl"
          downloadable
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>}
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <TermHeatmap
            data={heatmapData}
            onTermClick={termText => {
              const bow = data?.selectedBow?.top_terms?.find(t => t.term === termText);
              const term = buildTerm(termText, 'tfidf', bow?.score, bow?.rank);
              setSelectedTerm(prev => prev?.text === termText ? null : term);
            }}
          />
          <div className="mt-3 pt-3 border-t border-slate-700/40 grid grid-cols-3 gap-4 text-xs text-slate-400">
            <div><span className="font-medium text-slate-300">BoW Freq</span><p className="mt-0.5">Frecuencia total del término en el corpus, normalizada.</p></div>
            <div><span className="font-medium text-slate-300">IDF</span><p className="mt-0.5">Especificidad del término. Alto = aparece en pocos documentos.</p></div>
            <div><span className="font-medium text-slate-300">TF-IDF</span><p className="mt-0.5">Score combinado. Alto = frecuente y específico a la vez.</p></div>
          </div>
        </ChartCard>
      )}

      {/* ═══════════════ CO-OCURRENCIA section ═══════════════ */}
      {activeSection === 'cooccurrence' && (
        <ChartCard
          title="Grafo de Co-ocurrencia"
          subtitle={`${cooccurrenceData.nodes.length} términos · ${cooccurrenceData.links.length} conexiones — construido desde bigramas · grosor = frecuencia`}
          accentColor="purple"
          size="xl"
          downloadable
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <CooccurrenceGraph
            nodes={cooccurrenceData.nodes}
            links={cooccurrenceData.links}
            onNodeClick={termText => {
              const bow = data?.selectedBow?.top_terms?.find(t => t.term === termText);
              const term = buildTerm(termText, 'ngram', bow?.score, bow?.rank);
              setSelectedTerm(prev => prev?.text === termText ? null : term);
            }}
          />
          <div className="mt-2 pt-3 border-t border-slate-700/40 text-xs text-slate-500 text-center">
            Cada nodo es un término · cada arista conecta palabras que aparecen juntas en un bigrama · el grosor indica la frecuencia de co-ocurrencia
          </div>
        </ChartCard>
      )}

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
