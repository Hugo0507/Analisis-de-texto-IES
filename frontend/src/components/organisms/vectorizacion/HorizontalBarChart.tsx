/**
 * Barras horizontales para n-gramas y top TF-IDF.
 */

import React from 'react';

export interface HorizontalBarChartProps {
  data: Array<{ id: string; label: string; value: number }>;
  maxBars?: number;
  colorClass?: string;
  onItemClick?: (item: { id: string; label: string; value: number }) => void;
  selectedId?: string | null;
}

const getBarFill = (colorClass: string): string => {
  if (colorClass.includes('purple') || colorClass.includes('violet')) return '#8b5cf6';
  if (colorClass.includes('emerald') || colorClass.includes('green'))  return '#10b981';
  if (colorClass.includes('amber')   || colorClass.includes('yellow')) return '#f59e0b';
  if (colorClass.includes('rose')    || colorClass.includes('red'))    return '#f43f5e';
  if (colorClass.includes('blue')    && !colorClass.includes('cyan'))  return '#3b82f6';
  return '#06b6d4'; // default cyan
};

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
  data, maxBars = 15, colorClass = 'bg-cyan-500', onItemClick, selectedId,
}) => {
  if (!data || data.length === 0) return null;
  const items    = data.slice(0, maxBars);
  const maxValue = Math.max(...items.map(d => d.value));
  const BAR_H = 22, GAP = 7, LABEL_W = 132, VAL_W = 68, SVG_W = 520;
  const BAR_AREA = SVG_W - LABEL_W - VAL_W - 12;
  const SVG_H    = items.length * (BAR_H + GAP) + 8;
  const barColor = getBarFill(colorClass);
  const selColor = '#f59e0b';

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: `${SVG_H}px`, minHeight: '80px' }}>
      {items.map((item, i) => {
        const y   = 4 + i * (BAR_H + GAP);
        const isSel = selectedId === item.id;
        const bw  = Math.max(2, ((item.value / maxValue) * BAR_AREA));
        const fill = isSel ? selColor : barColor;
        const lbl  = item.label.length > 17 ? item.label.slice(0, 17) + '…' : item.label;
        const val  = typeof item.value === 'number' && item.value < 1
          ? item.value.toFixed(2) : item.value.toLocaleString();
        return (
          <g key={item.id} onClick={() => onItemClick?.(item)} style={{ cursor: onItemClick ? 'pointer' : 'default' }}>
            {isSel && <rect x={0} y={y - 2} width={SVG_W} height={BAR_H + 4} rx={5} fill={selColor} fillOpacity={0.08} />}
            <text x={LABEL_W - 7} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize={11}
              fill={isSel ? '#ffffff' : '#cbd5e1'} fontFamily="ui-sans-serif, system-ui, sans-serif">
              {lbl}
            </text>
            <rect x={LABEL_W} y={y + 3} width={BAR_AREA} height={BAR_H - 6} rx={4} fill="#1e293b" />
            <rect x={LABEL_W} y={y + 3} width={bw}       height={BAR_H - 6} rx={4} fill={fill} />
            <text x={LABEL_W + BAR_AREA + 8} y={y + BAR_H / 2 + 4} fontSize={11}
              fill={isSel ? '#ffffff' : '#94a3b8'} fontFamily="ui-sans-serif, system-ui, sans-serif">
              {val}
            </text>
            {isSel && <circle cx={SVG_W - 5} cy={y + BAR_H / 2} r={3.5} fill="#22d3ee" />}
          </g>
        );
      })}
    </svg>
  );
};

// ─── TF vs IDF Scatter Plot ───────────────────────────────────────────────────
