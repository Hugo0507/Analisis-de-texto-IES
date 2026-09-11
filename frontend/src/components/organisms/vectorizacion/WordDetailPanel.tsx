/**
 * Panel lateral con el analisis detallado de un termino.
 */

import React from 'react';
import type { SelectedTerm } from './types';
import { CloseIcon, DownloadIcon } from './icons';

export interface WordDetailPanelProps {
  term: SelectedTerm;
  totalDocs: number;
  maxBowScore: number;
  maxTfidfScore: number;
  onClose: () => void;
  onExportTerm: (term: SelectedTerm) => void;
}

export const WordDetailPanel: React.FC<WordDetailPanelProps> = ({
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
                    <span className="font-bold text-blue-400">{term.tfidfScore.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700/60">
                    <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-700" style={{ width: `${tfidfPct}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{tfidfPct.toFixed(1)}% del score máximo</p>
                </div>
                {term.idfScore != null && (
                  <div className="flex justify-between text-sm py-2 border-b border-slate-700/40">
                    <span className="text-slate-400">Valor IDF</span>
                    <span className="text-white font-medium">{term.idfScore.toFixed(2)}</span>
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
                  ? `"${term.text}" es un término clave: alta frecuencia (${term.bowScore.toLocaleString()}) y alto poder discriminativo (TF-IDF ${term.tfidfScore.toFixed(2)}).`
                  : `"${term.text}" aparece frecuentemente (${term.bowScore.toLocaleString()} veces) pero su TF-IDF (${term.tfidfScore.toFixed(2)}) indica que es poco diferenciador entre documentos.`
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
