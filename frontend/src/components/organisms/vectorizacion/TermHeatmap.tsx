/**
 * Heatmap de metricas por termino.
 */

import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import type { HeatmapDataRow } from './types';

export const TermHeatmap: React.FC<{
  data: HeatmapDataRow[];
  onTermClick?: (term: string) => void;
}> = ({ data, onTermClick }) => {
  if (!data || data.length === 0 || data[0]?.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-fog text-sm">
        Se necesitan análisis BoW y TF-IDF para generar el heatmap
      </div>
    );
  }
  const termCount = data[0]?.data.length || 0;
  const h = Math.max(180, data.length * 52 + 90);
  return (
    <div style={{ height: `${h}px` }}>
      <ResponsiveHeatMap
        data={data as any}
        margin={{ top: 40, right: 30, bottom: 70, left: 90 }}
        valueFormat=">-.1f"
        axisTop={{
          tickSize: 5, tickPadding: 5, tickRotation: -40,
          legend: `Top ${termCount} términos`, legendOffset: -36,
        } as any}
        axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0 } as any}
        colors={{ type: 'sequential', scheme: 'blues' } as any}
        emptyColor="#1e293b"
        borderRadius={3}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.5]] } as any}
        enableLabels={false}
        legends={[{
          anchor: 'bottom', translateX: 0, translateY: 60,
          length: 220, thickness: 8, direction: 'row',
          tickPosition: 'after', tickSize: 3, tickSpacing: 4, tickOverlap: false,
          title: 'Score normalizado →', titleAlign: 'start', titleOffset: 4,
        }] as any}
        theme={{
          text: { fill: '#94a3b8', fontSize: 11 },
          axis: { ticks: { text: { fill: '#64748b' } } },
          tooltip: { container: { background: '#1e293b', color: '#f8fafc', fontSize: 12, borderRadius: '8px', border: '1px solid #334155' } },
        }}
        onClick={(cell: any) => onTermClick?.(String(cell.data?.x ?? cell.id))}
      />
    </div>
  );
};

// ─── CooccurrenceGraph ────────────────────────────────────────────────────────
