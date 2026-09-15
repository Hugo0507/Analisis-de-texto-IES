/**
 * Grafico de frecuencia de entidades NER.
 */

import React from 'react';
import { ENTITY_BADGE_COLORS } from './badges';

export interface EntityFrequencyChartProps {
  entities: Array<{ text: string; label: string; frequency: number }>;
}

export const EntityFrequencyChart: React.FC<EntityFrequencyChartProps> = ({ entities }) => {
  const top20 = [...entities].sort((a, b) => b.frequency - a.frequency).slice(0, 20);
  const maxFreq = top20[0]?.frequency || 1;

  if (top20.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-mist text-sm">
        No hay datos de frecuencia
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: '340px' }}>
      {top20.map((entity, i) => {
        const badgeClass = ENTITY_BADGE_COLORS[entity.label] || ENTITY_BADGE_COLORS.default;
        const barPct = Math.round((entity.frequency / maxFreq) * 100);
        return (
          <div key={`${entity.text}-${entity.label}-${i}`} className="flex items-center gap-2">
            <span className={`text-xs px-1.5 py-0.5 rounded border ${badgeClass} shrink-0 w-14 text-center`}>
              {entity.label}
            </span>
            <span className="text-sm text-haze truncate w-28 shrink-0">{entity.text}</span>
            <div className="flex-1 h-4 bg-ink-800/50 rounded overflow-hidden">
              <div className="h-full bg-purple-500/60 rounded" style={{ width: `${barPct}%` }} />
            </div>
            <span className="text-sm text-haze w-10 text-right shrink-0">{entity.frequency}</span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
