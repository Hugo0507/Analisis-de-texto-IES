/**
 * ScatterPlotProjection
 *
 * Visualiza proyecciones 2D de embeddings BERTopic (PCA, t-SNE, UMAP).
 * Cada punto representa un documento; el color indica el tema asignado.
 */

import React, { useState, useMemo } from 'react';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import type { ProjectionPoint, Projections2D } from '../../services/bertopicService';

// ── Color palette ────────────────────────────────────────────────────────────
const TOPIC_COLORS = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444',
  '#ec4899', '#d946ef', '#14b8a6', '#0ea5e9', '#a855f7',
];
const OUTLIER_COLOR = '#94a3b8';

type Tab = 'pca' | 'tsne' | 'umap';

interface Props {
  projections: Projections2D;
  /** Lock to a single projection method and hide the tab switcher */
  fixedMethod?: Tab;
  /** Use dark-theme axis / grid colors (for dark dashboards) */
  dark?: boolean;
}

const TAB_LABELS: Record<Tab, string> = {
  pca: 'PCA',
  tsne: 't-SNE',
  umap: 'UMAP',
};

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  pca: 'Análisis de Componentes Principales — proyección lineal, preserva varianza global',
  tsne: 't-SNE — proyección no lineal, preserva estructura de vecindad local',
  umap: 'UMAP — proyección no lineal, preserva estructura local y global',
};

export const ScatterPlotProjection: React.FC<Props> = ({ projections, fixedMethod, dark = false }) => {
  const [activeTab, setActiveTab] = useState<Tab>(fixedMethod ?? 'umap');

  const points: ProjectionPoint[] = projections[activeTab] ?? [];

  // Agrupar por tema → series para Nivo
  const { chartData, topicColorMap } = useMemo(() => {
    const groups: Record<string, { id: string; topic_id: number; data: Array<{ x: number; y: number; doc_index: number }> }> = {};
    const colorMap: Record<string, string> = {};
    const topicIds: number[] = [];

    points.forEach((pt, idx) => {
      const key = pt.topic_label;
      if (!groups[key]) {
        groups[key] = { id: key, topic_id: pt.topic_id, data: [] };
        if (!topicIds.includes(pt.topic_id)) topicIds.push(pt.topic_id);
      }
      groups[key].data.push({ x: pt.x, y: pt.y, doc_index: idx });
    });

    // Asignar colores: outliers (topic_id = -1) → gris, resto → palette
    const nonOutlierIds = topicIds.filter(id => id !== -1).sort((a, b) => a - b);
    Object.values(groups).forEach(g => {
      if (g.topic_id === -1) {
        colorMap[g.id] = OUTLIER_COLOR;
      } else {
        const colorIdx = nonOutlierIds.indexOf(g.topic_id) % TOPIC_COLORS.length;
        colorMap[g.id] = TOPIC_COLORS[colorIdx];
      }
    });

    const sortedData = Object.values(groups).sort((a, b) => {
      if (a.topic_id === -1) return 1;
      if (b.topic_id === -1) return -1;
      return a.topic_id - b.topic_id;
    });

    return { chartData: sortedData, topicColorMap: colorMap };
  }, [points]);

  const axisTextColor = dark ? '#94a3b8' : '#6b7280';
  const gridColor = dark ? '#334155' : '#f3f4f6';
  const tooltipBg = dark ? '#1e293b' : '#ffffff';
  const tooltipBorder = dark ? '#334155' : '#e5e7eb';
  const tooltipText = dark ? '#e2e8f0' : '#1f2937';
  const tooltipSub = dark ? '#94a3b8' : '#6b7280';
  const legendText = dark ? 'text-slate-300' : 'text-gray-600';
  const legendCount = dark ? 'text-slate-400' : 'text-gray-400';

  if (points.length === 0) {
    return (
      <div className={`flex items-center justify-center h-48 text-sm ${dark ? 'text-slate-400' : 'text-gray-400'}`}>
        Sin datos de proyección para {TAB_LABELS[fixedMethod ?? activeTab]}
      </div>
    );
  }

  return (
    <div>
      {/* Tabs — hidden when fixedMethod is set */}
      {!fixedMethod && (
        <div className="flex gap-2 mb-4">
          {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-purple-600 text-white shadow-sm'
                  : dark
                    ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      )}

      {/* Description — hidden when fixedMethod is set */}
      {!fixedMethod && (
        <p className={`text-xs mb-4 ${dark ? 'text-slate-400' : 'text-gray-400'}`}>
          {TAB_DESCRIPTIONS[activeTab]}
        </p>
      )}

      {/* Chart */}
      <div style={{ height: '420px' }}>
        <ResponsiveScatterPlot
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
          xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
          yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
          blendMode="normal"
          nodeSize={6}
          colors={({ serieId }) => topicColorMap[serieId as string] ?? OUTLIER_COLOR}
          axisBottom={{
            tickSize: 4,
            tickPadding: 4,
            legend: 'Dimensión 1',
            legendOffset: 40,
            legendPosition: 'middle',
          }}
          axisLeft={{
            tickSize: 4,
            tickPadding: 4,
            legend: 'Dimensión 2',
            legendOffset: -48,
            legendPosition: 'middle',
          }}
          tooltip={({ node }) => (
            <div
              style={{
                background: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
                padding: '8px 12px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <div
                  style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: node.color, flexShrink: 0 }}
                />
                <span style={{ fontWeight: 600, color: tooltipText, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.serieId}
                </span>
              </div>
              <div style={{ color: tooltipSub }}>
                x: {(node.xValue as number).toFixed(3)}, y: {(node.yValue as number).toFixed(3)}
              </div>
            </div>
          )}
          theme={{
            axis: {
              ticks: { text: { fontSize: 10, fill: axisTextColor } },
              legend: { text: { fontSize: 11, fill: axisTextColor } },
            },
            grid: { line: { stroke: gridColor } },
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
        {chartData.map(series => (
          <div key={series.id} className={`flex items-center gap-1.5 text-xs ${legendText}`}>
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: topicColorMap[series.id] }}
            />
            <span className="truncate max-w-[160px]" title={series.id}>{series.id}</span>
            <span className={legendCount}>({series.data.length})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScatterPlotProjection;
