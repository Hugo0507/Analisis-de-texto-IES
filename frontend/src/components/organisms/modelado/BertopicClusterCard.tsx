/**
 * Tarjeta de un clúster de BERTopic.
 */

import React from 'react';

export interface BertopicClusterCardProps {
  cluster: {
    topicId: number;
    label: string;
    words: Array<{ word: string; weight: number }>;
    numDocuments: number;
  };
}

export const BertopicClusterCard: React.FC<BertopicClusterCardProps> = ({ cluster }) => {
  const maxWeight = Math.max(...cluster.words.map(w => w.weight), 0.001);
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white truncate pr-2">
          {cluster.label || `Clúster ${cluster.topicId}`}
        </h4>
        <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300">
          {cluster.numDocuments} docs
        </span>
      </div>
      <div className="space-y-1.5">
        {cluster.words.slice(0, 6).map((word) => {
          const barPct = Math.round((word.weight / maxWeight) * 100);
          return (
            <div key={word.word} className="flex items-center gap-2">
              <span className="text-xs text-slate-300 w-20 truncate shrink-0">{word.word}</span>
              <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${barPct}%`, opacity: 0.8 }}
                />
              </div>
              <span className="text-xs text-slate-400 w-10 text-right shrink-0">
                {word.weight.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Entity List (existing — minor color update)
// ---------------------------------------------------------------------------
