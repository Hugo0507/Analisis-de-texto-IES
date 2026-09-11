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

export const colorMap: Record<StatPillProps['color'], { bg: string; text: string; bar: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-500/10 border border-emerald-500/20', text: 'text-emerald-400', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  rose:    { bg: 'bg-rose-500/10 border border-rose-500/20',       text: 'text-rose-400',    bar: 'bg-rose-500',    dot: 'bg-rose-500'    },
  amber:   { bg: 'bg-amber-500/10 border border-amber-500/20',     text: 'text-amber-400',   bar: 'bg-amber-500',   dot: 'bg-amber-500'   },
  blue:    { bg: 'bg-blue-500/10 border border-blue-500/20',       text: 'text-blue-400',    bar: 'bg-blue-500',    dot: 'bg-blue-500'    },
  violet:  { bg: 'bg-violet-500/10 border border-violet-500/20',   text: 'text-violet-400',  bar: 'bg-violet-500',  dot: 'bg-violet-500'  },
};

export const StatPill: React.FC<StatPillProps> = ({ label, value, percent, subtitle, color, tooltip }) => {
  const c = colorMap[color];
  return (
    <div className={`flex-1 min-w-[120px] rounded-lg px-4 py-3 ${c.bg}`} title={tooltip}>
      <div className="flex items-center gap-1 mb-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        {tooltip && (
          <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>
      <p className={`text-xl font-bold ${c.text}`}>{value}</p>
      {percent !== undefined && (
        <div className="mt-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">{percent.toFixed(1)}% del total</span>
          </div>
          <div className="h-1 w-full rounded-full bg-slate-700">
            <div
              className={`h-1 rounded-full transition-all ${c.bar}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        </div>
      )}
      {subtitle && !percent && (
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
};
