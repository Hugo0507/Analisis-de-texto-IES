/**
 * Indicador de progreso entre las cuatro etapas.
 */

import React from 'react';
import type { Stage } from './types';
import { STAGES } from './types';

export const StageIndicator: React.FC<{ current: Stage }> = ({ current }) => {
  const currentIdx = STAGES.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-1">
      {STAGES.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={s.key}>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                ${active ? 'bg-violet-500 border-violet-400 text-white' : ''}
                ${done ? 'bg-emerald-500 border-emerald-400 text-white' : ''}
                ${!active && !done ? 'bg-slate-800 border-slate-600 text-slate-400' : ''}
              `}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${active ? 'text-white' : done ? 'text-emerald-400' : 'text-slate-500'}`}>
                {s.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 min-w-[20px] h-0.5 mx-2 transition-colors ${done ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Stage 1: Configure ────────────────────────────────────────────────────────
