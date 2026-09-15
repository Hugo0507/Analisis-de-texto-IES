/**
 * Metrica compacta con distintivo y tooltip de contexto.
 */

import React from 'react';
import { ContextTooltip } from '../../atoms/ContextTooltip';

export interface CompactMetricProps {
  label: string;
  value: string | number;
  badge?: string;
  badgeClass?: string;
  contextKey?: string;
}

export const CompactMetric: React.FC<CompactMetricProps> = ({ label, value, badge, badgeClass, contextKey }) => {
  const texto = typeof value === 'number' ? value.toLocaleString() : value;
  // Los valores textuales largos (p. ej. el nombre de un modelo) bajan de tamaño
  const largo = String(texto).length > 14;
  return (
    <div className="min-w-0 rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <div className="mb-2 flex items-center gap-1">
        <p className="text-xs text-mist">{label}</p>
        {contextKey && <ContextTooltip contextKey={contextKey} />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`num font-display font-semibold leading-tight text-paper break-words ${largo ? 'text-base' : 'text-2xl tracking-[-0.02em]'}`}
          title={largo ? String(texto) : undefined}
        >
          {texto}
        </span>
        {badge !== undefined && badgeClass && (
          <span className={`rounded-md border px-2 py-0.5 text-xs ${badgeClass}`}>{badge}</span>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Topic Card — word weight bars replace opacity trick
// ---------------------------------------------------------------------------
