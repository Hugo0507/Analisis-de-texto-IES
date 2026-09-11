/**
 * Tarjeta de un tema con sus terminos principales.
 */

import React from 'react';
import { TOPIC_CARD_COLORS } from './badges';

export interface TopicCardProps {
  topic: {
    id: number;
    label: string;
    words: Array<{ word: string; weight: number }>;
    documentCount: number;
  };
  accentColor: string;
}

export const TopicCard: React.FC<TopicCardProps> = ({ topic, accentColor }) => {
  const colors = TOPIC_CARD_COLORS[accentColor] || TOPIC_CARD_COLORS.emerald;
  const maxWeight = Math.max(...topic.words.map(w => w.weight), 0.001);

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${colors.gradient} border`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white truncate pr-2">
          {topic.label || `Tema ${topic.id}`}
        </h4>
        <span className="text-xs text-slate-300 shrink-0">{topic.documentCount} docs</span>
      </div>
      <div className="space-y-1.5">
        {topic.words.slice(0, 8).map((word) => {
          const barPct = Math.round((word.weight / maxWeight) * 100);
          return (
            <div key={word.word} className="flex items-center gap-2">
              <span className="text-xs text-slate-300 w-20 truncate shrink-0">{word.word}</span>
              <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.bar} rounded-full`}
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
// BERTopic Cluster Card — word weight bars
// ---------------------------------------------------------------------------
