/**
 * VectorizacionDashboard - Vectorization visualization dashboard
 *
 * Features:
 * - Clickable word cloud & bar charts → WordDetailPanel slide-in
 * - Cross-reference: BoW ↔ TF-IDF ↔ N-gramas per term
 * - Export: CSV · JSON · Python dict for BoW, TF-IDF, N-gramas
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardGrid, MetricCardDark } from '../organisms';
import { ChartCard } from '../molecules';
import dashboardService from '../../services/dashboardService';
import type { VectorizationDashboardData } from '../../services/dashboardService';
import { useFilter } from '../../contexts/FilterContext';
import type { TopTerm } from '../../services/bagOfWordsService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectedTerm {
  text: string;
  bowScore: number | null;
  bowRank: number | null;
  tfidfScore: number | null;
  tfidfRank: number | null;
  relatedNgrams: Array<{ label: string; value: number }>;
  source: 'bow' | 'tfidf' | 'ngram';
}

// ─── Export utilities ─────────────────────────────────────────────────────────

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const BOM = mimeType.includes('csv') ? '\uFEFF' : ''; // UTF-8 BOM for Excel CSV
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
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

const buildCsv = (headers: string[], rows: (string | number)[][]): string =>
  [headers.map(escapeCsvField).join(','), ...rows.map(r => r.map(escapeCsvField).join(','))].join('\n');

const exportBowCsv = (terms: TopTerm[], analysisName: string) => {
  const rows = terms.map(t => [t.rank, t.term, t.score]);
  const csv = buildCsv(['rank', 'termino', 'frecuencia'], rows);
  downloadFile(csv, `bow_top_terminos_${analysisName.replace(/\s+/g, '_')}.csv`, 'text/csv');
};

const exportTfidfCsv = (terms: TopTerm[], analysisName: string) => {
  const rows = terms.map(t => [t.rank, t.term, t.score]);
  const csv = buildCsv(['rank', 'termino', 'score_tfidf'], rows);
  downloadFile(csv, `tfidf_top_terminos_${analysisName.replace(/\s+/g, '_')}.csv`, 'text/csv');
};

const exportNgramCsv = (
  ngrams: Array<{ id: string; label: string; value: number }>,
  analysisName: string
) => {
  const rows = ngrams.map((ng, i) => [i + 1, ng.label, ng.value]);
  const csv = buildCsv(['rank', 'ngrama', 'frecuencia'], rows);
  downloadFile(csv, `ngramas_${analysisName.replace(/\s+/g, '_')}.csv`, 'text/csv');
};

const exportJson = (data: VectorizationDashboardData) => {
  const payload = {
    metadata: {
      exported_at: new Date().toISOString(),
      bow_analysis: data.selectedBow?.name || null,
      tfidf_analysis: data.selectedTfidf?.name || null,
      ngram_analysis: data.selectedNgram?.name || null,
    },
    bow: {
      vocabulary_size: data.selectedBow?.vocabulary_size || 0,
      document_count: data.selectedBow?.document_count || 0,
      min_df: data.selectedBow?.min_df || null,
      max_features: data.selectedBow?.max_features || null,
      top_terms: data.selectedBow?.top_terms || [],
    },
    tfidf: {
      top_terms: data.tfidfTopTerms || [],
    },
    ngrams: {
      top_sequences: data.ngramBarData || [],
    },
  };
  downloadFile(JSON.stringify(payload, null, 2), 'vectorizacion_export.json', 'application/json');
};

const exportPythonDict = (data: VectorizationDashboardData) => {
  const now = new Date().toISOString().split('T')[0];
  const bowTerms = data.selectedBow?.top_terms || [];
  const tfidfTerms = data.tfidfTopTerms || [];
  const ngrams = data.ngramBarData || [];

  const dictLines = (items: TopTerm[]) =>
    items.map(t => `    "${t.term}": {"score": ${t.score}, "rank": ${t.rank}},`).join('\n');

  const ngramLines = ngrams
    .map((ng, i) => `    {"ngrama": "${ng.label}", "frecuencia": ${ng.value}, "rank": ${i + 1}},`)
    .join('\n');

  const py = `# Exportación de Vectorización — Análisis de Texto IES
# Generado: ${now}
# Análisis BoW: ${data.selectedBow?.name || 'N/A'}
# Análisis TF-IDF: ${data.selectedTfidf?.name || 'N/A'}
# Análisis N-gramas: ${data.selectedNgram?.name || 'N/A'}

# ── Bolsa de Palabras ────────────────────────────────────────────────
# Clave: término | score: frecuencia total | rank: posición en ranking
bow_top_terms = {
${dictLines(bowTerms)}
}

bow_metadata = {
    "vocabulary_size": ${data.selectedBow?.vocabulary_size || 0},
    "document_count": ${data.selectedBow?.document_count || 0},
    "min_df": ${data.selectedBow?.min_df || 1},
    "max_features": ${data.selectedBow?.max_features || 'None'},
}

# ── TF-IDF ─────────────────────────────────────────────────────────
# score: ponderación TF-IDF (mayor = más relevante y distintivo)
tfidf_top_terms = {
${dictLines(tfidfTerms)}
}

# ── N-gramas ────────────────────────────────────────────────────────
ngrams_top = [
${ngramLines}
]

# ── Uso sugerido ────────────────────────────────────────────────────
# import pandas as pd
# df_bow = pd.DataFrame([
#     {"termino": k, **v} for k, v in bow_top_terms.items()
# ])
# df_tfidf = pd.DataFrame([
#     {"termino": k, **v} for k, v in tfidf_top_terms.items()
# ])
# df_ngrams = pd.DataFrame(ngrams_top)
`;
  downloadFile(py, 'vectorizacion_export.py', 'text/x-python');
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
  term,
  totalDocs,
  maxBowScore,
  maxTfidfScore,
  onClose,
  onExportTerm,
}) => {
  const bowPct   = term.bowScore   != null && maxBowScore   > 0 ? (term.bowScore   / maxBowScore)   * 100 : 0;
  const tfidfPct = term.tfidfScore != null && maxTfidfScore > 0 ? (term.tfidfScore / maxTfidfScore) * 100 : 0;

  const sourceLabel = term.source === 'bow' ? 'Bolsa de Palabras' : term.source === 'tfidf' ? 'TF-IDF' : 'N-Gramas';
  const sourceBadgeClass = term.source === 'bow'
    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    : term.source === 'tfidf'
    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    : 'bg-purple-500/20 text-purple-400 border-purple-500/30';

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto w-96 bg-slate-900 border-l border-slate-700/50 shadow-2xl flex flex-col h-full overflow-hidden animate-[slideInRight_0.25s_ease-out]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${sourceBadgeClass}`}>
                {sourceLabel}
              </span>
              {term.bowRank && (
                <span className="text-xs text-slate-500">#{term.bowRank}</span>
              )}
            </div>
            <h3
              className="text-xl font-bold text-white break-all leading-tight"
              title={term.text}
            >
              {term.text}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors flex-shrink-0 mt-0.5"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* BoW metrics */}
          {term.bowScore != null && (
            <section>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                Bolsa de Palabras
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-300">Frecuencia total</span>
                    <span className="font-bold text-cyan-400">{term.bowScore.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700/60">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-700"
                      style={{ width: `${bowPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {bowPct.toFixed(1)}% del término más frecuente
                  </p>
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

          {/* TF-IDF metrics */}
          <section>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              TF-IDF
            </h4>
            {term.tfidfScore != null ? (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-300">Score TF-IDF</span>
                    <span className="font-bold text-blue-400">{term.tfidfScore.toFixed(4)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700/60">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-700"
                      style={{ width: `${tfidfPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {tfidfPct.toFixed(1)}% del score máximo
                  </p>
                </div>
                {term.tfidfRank && (
                  <div className="flex justify-between text-sm py-2 border-b border-slate-700/40">
                    <span className="text-slate-400">Ranking en TF-IDF</span>
                    <span className="text-white font-medium">#{term.tfidfRank}</span>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-300 leading-relaxed">
                    {term.tfidfScore > 0.3
                      ? '⭐ Término muy relevante y distintivo en el corpus.'
                      : term.tfidfScore > 0.1
                      ? '📊 Término con relevancia moderada en el corpus.'
                      : '📌 Término común — aparece frecuentemente pero con bajo poder discriminativo.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                <p className="text-xs text-slate-500 text-center">
                  Este término no aparece en el top TF-IDF del análisis activo.
                </p>
              </div>
            )}
          </section>

          {/* N-gram cross-reference */}
          <section>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
              Aparece en N-gramas
            </h4>
            {term.relatedNgrams.length > 0 ? (
              <div className="space-y-2">
                {term.relatedNgrams.slice(0, 6).map((ng, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-slate-700/30 last:border-0">
                    <span
                      className="text-sm text-purple-300 font-medium truncate"
                      title={ng.label}
                    >
                      "{ng.label}"
                    </span>
                    <span className="text-xs text-slate-400 flex-shrink-0 bg-slate-800/50 px-2 py-0.5 rounded">
                      {ng.value.toLocaleString()}×
                    </span>
                  </div>
                ))}
                {term.relatedNgrams.length > 6 && (
                  <p className="text-xs text-slate-500 text-center pt-1">
                    +{term.relatedNgrams.length - 6} n-gramas más
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
                <p className="text-xs text-slate-500 text-center">
                  No encontrado en el top N-gramas activo.
                </p>
              </div>
            )}
          </section>

          {/* Interpretation */}
          <section className="p-4 rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Interpretación
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {term.bowScore != null && term.tfidfScore != null
                ? term.tfidfScore > 0.2
                  ? `"${term.text}" es un término clave del corpus: alta frecuencia (${term.bowScore.toLocaleString()}) y alto poder discriminativo (TF-IDF ${term.tfidfScore.toFixed(3)}). Ideal para caracterizar los temas del dataset.`
                  : `"${term.text}" aparece con frecuencia (${term.bowScore.toLocaleString()} veces) pero su score TF-IDF (${term.tfidfScore.toFixed(3)}) indica que es un término común, poco diferenciador entre documentos.`
                : term.bowScore != null
                ? `"${term.text}" tiene una frecuencia de ${term.bowScore.toLocaleString()} en el corpus. Consulta el análisis TF-IDF para evaluar su poder discriminativo.`
                : `"${term.text}" aparece en el análisis de N-gramas con frecuencia ${term.relatedNgrams[0]?.value || 0}.`}
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700/50">
          <button
            onClick={() => onExportTerm(term)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-cyan-400 border border-cyan-500/40 rounded-xl hover:bg-cyan-500/10 transition-colors"
          >
            <DownloadIcon />
            Exportar datos de "{term.text.length > 20 ? term.text.slice(0, 20) + '…' : term.text}"
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ExportModal ──────────────────────────────────────────────────────────────

interface ExportModalProps {
  data: VectorizationDashboardData;
  onClose: () => void;
}

type ExportOption = 'bow_csv' | 'tfidf_csv' | 'ngram_csv' | 'all_json' | 'python_dict';

const EXPORT_OPTIONS: Array<{ id: ExportOption; label: string; desc: string; icon: string; color: string }> = [
  { id: 'bow_csv',     label: 'BoW Top Términos (.csv)',    desc: 'Ranking, término y frecuencia — abrir en Excel, Sheets o Pandas', icon: '📊', color: 'cyan'   },
  { id: 'tfidf_csv',  label: 'TF-IDF Top Términos (.csv)', desc: 'Ranking, término y score TF-IDF ponderado',                       icon: '📈', color: 'blue'   },
  { id: 'ngram_csv',  label: 'N-gramas frecuentes (.csv)', desc: 'Secuencias de tokens más frecuentes del corpus',                  icon: '🔗', color: 'purple' },
  { id: 'all_json',   label: 'Exportación completa (.json)',desc: 'Todos los análisis con metadatos — ideal para scripts',          icon: '📦', color: 'amber'  },
  { id: 'python_dict',label: 'Diccionario Python (.py)',   desc: 'Listo para importar en Pandas, scikit-learn o spaCy',            icon: '🐍', color: 'emerald'},
];

const colorMap: Record<string, string> = {
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
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleExport = async () => {
    setExporting(true);
    try {
      const bowName   = data.selectedBow?.name   || 'bow';
      const tfidfName = data.selectedTfidf?.name || 'tfidf';
      const ngramName = data.selectedNgram?.name || 'ngrams';

      if (selected.has('bow_csv')     && data.selectedBow?.top_terms?.length)
        exportBowCsv(data.selectedBow.top_terms, bowName);
      if (selected.has('tfidf_csv')   && data.tfidfTopTerms?.length)
        exportTfidfCsv(data.tfidfTopTerms as TopTerm[], tfidfName);
      if (selected.has('ngram_csv')   && data.ngramBarData?.length)
        exportNgramCsv(data.ngramBarData, ngramName);
      if (selected.has('all_json'))
        exportJson(data);
      if (selected.has('python_dict'))
        exportPythonDict(data);
    } finally {
      setExporting(false);
      onClose();
    }
  };

  const bowAvailable   = (data.selectedBow?.top_terms?.length   || 0) > 0;
  const tfidfAvailable = (data.tfidfTopTerms?.length            || 0) > 0;
  const ngramAvailable = (data.ngramBarData?.length             || 0) > 0;

  const isAvailable = (id: ExportOption) => {
    if (id === 'bow_csv')     return bowAvailable;
    if (id === 'tfidf_csv')   return tfidfAvailable;
    if (id === 'ngram_csv')   return ngramAvailable;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <DownloadIcon />
              Exportar Datos
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Selecciona los formatos que deseas descargar</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
            <CloseIcon />
          </button>
        </div>

        {/* Options */}
        <div className="px-6 py-4 space-y-2.5">
          {EXPORT_OPTIONS.map(opt => {
            const available = isAvailable(opt.id);
            const checked   = selected.has(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => available && toggle(opt.id)}
                disabled={!available}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  !available
                    ? 'opacity-40 cursor-not-allowed border-slate-700/30 bg-slate-800/20'
                    : checked
                    ? `border ${colorMap[opt.color]}`
                    : 'border-slate-700/40 bg-slate-800/20 hover:bg-slate-800/40'
                }`}
              >
                <CheckboxIcon checked={checked && available} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span>{opt.icon}</span>
                    <span className="text-sm font-medium text-slate-200">{opt.label}</span>
                    {!available && (
                      <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">Sin datos</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Context info */}
        <div className="px-6 pb-2">
          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/30 text-xs text-slate-400 space-y-1">
            {data.selectedBow     && <p>📊 BoW: <span className="text-slate-300">{data.selectedBow.name}</span> · {data.selectedBow.top_terms?.length || 0} términos</p>}
            {data.selectedTfidf   && <p>📈 TF-IDF: <span className="text-slate-300">{data.selectedTfidf.name}</span> · {data.tfidfTopTerms?.length || 0} términos</p>}
            {data.selectedNgram   && <p>🔗 N-gramas: <span className="text-slate-300">{data.selectedNgram.name}</span> · {data.ngramBarData?.length || 0} secuencias</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-slate-400 border border-slate-700/50 rounded-xl hover:bg-slate-800/40 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={selected.size === 0 || exporting}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Descargando…
              </>
            ) : (
              <>
                <DownloadIcon />
                Descargar {selected.size > 0 ? `(${selected.size})` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Clickable Word Cloud ────────────────────────────────────────────────────

interface WordCloudProps {
  data: Array<{ text: string; value: number }>;
  maxWords?: number;
  onWordClick?: (word: { text: string; value: number }) => void;
  selectedWord?: string | null;
}

const SimpleWordCloud: React.FC<WordCloudProps> = ({
  data,
  maxWords = 60,
  onWordClick,
  selectedWord,
}) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const getFontSize = (value: number) => {
    const n = (value - minValue) / range;
    return 12 + n * 26; // 12px → 38px
  };

  const colors = [
    'text-cyan-400', 'text-emerald-400', 'text-purple-400',
    'text-blue-400', 'text-amber-400',   'text-rose-400',
    'text-teal-400', 'text-violet-400',
  ];

  return (
    <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2 p-4">
      {data.slice(0, maxWords).map((word, i) => {
        const isSelected = selectedWord === word.text;
        const n = (word.value - minValue) / range;
        const opacity = isSelected ? 1 : 0.45 + n * 0.55;

        return (
          <button
            key={word.text}
            onClick={() => onWordClick?.(word)}
            className={`
              ${colors[i % colors.length]}
              transition-all duration-150 cursor-pointer leading-tight
              hover:scale-110 hover:opacity-100 hover:drop-shadow-[0_0_6px_currentColor]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:rounded
              ${isSelected ? 'scale-110 drop-shadow-[0_0_8px_currentColor] ring-2 ring-current ring-offset-1 ring-offset-slate-900 rounded px-1' : ''}
            `}
            style={{
              fontSize: `${getFontSize(word.value)}px`,
              opacity,
              fontWeight: n > 0.6 ? 700 : n > 0.3 ? 600 : 400,
            }}
            title={`${word.text}: ${word.value.toLocaleString()} apariciones`}
          >
            {word.text}
          </button>
        );
      })}
    </div>
  );
};

// ─── Clickable Horizontal Bar Chart ─────────────────────────────────────────

interface HorizontalBarChartProps {
  data: Array<{ id: string; label: string; value: number }>;
  maxBars?: number;
  colorClass?: string;
  onItemClick?: (item: { id: string; label: string; value: number }) => void;
  selectedId?: string | null;
}

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data,
  maxBars = 15,
  colorClass = 'bg-cyan-500',
  onItemClick,
  selectedId,
}) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const displayData = data.slice(0, maxBars);

  return (
    <div className="space-y-1.5">
      {displayData.map((item) => {
        const isSelected = selectedId === item.id;
        const pct = (item.value / maxValue) * 100;
        return (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-all text-left group
              ${onItemClick ? 'cursor-pointer hover:bg-slate-700/30' : 'cursor-default'}
              ${isSelected ? 'bg-slate-700/50 ring-1 ring-cyan-500/40' : ''}
            `}
          >
            <div className="w-28 flex-shrink-0 text-right">
              <span
                className={`text-xs truncate block transition-colors ${isSelected ? 'text-white font-medium' : 'text-slate-300 group-hover:text-slate-100'}`}
                title={item.label}
              >
                {item.label}
              </span>
            </div>
            <div className="flex-1 h-5 bg-slate-800/50 rounded-full overflow-hidden">
              <div
                className={`h-full ${colorClass} rounded-full transition-all duration-500 ${isSelected ? 'brightness-110' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-16 flex-shrink-0 text-right">
              <span className={`text-xs transition-colors ${isSelected ? 'text-white font-semibold' : 'text-slate-400 group-hover:text-slate-300'}`}>
                {typeof item.value === 'number' && item.value < 1
                  ? item.value.toFixed(3)
                  : item.value.toLocaleString()}
              </span>
            </div>
            {isSelected && (
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export const VectorizacionDashboard: React.FC = () => {
  const [data, setData]             = useState<VectorizationDashboardData | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<SelectedTerm | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const { filters, setSelectedBow, setSelectedNgram, setSelectedTfidf } = useFilter();

  useEffect(() => {
    if (filters.selectedDatasetId) fetchData(filters.selectedDatasetId);
    else { setData(null); setIsLoading(false); }
  }, [filters.selectedDatasetId]);

  // Close panel on dataset change
  useEffect(() => { setSelectedTerm(null); }, [filters.selectedDatasetId]);

  const fetchData = async (datasetId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await dashboardService.getVectorizationData(datasetId);
      setData(result);
    } catch (err) {
      setError('Error al cargar los datos de vectorización');
      console.error('Vectorization dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived max scores for panel progress bars ──
  const maxBowScore = useMemo(() =>
    Math.max(...(data?.selectedBow?.top_terms?.map(t => t.score) || [0])), [data]);

  const maxTfidfScore = useMemo(() =>
    Math.max(...(data?.tfidfTopTerms?.map(t => t.score) || [0])), [data]);

  // ── Term selection handler (shared) ──
  const buildTerm = useCallback((text: string, source: SelectedTerm['source'], bowScore?: number, bowRank?: number): SelectedTerm => {
    const tfidfEntry = data?.tfidfTopTerms?.find(t => t.term === text);
    const relatedNgrams = (data?.ngramBarData || []).filter(ng =>
      ng.label.toLowerCase().includes(text.toLowerCase())
    );
    return {
      text,
      bowScore:   bowScore  ?? null,
      bowRank:    bowRank   ?? null,
      tfidfScore: tfidfEntry?.score ?? null,
      tfidfRank:  tfidfEntry?.rank  ?? null,
      relatedNgrams,
      source,
    };
  }, [data]);

  const handleWordClick = useCallback((word: { text: string; value: number }) => {
    const bowEntry = data?.selectedBow?.top_terms?.find(t => t.term === word.text);
    const term = buildTerm(word.text, 'bow', word.value, bowEntry?.rank);
    setSelectedTerm(prev => prev?.text === word.text ? null : term);
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

  const handleExportTerm = useCallback((term: SelectedTerm) => {
    const rows: (string | number)[][] = [
      ['termino', term.text],
      ['frecuencia_bow', term.bowScore ?? 'N/A'],
      ['rank_bow', term.bowRank ?? 'N/A'],
      ['score_tfidf', term.tfidfScore ?? 'N/A'],
      ['rank_tfidf', term.tfidfRank ?? 'N/A'],
      ['ngramas_relacionados', term.relatedNgrams.map(ng => ng.label).join(' | ')],
    ];
    const csv = rows.map(r => r.map(v => escapeCsvField(String(v))).join(',')).join('\n');
    downloadFile(csv, `termino_${term.text.replace(/\s+/g, '_')}.csv`, 'text/csv');
  }, []);

  // ── Early returns ──
  if (!filters.selectedDatasetId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Selecciona un Dataset</h3>
          <p className="text-slate-400 text-sm max-w-md">Usa el selector de Dataset en el panel lateral izquierdo.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Cargando análisis de vectorización...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-slate-300 mb-4">{error}</p>
          <button
            onClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const hasAnyData = (data?.bowAnalyses?.length || 0) > 0 || (data?.ngramAnalyses?.length || 0) > 0 || (data?.tfidfAnalyses?.length || 0) > 0;

  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Vectorización</h2>
          <p className="text-slate-400 text-sm mt-1">Análisis de Bag of Words, N-gramas y TF-IDF</p>
        </div>
        <div className="p-8 rounded-xl bg-slate-800/30 border border-slate-700/50 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Sin Análisis de Vectorización</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">Crea un análisis de Bag of Words, N-gramas o TF-IDF desde Administración.</p>
          <a href="/admin/bow" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Crear Análisis
          </a>
        </div>
      </div>
    );
  }

  const hasExportableData = (data?.selectedBow?.top_terms?.length || 0) > 0
    || (data?.tfidfTopTerms?.length || 0) > 0
    || (data?.ngramBarData?.length  || 0) > 0;

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Page Title + Export Button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Vectorización</h2>
          <p className="text-slate-400 text-sm mt-1">
            Haz clic en cualquier término para ver su análisis detallado
          </p>
        </div>
        {hasExportableData && (
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-cyan-400 border border-cyan-500/40 rounded-xl hover:bg-cyan-500/10 transition-colors flex-shrink-0"
          >
            <DownloadIcon />
            Exportar datos
          </button>
        )}
      </div>

      {/* KPI Metrics Row */}
      <DashboardGrid columns={4} gap="md">
        <MetricCardDark
          title="Análisis BoW"
          value={data?.bowAnalyses?.length || 0}
          subtitle={data?.selectedBow ? data.selectedBow.name : 'Bag of Words'}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
          accentColor="cyan"
        />
        <MetricCardDark
          title="Análisis N-gramas"
          value={data?.ngramAnalyses?.length || 0}
          subtitle="Secuencias de tokens"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
          accentColor="purple"
        />
        <MetricCardDark
          title="Análisis TF-IDF"
          value={data?.tfidfAnalyses?.length || 0}
          subtitle="Ponderación de términos"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          accentColor="blue"
        />
        <MetricCardDark
          title="Vocabulario"
          value={data?.selectedBow?.vocabulary_size?.toLocaleString() || '—'}
          subtitle={data?.selectedBow ? `min_df=${data.selectedBow.min_df}` : 'Términos únicos'}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>}
          accentColor="emerald"
        />
      </DashboardGrid>

      {/* Selected term indicator */}
      {selectedTerm && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm text-cyan-300">
              Término seleccionado: <span className="font-semibold text-white">"{selectedTerm.text}"</span>
            </span>
          </div>
          <button
            onClick={() => setSelectedTerm(null)}
            className="text-xs text-cyan-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-cyan-500/20 transition-colors"
          >
            <CloseIcon />
            Cerrar panel
          </button>
        </div>
      )}

      {/* Word Cloud from BoW */}
      {data?.wordCloudData && data.wordCloudData.length > 0 && (
        <ChartCard
          title="Nube de Palabras"
          subtitle={`Haz clic en una palabra para ver su análisis detallado${data.selectedBow ? ` · ${data.selectedBow.name}` : ''}`}
          accentColor="cyan"
          size="lg"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>}
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="min-h-[280px] overflow-hidden">
            <SimpleWordCloud
              data={data.wordCloudData}
              maxWords={60}
              onWordClick={handleWordClick}
              selectedWord={selectedTerm?.source === 'bow' ? selectedTerm.text : null}
            />
          </div>
        </ChartCard>
      )}

      {/* N-grams and TF-IDF side by side */}
      <DashboardGrid columns={2} gap="lg">
        {/* N-gram Analysis */}
        <ChartCard
          title="Top N-gramas"
          subtitle={`Haz clic para analizar · ${data?.selectedNgram ? data.selectedNgram.name : 'Secuencias más frecuentes'}`}
          accentColor="purple"
          size="lg"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="h-[300px] overflow-y-auto pr-1">
            {data?.ngramBarData && data.ngramBarData.length > 0 ? (
              <HorizontalBarChart
                data={data.ngramBarData}
                maxBars={15}
                colorClass="bg-gradient-to-r from-purple-500 to-violet-500"
                onItemClick={handleBarClick('ngram')}
                selectedId={selectedTerm?.source === 'ngram' ? selectedTerm.text : null}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                {data?.ngramAnalyses?.length === 0 ? 'No hay análisis de N-gramas disponibles' : 'Sin datos de N-gramas para mostrar'}
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
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="h-[300px] overflow-y-auto pr-1">
            {data?.tfidfTopTerms && data.tfidfTopTerms.length > 0 ? (
              <HorizontalBarChart
                data={data.tfidfTopTerms.slice(0, 15).map(t => ({
                  id: t.term,
                  label: t.term,
                  value: Math.round(t.score * 10000) / 10000,
                }))}
                maxBars={15}
                colorClass="bg-gradient-to-r from-blue-500 to-cyan-500"
                onItemClick={handleBarClick('tfidf')}
                selectedId={selectedTerm?.source === 'tfidf' ? selectedTerm.text : null}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                {data?.tfidfAnalyses?.length === 0 ? 'No hay análisis TF-IDF disponibles' : 'Sin datos TF-IDF para mostrar'}
              </div>
            )}
          </div>
        </ChartCard>
      </DashboardGrid>

      {/* Analysis Selector (only when multiple analyses available) */}
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
                <select
                  value={filters.selectedBowId || ''}
                  onChange={e => setSelectedBow(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  <option value="">Más reciente</option>
                  {data.bowAnalyses.map(bow => <option key={bow.id} value={bow.id}>{bow.name}</option>)}
                </select>
              </div>
            )}
            {data?.ngramAnalyses && data.ngramAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">N-gramas</label>
                <select
                  value={filters.selectedNgramId || ''}
                  onChange={e => setSelectedNgram(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  <option value="">Más reciente</option>
                  {data.ngramAnalyses.map(ng => <option key={ng.id} value={ng.id}>{ng.name}</option>)}
                </select>
              </div>
            )}
            {data?.tfidfAnalyses && data.tfidfAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">TF-IDF</label>
                <select
                  value={filters.selectedTfidfId || ''}
                  onChange={e => setSelectedTfidf(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  <option value="">Más reciente</option>
                  {data.tfidfAnalyses.map(tf => <option key={tf.id} value={tf.id}>{tf.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </ChartCard>
      )}

      {/* BoW Details */}
      {data?.selectedBow && (
        <ChartCard
          title="Detalles del Análisis BoW"
          subtitle={data.selectedBow.name}
          accentColor="cyan"
          size="md"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2">
            <div className="text-center p-3 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-cyan-400">{data.selectedBow.vocabulary_size?.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Vocabulario</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-emerald-400">{data.selectedBow.document_count?.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Documentos</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-purple-400">{data.selectedBow.min_df || 1}</p>
              <p className="text-xs text-slate-400">Min DF</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-amber-400">{data.selectedBow.max_features || '∞'}</p>
              <p className="text-xs text-slate-400">Max Features</p>
            </div>
          </div>
        </ChartCard>
      )}

      {/* WordDetailPanel */}
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

      {/* ExportModal */}
      {showExportModal && data && (
        <ExportModal
          data={data}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};
