/**
 * Esqueleto de carga del dashboard Resumen.
 */

import React from 'react';

export const LoadingSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-32 rounded-2xl bg-slate-800/40" />
    <div className="h-64 rounded-xl bg-slate-800/30" />
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-36 rounded-xl bg-slate-800/30" />
      ))}
    </div>
  </div>
);
