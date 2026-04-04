/**
 * ContextTooltip
 *
 * Renders an ℹ icon button that shows an educational context panel
 * explaining an NLP metric in terms of IES research.
 */

import React, { useState, useRef, useEffect } from 'react';
import { EDUCATIONAL_CONTEXT } from '../../data/educationalContext';

interface ContextTooltipProps {
  contextKey: string;
  /** Optional positioning: 'right' (default) | 'left' | 'top' */
  position?: 'right' | 'left' | 'top';
  className?: string;
}

export const ContextTooltip: React.FC<ContextTooltipProps> = ({
  contextKey,
  position = 'right',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const entry = EDUCATIONAL_CONTEXT[contextKey];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!entry) return null;

  const panelClass =
    position === 'left'
      ? 'right-full mr-2 top-0'
      : position === 'top'
      ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
      : 'left-full ml-2 top-0';

  return (
    <div ref={ref} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="p-0.5 rounded-full text-slate-500 hover:text-cyan-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label={`Contexto educativo: ${entry.title}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute z-50 w-72 rounded-xl bg-slate-800 border border-slate-600/60 shadow-2xl p-4 ${panelClass}`}
          style={{ minWidth: '260px', maxWidth: '320px' }}
        >
          {/* Arrow indicator */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <h4 className="text-sm font-semibold text-white leading-tight">{entry.title}</h4>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-2">{entry.explanation}</p>

          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 mb-2">
            <p className="text-xs font-medium text-cyan-300 mb-1">Relevancia en IES</p>
            <p className="text-xs text-slate-300 leading-relaxed">{entry.relevance}</p>
          </div>

          {entry.interpretation && (
            <div className="p-2.5 rounded-lg bg-slate-700/40 border border-slate-600/30">
              <p className="text-xs font-medium text-slate-300 mb-1">Interpretación</p>
              <p className="text-xs text-slate-400 leading-relaxed">{entry.interpretation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContextTooltip;
