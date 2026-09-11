/**
 * Comparativa lado a lado de BoW frente a TF-IDF.
 */

import React from 'react';
import type { ComparacionItem } from './types';

export const ComparacionView: React.FC<{
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
                  <span className="text-xs text-blue-400 font-mono w-16 text-right">{item.tfidfScore.toFixed(2)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
