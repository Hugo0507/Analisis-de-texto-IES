/**
 * Indicador de progreso entre las cuatro etapas.
 */

import React from 'react';
import type { Stage } from './types';
import { STAGES } from './types';

export const StageIndicator: React.FC<{ current: Stage }> = ({ current }) => {
  const currentIdx = STAGES.findIndex(s => s.key === current);
  return (
    <ol className="flex items-center gap-0 overflow-x-auto px-1 py-1" aria-label="Pasos del laboratorio">
      {STAGES.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <React.Fragment key={s.key}>
            <li className="flex shrink-0 items-center gap-2.5" aria-current={active ? 'step' : undefined}>
              <span className={`
                num flex h-7 w-7 items-center justify-center rounded-full border font-mono text-[11px] font-medium transition-colors
                ${active ? 'border-stage-lab bg-stage-lab/15 text-stage-lab' : ''}
                ${done ? 'border-stage-sum/60 bg-stage-sum/10 text-stage-sum' : ''}
                ${!active && !done ? 'border-ink-600 text-fog' : ''}
              `}>
                {done ? (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : String(i + 1).padStart(2, '0')}
              </span>
              <span className={`whitespace-nowrap text-sm ${active ? 'font-medium text-paper' : done ? 'text-haze' : 'text-fog'}`}>
                {s.label}
              </span>
            </li>
            {i < STAGES.length - 1 && (
              <li aria-hidden="true" className={`mx-3 h-px min-w-[24px] flex-1 transition-colors ${done ? 'bg-stage-sum/50' : 'bg-ink-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
};

// ── Stage 1: Configure ────────────────────────────────────────────────────────
