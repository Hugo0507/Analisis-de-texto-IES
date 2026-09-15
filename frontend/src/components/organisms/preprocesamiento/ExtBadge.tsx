/**
 * Distintivo de color por extension de archivo.
 */

import React from 'react';

// ─── Extension Badge ──────────────────────────────────────────────────────────
export const EXT_COLORS: Record<string, string> = {
  pdf:  'bg-rose-500/15 text-rose-400',
  txt:  'bg-blue-500/15 text-blue-400',
  docx: 'bg-blue-500/15 text-blue-400',
  xlsx: 'bg-emerald-500/15 text-emerald-400',
  csv:  'bg-lime-500/15 text-lime-400',
  json: 'bg-amber-500/15 text-amber-400',
  xml:  'bg-violet-500/15 text-violet-400',
};

export const ExtBadge: React.FC<{ ext: string }> = ({ ext }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase ${EXT_COLORS[ext] || 'bg-ink-800 text-mist'}`}>
    .{ext}
  </span>
);
