/**
 * Nube de palabras del vocabulario BoW.
 */

import React, { useMemo } from 'react';

export interface WordCloudProps {
  data: Array<{ text: string; value: number }>;
  maxWords?: number;
  onWordClick?: (word: { text: string; value: number }) => void;
  selectedWord?: string | null;
}

export const CLOUD_W = 660;
export const CLOUD_H = 310;
export const CLOUD_COLORS = ['#22d3ee','#34d399','#c084fc','#60a5fa','#fbbf24','#fb7185','#2dd4bf','#a78bfa','#4ade80','#f472b6','#38bdf8','#a3e635'];

export const SimpleWordCloud: React.FC<WordCloudProps> = ({ data, maxWords = 60, onWordClick, selectedWord }) => {
  const layout = useMemo(() => {
    if (!data || data.length === 0) return [];
    const words  = data.slice(0, maxWords);
    const maxVal = Math.max(...words.map(d => d.value));
    const minVal = Math.min(...words.map(d => d.value));
    const range  = maxVal - minVal || 1;
    const fs = (v: number) => Math.round(11 + ((v - minVal) / range) * 30);
    type Box = { x1: number; y1: number; x2: number; y2: number };
    const placed: Box[] = [];
    const hits = (x1: number, y1: number, x2: number, y2: number) =>
      placed.some(p => x1 < p.x2 + 5 && x2 > p.x1 - 5 && y1 < p.y2 + 3 && y2 > p.y1 - 3);
    return words.map((word, idx) => {
      const size = fs(word.value);
      const ww = word.text.length * size * 0.57;
      const wh = size * 1.25;
      let fx = CLOUD_W / 2 - ww / 2, fy = CLOUD_H / 2 - wh / 2;
      for (let s = 0; s < 700; s++) {
        const x = CLOUD_W / 2 + s * 1.05 * Math.cos(s * 0.48) - ww / 2;
        const y = CLOUD_H / 2 + s * 0.62 * Math.sin(s * 0.48) - wh / 2;
        if (x < 4 || x + ww > CLOUD_W - 4 || y < 4 || y + wh > CLOUD_H - 4) continue;
        if (!hits(x, y, x + ww, y + wh)) { fx = x; fy = y; break; }
      }
      placed.push({ x1: fx, y1: fy, x2: fx + ww, y2: fy + wh });
      const n = (word.value - minVal) / range;
      return { word, fx, fy, size, color: CLOUD_COLORS[idx % CLOUD_COLORS.length], n };
    });
  }, [data, maxWords]);

  if (layout.length === 0) return null;
  return (
    <svg viewBox={`0 0 ${CLOUD_W} ${CLOUD_H}`} className="w-full" style={{ minHeight: '260px' }}>
      {layout.map(({ word, fx, fy, size, color, n }) => {
        const isSelected = selectedWord === word.text;
        return (
          <text key={word.text} x={fx} y={fy + size} fontSize={size}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontWeight={n > 0.6 ? 700 : n > 0.3 ? 600 : 400}
            fill={color}
            fillOpacity={isSelected ? 1 : 0.45 + n * 0.55}
            stroke={isSelected ? color : 'none'} strokeWidth={isSelected ? 0.6 : 0}
            style={{ cursor: 'pointer' }}
            onClick={() => onWordClick?.(word)}
          >
            <title>{word.text}: {word.value.toLocaleString()} apariciones</title>
            {word.text}
          </text>
        );
      })}
    </svg>
  );
};

// ─── VocabularyTable ─────────────────────────────────────────────────────────
