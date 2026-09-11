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

export const CompactMetric: React.FC<CompactMetricProps> = ({ label, value, badge, badgeClass, contextKey }) => (
  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
    <div className="flex items-center gap-1 mb-1">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      {contextKey && <ContextTooltip contextKey={contextKey} />}
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xl font-bold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      {badge !== undefined && badgeClass && (
        <span className={`px-2 py-0.5 text-xs rounded border ${badgeClass}`}>{badge}</span>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Topic Card — word weight bars replace opacity trick
// ---------------------------------------------------------------------------
