/**
 * Pildora de estadistica con barra de progreso y tooltip.
 */

import React from 'react';

// ─── Stat Pill (compact preparation metric) ──────────────────────────────────
export interface StatPillProps {
  label: string;
  value: string | number;
  percent?: number;
  subtitle?: string;
  color: 'emerald' | 'rose' | 'amber' | 'blue' | 'violet';
  tooltip?: string;
}

// El color marca la naturaleza del dato (procesado, omitido…) en el punto y la
// barra; la cifra va en texto principal para que se lea igual en todas.
export const colorMap: Record<StatPillProps['color'], { bg: string; text: string; bar: string; dot: string }> = {
  emerald: { bg: 'bg-ink-850 border border-ink-700', text: 'text-paper', bar: 'bg-stage-sum',  dot: 'bg-stage-sum'  },
  rose:    { bg: 'bg-ink-850 border border-ink-700', text: 'text-paper', bar: 'bg-stage-lab',  dot: 'bg-stage-lab'  },
  amber:   { bg: 'bg-ink-850 border border-ink-700', text: 'text-paper', bar: 'bg-stage-mod',  dot: 'bg-stage-mod'  },
  blue:    { bg: 'bg-ink-850 border border-ink-700', text: 'text-paper', bar: 'bg-stage-prep', dot: 'bg-stage-prep' },
  violet:  { bg: 'bg-ink-850 border border-ink-700', text: 'text-paper', bar: 'bg-stage-vec',  dot: 'bg-stage-vec'  },
};

export const StatPill: React.FC<StatPillProps> = ({ label, value, percent, subtitle, color, tooltip }) => {
  const c = colorMap[color];
  return (
    <div className={`min-w-0 rounded-xl px-4 py-3.5 ${c.bg}`} title={tooltip}>
      <div className="flex items-start gap-2 mb-2">
        <span aria-hidden="true" className={`mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
        <p className="text-xs font-medium leading-snug text-mist">{label}</p>
        {tooltip && (
          <svg className="w-3 h-3 text-fog shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <p className={`num font-display text-2xl font-semibold leading-none tracking-[-0.02em] ${c.text}`}>{value}</p>
      {percent !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="num text-xs text-mist">{percent.toFixed(1)}% del total</span>
          </div>
          <div className="h-1 w-full rounded-full bg-ink-700">
            <div
              className={`h-1 rounded-full transition-all ${c.bar}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        </div>
      )}
      {subtitle && !percent && (
        <p className="text-xs text-mist mt-3">{subtitle}</p>
      )}
    </div>
  );
};
