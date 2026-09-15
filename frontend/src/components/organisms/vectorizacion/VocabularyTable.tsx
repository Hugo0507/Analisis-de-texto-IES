/**
 * Tabla paginable y ordenable del vocabulario completo.
 */

import React, { useState, useMemo } from 'react';
import { SortAscIcon, SortDescIcon } from './icons';

export interface VocabularyTableProps {
  vocabulary: Record<string, number>;
  idfValues?: Record<string, number>;
  tfidfScores?: Record<string, number>;
  onTermClick?: (term: string, freq: number) => void;
  selectedTerm?: string | null;
  compareTerms?: string[];
  onCompareToggle?: (term: string) => void;
}

export const VOCAB_PER_PAGE = 50;

export const VocabularyTable: React.FC<VocabularyTableProps> = ({
  vocabulary, idfValues = {}, tfidfScores = {}, onTermClick, selectedTerm,
  compareTerms = [], onCompareToggle,
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

  const dataSource = Object.keys(vocabulary).length > 0 ? 'completo' : 'top términos';

  return (
    <div className="flex flex-col gap-3">
      {/* Search + count */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-mist">
          <span className="num font-semibold text-paper">{filtered.length.toLocaleString()}</span> términos
          {search && <span className="text-stage-vec"> · búsqueda: "{search}"</span>}
          <span className="ml-1.5 px-1.5 py-0.5 rounded-md border border-ink-700 bg-ink-850 text-fog text-xs">vocabulario {dataSource}</span>
        </p>
        <input
          type="text" value={search} placeholder="Buscar término…"
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="bg-ink-850 border border-ink-600 rounded-xl px-3 py-1.5 text-sm text-paper placeholder-fog focus:outline-none focus:border-stage-vec/60 w-52"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-ink-700">
        <table className="w-full text-sm bg-ink-900">
          <thead>
            <tr className="border-b border-ink-700 bg-ink-850">
              {[
                { f: 'rank' as const, label: '#',          w: 'w-12' },
                { f: 'term' as const, label: 'Término',    w: '' },
                { f: 'freq' as const, label: 'Frecuencia', w: 'w-28' },
                ...(hasIdf   ? [{ f: 'idf'   as const, label: 'IDF',    w: 'w-24' }] : []),
                ...(hasTfidf ? [{ f: 'tfidf' as const, label: 'TF-IDF', w: 'w-24' }] : []),
              ].map(col => (
                <th key={col.f} onClick={() => handleSort(col.f)}
                  className={`${col.w} px-3 py-2.5 text-left text-[11px] font-medium text-mist uppercase tracking-[0.08em] cursor-pointer hover:text-paper hover:bg-ink-800 select-none transition-colors`}
                >
                  <span className="flex items-center gap-1">{col.label}<SortIndicator f={col.f} /></span>
                </th>
              ))}
              <th className="w-20 px-3 py-2.5 text-left text-[11px] font-medium text-mist uppercase tracking-[0.08em]">Peso</th>
              {onCompareToggle && <th className="w-10 px-2 py-2.5" title="Comparar términos" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700/70">
            {paginated.map(row => {
              const isSelected = selectedTerm === row.term;
              const isCompared = compareTerms.includes(row.term);
              const maxFreq = allTerms[0]?.freq || 1;
              const pct = (row.freq / maxFreq) * 100;
              const freqDisplay = Number.isInteger(row.freq) ? row.freq.toLocaleString() : row.freq.toFixed(2);
              return (
                <tr key={row.term}
                  onClick={() => onTermClick?.(row.term, row.freq)}
                  className={`cursor-pointer transition-colors ${isCompared ? 'bg-stage-vec/10' : isSelected ? 'bg-stage-vec/[0.14] shadow-[inset_2px_0_0_#A78BFA]' : 'hover:bg-ink-850'}`}
                >
                  <td className="num px-3 py-2 text-fog text-xs font-mono">{row.rank}</td>
                  <td className="px-3 py-2">
                    <span className={`font-medium text-sm ${isCompared || isSelected ? 'text-stage-vec' : 'text-paper'}`}>{row.term}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="num text-haze font-mono text-xs font-medium">{freqDisplay}</span>
                  </td>
                  {hasIdf   && <td className="num px-3 py-2 text-haze font-mono text-xs">{row.idf   != null ? row.idf.toFixed(2)   : <span className="text-fog">—</span>}</td>}
                  {hasTfidf && <td className="num px-3 py-2 text-haze font-mono text-xs">{row.tfidf != null ? row.tfidf.toFixed(2) : <span className="text-fog">—</span>}</td>}
                  <td className="px-3 py-2">
                    <div className="h-1.5 w-16 bg-ink-700 rounded-full overflow-hidden">
                      <div className={`h-1.5 rounded-full transition-all ${isSelected ? 'bg-stage-vec' : 'bg-stage-vec/60'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  {onCompareToggle && (
                    <td className="px-2 py-2" onClick={e => { e.stopPropagation(); onCompareToggle(row.term); }}>
                      <button
                        title={isCompared ? 'Quitar de comparación' : compareTerms.length >= 3 ? 'Máximo 3 términos' : 'Agregar a comparación'}
                        disabled={!isCompared && compareTerms.length >= 3}
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                          isCompared ? 'bg-stage-vec text-ink-950' : 'border border-ink-600 text-mist hover:border-stage-vec/50 hover:text-stage-vec disabled:opacity-30'
                        }`}
                      >
                        {isCompared ? '✓' : '+'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr><td colSpan={5 + (hasIdf ? 1 : 0) + (hasTfidf ? 1 : 0)} className="text-center py-8 text-mist text-sm">Sin resultados para "{search}"</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="num text-xs text-mist">
            {Math.min((page - 1) * VOCAB_PER_PAGE + 1, filtered.length)}–{Math.min(page * VOCAB_PER_PAGE, filtered.length)} de {filtered.length.toLocaleString()} términos
          </p>
          <div className="flex gap-1">
            {['«','‹'].map((ch, i) => (
              <button key={ch} onClick={() => setPage(i === 0 ? 1 : p => p - 1)} disabled={page === 1}
                className="px-2.5 py-1 text-xs rounded-lg border border-ink-600 text-mist hover:bg-ink-800 hover:text-paper disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >{ch}</button>
            ))}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return p <= totalPages ? (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${p === page ? 'bg-stage-vec/15 border-stage-vec/50 text-paper font-semibold' : 'border-ink-600 text-mist hover:bg-ink-800 hover:text-paper'}`}
                >{p}</button>
              ) : null;
            })}
            {['›','»'].map((ch, i) => (
              <button key={ch} onClick={() => setPage(i === 0 ? p => p + 1 : totalPages)} disabled={page === totalPages}
                className="px-2.5 py-1 text-xs rounded-lg border border-ink-600 text-mist hover:bg-ink-800 hover:text-paper disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >{ch}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── HorizontalBarChart (SVG — compatible con descarga PNG) ──────────────────
