/**
 * Listado de entidades NER por tipo.
 */

import React from 'react';
import { ENTITY_BADGE_COLORS } from './badges';

export interface EntityListProps {
  entities: Array<{ text: string; frequency: number }>;
  entityType: string;
  maxItems?: number;
}

export const EntityList: React.FC<EntityListProps> = ({ entities, entityType, maxItems = 5 }) => {
  const badgeClass = ENTITY_BADGE_COLORS[entityType] || ENTITY_BADGE_COLORS.default;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 text-xs rounded border ${badgeClass}`}>{entityType}</span>
        <span className="text-xs text-mist">{entities.length} entidades</span>
      </div>
      <div className="space-y-1">
        {entities.slice(0, maxItems).map((entity) => (
          <div key={entity.text} className="flex items-center justify-between text-sm">
            <span className="text-haze truncate">{entity.text}</span>
            <span className="text-mist">{entity.frequency}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Entity Frequency Bar Chart (CSS horizontal bars, top-20 by frequency)
// ---------------------------------------------------------------------------
