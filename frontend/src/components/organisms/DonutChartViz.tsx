/**
 * DonutChartViz - Interactive donut chart with cross-filtering support
 *
 * Uses @nivo/pie for rendering. Supports bidirectional filtering via FilterContext.
 * Cross-filtering highlights matching segments (Power BI style) without removing data.
 */

import React, { useCallback } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { useFilter } from '../../contexts/FilterContext';

export interface DonutChartData {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface DonutChartVizProps {
  data: DonutChartData[];
  chartId: string;
  innerRadius?: number;
  padAngle?: number;
  cornerRadius?: number;
  activeOuterRadiusOffset?: number;
  colors?: string[];
  enableArcLabels?: boolean;
  enableArcLinkLabels?: boolean;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
  onSegmentClick?: (datum: DonutChartData) => void;
  /** Segments to visually highlight. Empty array = all at full opacity. Undefined = use FilterContext. */
  activeSegments?: string[];
  skipCrossFilter?: boolean;
  onClearFilter?: () => void;
}

const defaultColors = [
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#3b82f6', // blue-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
];

export const DonutChartViz: React.FC<DonutChartVizProps> = ({
  data,
  chartId,
  innerRadius = 0.6,
  padAngle = 0.7,
  cornerRadius = 4,
  activeOuterRadiusOffset = 8,
  colors = defaultColors,
  enableArcLabels = false,
  enableArcLinkLabels = true,
  centerLabel,
  centerValue,
  className = '',
  onSegmentClick,
  activeSegments,
  skipCrossFilter = false,
  onClearFilter,
}) => {
  const { filters, setCrossFilter, clearCrossFilter } = useFilter();

  // Determine which segments should be highlighted
  const highlightedIds: string[] = activeSegments !== undefined
    ? activeSegments
    : (chartId === 'languages-donut'
      ? filters.selectedLanguages
      : chartId === 'directory-donut' && filters.selectedDirectory
      ? [filters.selectedDirectory]
      : []);

  const handleClick = useCallback(
    (datum: any) => {
      const clickedId = datum.id;

      if (!skipCrossFilter) {
        setCrossFilter(chartId, clickedId);
      }

      onSegmentClick?.({
        id: clickedId,
        label: datum.label,
        value: datum.value,
        color: datum.color,
      });
    },
    [chartId, setCrossFilter, onSegmentClick, skipCrossFilter]
  );

  // Apply visual highlighting: selected segments keep their color, unselected get a muted gray
  const processedData = data.map((d, index) => {
    const originalColor = d.color || colors[index % colors.length];
    const isActive = highlightedIds.length === 0 || highlightedIds.includes(d.id);
    return {
      ...d,
      color: isActive ? originalColor : '#334155',
    };
  });

  return (
    <div className={`relative w-full h-full ${className}`}>
      <ResponsivePie
        data={processedData}
        margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
        innerRadius={innerRadius}
        padAngle={padAngle}
        cornerRadius={cornerRadius}
        activeOuterRadiusOffset={activeOuterRadiusOffset}
        colors={{ datum: 'data.color' }}
        borderWidth={0}
        enableArcLabels={enableArcLabels}
        enableArcLinkLabels={enableArcLinkLabels}
        arcLinkLabel="label"
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#94a3b8"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsTextColor="#ffffff"
        onClick={handleClick}
        motionConfig="gentle"
        transitionMode="pushIn"
        theme={{
          text: {
            fontSize: 12,
            fill: '#94a3b8',
          },
          tooltip: {
            container: {
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: 12,
              borderRadius: '8px',
              border: '1px solid #334155',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            },
          },
        }}
        legends={[
          {
            anchor: 'right',
            direction: 'column',
            justify: false,
            translateX: 70,
            translateY: 0,
            itemsSpacing: 8,
            itemWidth: 60,
            itemHeight: 18,
            itemTextColor: '#94a3b8',
            itemDirection: 'left-to-right',
            itemOpacity: 1,
            symbolSize: 12,
            symbolShape: 'circle',
            effects: [
              {
                on: 'hover',
                style: {
                  itemTextColor: '#ffffff',
                },
              },
            ],
          },
        ]}
      />

      {/* Center label */}
      {(centerLabel || centerValue !== undefined) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            {centerValue !== undefined && (
              <p className="text-2xl font-bold text-white">
                {typeof centerValue === 'number' ? centerValue.toLocaleString() : centerValue}
              </p>
            )}
            {centerLabel && (
              <p className="text-xs text-slate-400 mt-1">{centerLabel}</p>
            )}
          </div>
        </div>
      )}

      {/* Clear filter button when active */}
      {highlightedIds.length > 0 && chartId && (
        <button
          onClick={() => {
            if (skipCrossFilter && onClearFilter) {
              onClearFilter();
            } else {
              clearCrossFilter(chartId);
            }
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
          title="Limpiar filtro"
        >
          <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
