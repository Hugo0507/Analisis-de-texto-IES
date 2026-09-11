/**
 * Dispersion TF vs IDF en SVG puro.
 */

import React, { useState } from 'react';
import type { ScatterPoint } from './types';

export interface TfIdfScatterProps {
  data: ScatterPoint[];
  onPointClick?: (term: string) => void;
  selectedTerm?: string | null;
}

export const TfIdfScatter: React.FC<TfIdfScatterProps> = ({ data, onPointClick, selectedTerm }) => {
  const [hovered, setHovered] = useState<ScatterPoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
        Se necesitan datos de TF y IDF para generar el gráfico
      </div>
    );
  }

  const W = 600; const H = 320;
  const pad = { top: 20, right: 30, bottom: 50, left: 65 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const maxTf  = Math.max(...data.map(d => d.tf));
  const minTf  = Math.min(...data.map(d => d.tf));
  const maxIdf = Math.max(...data.map(d => d.idf));
  const minIdf = Math.min(...data.map(d => d.idf));
  const maxTfidf = Math.max(...data.map(d => d.tfidf)) || 1;

  const sx = (tf: number)   => ((tf  - minTf)  / (maxTf  - minTf  || 1)) * iW;
  const sy = (idf: number)  => iH - ((idf - minIdf) / (maxIdf - minIdf || 1)) * iH;
  const sr = (tfidf: number) => 3 + (tfidf / maxTfidf) * 7;
  // Color: cyan for low TF-IDF → amber for high TF-IDF
  const sColor = (tfidf: number, isHighlighted: boolean) => {
    if (isHighlighted) return '#f59e0b';
    const t = tfidf / maxTfidf;
    if (t > 0.7) return '#06b6d4';  // cyan
    if (t > 0.4) return '#8b5cf6';  // violet
    return '#64748b';               // slate
  };

  // X axis ticks (5)
  const xTicks = Array.from({ length: 5 }, (_, i) => minTf + (maxTf - minTf) * i / 4);
  // Y axis ticks (5)
  const yTicks = Array.from({ length: 5 }, (_, i) => minIdf + (maxIdf - minIdf) * i / 4);

  const formatNum = (n: number) =>
    n < 0.01 ? n.toExponential(1) : n < 1 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.round(n).toLocaleString();

  return (
    <div className="relative select-none">
      {/* Axis labels */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-slate-400 pointer-events-none" style={{ left: '-10px' }}>
        IDF (especificidad)
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={e => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        {/* Grid */}
        <g opacity="0.2">
          {xTicks.map((v, i) => (
            <line key={`xg-${i}`} x1={pad.left + sx(v)} y1={pad.top} x2={pad.left + sx(v)} y2={pad.top + iH} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
          ))}
          {yTicks.map((v, i) => (
            <line key={`yg-${i}`} x1={pad.left} y1={pad.top + sy(v)} x2={pad.left + iW} y2={pad.top + sy(v)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
          ))}
        </g>

        {/* Axes */}
        <line x1={pad.left} y1={pad.top + iH} x2={pad.left + iW} y2={pad.top + iH} stroke="#475569" strokeWidth="1.5" />
        <line x1={pad.left} y1={pad.top}      x2={pad.left}       y2={pad.top + iH} stroke="#475569" strokeWidth="1.5" />

        {/* X ticks */}
        {xTicks.map((v, i) => (
          <g key={`xt-${i}`}>
            <line x1={pad.left + sx(v)} y1={pad.top + iH} x2={pad.left + sx(v)} y2={pad.top + iH + 4} stroke="#475569" />
            <text x={pad.left + sx(v)} y={pad.top + iH + 14} textAnchor="middle" fontSize="9" fill="#64748b">{formatNum(v)}</text>
          </g>
        ))}

        {/* Y ticks */}
        {yTicks.map((v, i) => (
          <g key={`yt-${i}`}>
            <line x1={pad.left - 4} y1={pad.top + sy(v)} x2={pad.left} y2={pad.top + sy(v)} stroke="#475569" />
            <text x={pad.left - 8} y={pad.top + sy(v) + 4} textAnchor="end" fontSize="9" fill="#64748b">{formatNum(v)}</text>
          </g>
        ))}

        {/* X axis label */}
        <text x={pad.left + iW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#64748b">TF (frecuencia del término)</text>

        {/* Points */}
        {data.map(d => {
          const cx = pad.left + sx(d.tf);
          const cy = pad.top  + sy(d.idf);
          const r  = sr(d.tfidf);
          const highlighted = hovered?.term === d.term || selectedTerm === d.term;
          return (
            <circle
              key={d.term}
              cx={cx} cy={cy} r={highlighted ? r + 2 : r}
              fill={sColor(d.tfidf, highlighted)}
              fillOpacity={highlighted ? 1 : 0.75}
              stroke={selectedTerm === d.term ? '#f59e0b' : highlighted ? '#e2e8f0' : 'none'}
              strokeWidth={selectedTerm === d.term ? 2 : 1}
              className="cursor-pointer transition-all duration-100"
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onPointClick?.(d.term)}
            />
          );
        })}

        {/* Label for selected term */}
        {selectedTerm && (() => {
          const d = data.find(p => p.term === selectedTerm);
          if (!d) return null;
          const cx = pad.left + sx(d.tf);
          const cy = pad.top  + sy(d.idf);
          return (
            <text x={cx + 6} y={cy - 4} fontSize="9" fill="#f59e0b" fontWeight="600">{d.term}</text>
          );
        })()}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute z-10 pointer-events-none bg-slate-900 border border-slate-600/60 rounded-lg px-3 py-2 shadow-xl text-xs"
          style={{
            left: Math.min(mousePos.x + 12, 480),
            top:  Math.max(mousePos.y - 60, 0),
          }}
        >
          <p className="font-bold text-white mb-1">"{hovered.term}"</p>
          <p className="text-slate-400">TF: <span className="text-cyan-400 font-mono">{formatNum(hovered.tf)}</span></p>
          <p className="text-slate-400">IDF: <span className="text-blue-400 font-mono">{hovered.idf.toFixed(2)}</span></p>
          <p className="text-slate-400">TF-IDF: <span className="text-purple-400 font-mono">{hovered.tfidf.toFixed(2)}</span></p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center mt-2 flex-wrap">
        <span className="text-xs text-slate-500">TF-IDF score:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-500 opacity-75" /><span className="text-xs text-slate-400">Bajo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-violet-500 opacity-75" /><span className="text-xs text-slate-400">Medio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-cyan-500 opacity-75" /><span className="text-xs text-slate-400">Alto — término relevante y específico</span>
        </div>
      </div>
    </div>
  );
};

// ─── TermHeatmap ──────────────────────────────────────────────────────────────
