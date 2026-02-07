/**
 * DonutChartViz - Interactive donut chart with cross-filtering support
 *
 * Uses @nivo/pie for rendering. Supports bidirectional filtering via FilterContext.
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
}) => {
  const { filters, setCrossFilter, clearCrossFilter } = useFilter();

  // Get selected items from cross-filter
  const selectedValues = chartId === 'languages-donut'
    ? filters.selectedLanguages
    : chartId === 'algorithms-chart'
    ? filters.selectedAlgorithms
    : [];

  const handleClick = useCallback(
    (datum: any) => {
      const clickedId = datum.id;

      // Trigger cross-filter update
      setCrossFilter(chartId, clickedId);

      // Call custom handler if provided
      onSegmentClick?.({
        id: clickedId,
        label: datum.label,
        value: datum.value,
        color: datum.color,
      });
    },
    [chartId, setCrossFilter, onSegmentClick]
  );

  // Apply visual highlighting based on selection
  const processedData = data.map((d, index) => ({
    ...d,
    color: d.color || colors[index % colors.length],
    // Dim non-selected items when there's an active selection
    opacity: selectedValues.length === 0 || selectedValues.includes(d.id) ? 1 : 0.3,
  }));

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
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            {centerValue && (
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
      {selectedValues.length > 0 && chartId && (
        <button
          onClick={() => clearCrossFilter(chartId)}
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
