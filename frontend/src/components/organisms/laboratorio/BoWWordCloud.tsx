/**
 * Nube de palabras de los resultados BoW del Laboratorio.
 */

import React, { useMemo } from 'react';

export const BOW_CLOUD_W = 660;

export const BOW_CLOUD_H = 300;

/** Color semántico por frecuencia relativa: naranja (alta) → amarillo → cyan → violeta (baja) */

export const bowCloudColor = (ratio: number): string => {
  if (ratio >= 0.75) return '#f97316'; // naranja  — muy frecuente
  if (ratio >= 0.50) return '#eab308'; // amarillo — frecuente
  if (ratio >= 0.25) return '#22d3ee'; // cyan     — media
  return '#a78bfa';                    // violeta  — menos frecuente
};

export const BoWWordCloud: React.FC<{ terms: Array<{ term: string; score: number }>; maxWords?: number }> = ({
  terms,
  maxWords = 60,
}) => {
  const layout = useMemo(() => {
    if (!terms.length) return [];
    const words  = terms.slice(0, maxWords);
    const maxVal = words[0]?.score || 1;
    const minVal = words[words.length - 1]?.score || 0;
    const range  = maxVal - minVal || 1;
    const fs = (v: number) => Math.round(11 + ((v - minVal) / range) * 29);
    type Box = { x1: number; y1: number; x2: number; y2: number };
    const placed: Box[] = [];
    const hits = (x1: number, y1: number, x2: number, y2: number) =>
      placed.some(p => x1 < p.x2 + 5 && x2 > p.x1 - 5 && y1 < p.y2 + 3 && y2 > p.y1 - 3);
    return words.map((word) => {
      const size = fs(word.score);
      const ww = word.term.length * size * 0.57;
      const wh = size * 1.25;
      let fx = BOW_CLOUD_W / 2 - ww / 2;
      let fy = BOW_CLOUD_H / 2 - wh / 2;
      for (let s = 0; s < 700; s++) {
        const x = BOW_CLOUD_W / 2 + s * 1.05 * Math.cos(s * 0.48) - ww / 2;
        const y = BOW_CLOUD_H / 2 + s * 0.62 * Math.sin(s * 0.48) - wh / 2;
        if (x < 4 || x + ww > BOW_CLOUD_W - 4 || y < 4 || y + wh > BOW_CLOUD_H - 4) continue;
        if (!hits(x, y, x + ww, y + wh)) { fx = x; fy = y; break; }
      }
      placed.push({ x1: fx, y1: fy, x2: fx + ww, y2: fy + wh });
      const ratio = (word.score - minVal) / range;
      return { word, fx, fy, size, ratio } as {
        word: { term: string; score: number };
        fx: number; fy: number; size: number; ratio: number;
      };
    });
  }, [terms, maxWords]);

  if (!layout.length) return null;
  return (
    <svg viewBox={`0 0 ${BOW_CLOUD_W} ${BOW_CLOUD_H}`} className="w-full" style={{ minHeight: '240px' }}>
      {layout.map(({ word, fx, fy, size, ratio }) => (
        <text
          key={word.term}
          x={fx} y={fy + size}
          fontSize={size}
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontWeight={ratio > 0.6 ? 700 : ratio > 0.3 ? 600 : 400}
          fill={bowCloudColor(ratio)}
          fillOpacity={0.52 + ratio * 0.48}
          style={{ cursor: 'default' }}
        >
          <title>{word.term}: {word.score.toFixed(0)} ocurrencias</title>
          {word.term}
        </text>
      ))}
    </svg>
  );
};

// ── NER entity-type color map ──────────────────────────────────────────────────
// Colores fijos por tipo: el analista aprende la asociación tipo → color.
