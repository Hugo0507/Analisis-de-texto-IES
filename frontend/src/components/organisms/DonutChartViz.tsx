/**
 * DonutChartViz - Interactive donut chart with cross-filtering support
 *
 * Uses @nivo/pie for the ring. The legend is HTML (label, value and share) so long
 * category names wrap/truncate cleanly instead of colliding around the ring.
 * Clicking a segment or a legend row does the same thing: cross-filtering
 * highlights matching segments (Power BI style) without removing data.
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
  /** Etiquetas con línea alrededor del anillo. Por defecto se usa la leyenda. */
  enableArcLinkLabels?: boolean;
  /** Leyenda con valor y porcentaje bajo el anillo. */
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
  onSegmentClick?: (datum: DonutChartData) => void;
  /** Segments to visually highlight. Empty array = all at full opacity. Undefined = use FilterContext. */
  activeSegments?: string[];
  skipCrossFilter?: boolean;
  onClearFilter?: () => void;
}

// Paleta categórica validada sobre la superficie ink-900 (#0D1424): separación
// para daltonismo ≥ 8,4 entre vecinos y contraste ≥ 3:1. Orden fijo, no se cicla
// con tonos nuevos: a partir del noveno se usan grises.
export const CHART_CATEGORICAL = [
  '#3987e5', // azul
  '#d95926', // naranja
  '#199e70', // aguamarina
  '#c98500', // amarillo
  '#d55181', // magenta
  '#008300', // verde
  '#9085e9', // violeta
  '#e66767', // rojo
];
export const CHART_OVERFLOW = ['#5B6B86', '#46546E'];

const defaultColors = [...CHART_CATEGORICAL, ...CHART_OVERFLOW];

// Segmento no seleccionado durante un filtro: se funde con la superficie.
const MUTED_SEGMENT = '#243049';

export const DonutChartViz: React.FC<DonutChartVizProps> = ({
  data,
  chartId,
  innerRadius = 0.68,
  padAngle = 1.2,
  cornerRadius = 3,
  activeOuterRadiusOffset = 6,
  colors = defaultColors,
  enableArcLabels = false,
  enableArcLinkLabels = false,
  showLegend = true,
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
    (datum: { id: string | number; label: string | number; value: number; color: string }) => {
      const clickedId = String(datum.id);

      if (!skipCrossFilter) {
        setCrossFilter(chartId, clickedId);
      }

      onSegmentClick?.({
        id: clickedId,
        label: String(datum.label),
        value: datum.value,
        color: datum.color,
      });
    },
    [chartId, setCrossFilter, onSegmentClick, skipCrossFilter]
  );

  const total = data.reduce((sum, d) => sum + d.value, 0);

  // Apply visual highlighting: selected segments keep their color, the rest recede
  const processedData = data.map((d, index) => {
    const originalColor = d.color || colors[index % colors.length];
    const isActive = highlightedIds.length === 0 || highlightedIds.includes(d.id);
    return {
      ...d,
      originalColor,
      isActive,
      color: isActive ? originalColor : MUTED_SEGMENT,
    };
  });

  const legendTwoColumns = processedData.length > 4;

  return (
    <div className={`relative flex h-full w-full flex-col ${className}`}>
      {/* Anillo */}
      <div className="relative min-h-[140px] flex-1">
        <ResponsivePie
          data={processedData}
          margin={enableArcLinkLabels
            ? { top: 20, right: 80, bottom: 20, left: 80 }
            : { top: 8, right: 8, bottom: 8, left: 8 }}
          innerRadius={innerRadius}
          padAngle={padAngle}
          cornerRadius={cornerRadius}
          activeOuterRadiusOffset={activeOuterRadiusOffset}
          colors={{ datum: 'data.color' }}
          borderWidth={0}
          enableArcLabels={enableArcLabels}
          enableArcLinkLabels={enableArcLinkLabels}
          arcLinkLabel="label"
          arcLinkLabelsSkipAngle={12}
          arcLinkLabelsTextColor="#97A6BE"
          arcLinkLabelsThickness={1}
          arcLinkLabelsColor={{ from: 'color' }}
          arcLabelsTextColor="#ffffff"
          onClick={handleClick}
          motionConfig="gentle"
          transitionMode="pushIn"
          theme={{
            text: {
              fontSize: 12,
              fill: '#97A6BE',
              fontFamily: 'Inter, system-ui, sans-serif',
            },
            tooltip: {
              container: {
                background: '#162038',
                color: '#E6ECF5',
                fontSize: 12,
                borderRadius: '10px',
                border: '1px solid #2A3754',
                boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.5)',
              },
            },
          }}
        />

        {/* Center label */}
        {(centerLabel || centerValue !== undefined) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {centerValue !== undefined && (
                <p className="num font-display text-2xl font-semibold leading-none tracking-[-0.02em] text-paper">
                  {typeof centerValue === 'number' ? centerValue.toLocaleString() : centerValue}
                </p>
              )}
              {centerLabel && (
                <p className="mt-1 max-w-[7rem] truncate text-xs text-mist">{centerLabel}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Leyenda */}
      {showLegend && !enableArcLinkLabels && processedData.length > 0 && (
        <ul
          className={`mt-3 grid max-h-[112px] gap-x-4 gap-y-1 overflow-y-auto pr-1 ${legendTwoColumns ? 'grid-cols-2' : 'grid-cols-1'}`}
        >
          {processedData.map((d) => {
            const share = total > 0 ? (d.value / total) * 100 : 0;
            return (
              <li key={d.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => handleClick({ id: d.id, label: d.label, value: d.value, color: d.originalColor })}
                  aria-pressed={highlightedIds.includes(d.id)}
                  title={`${d.label}: ${d.value.toLocaleString()} (${share.toFixed(1)}%)`}
                  className={`group flex w-full min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-ink-800 ${d.isActive ? '' : 'opacity-45'}`}
                >
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.originalColor }} />
                  <span className="min-w-0 flex-1 truncate text-paper/90 group-hover:text-paper">{d.label}</span>
                  <span className="num shrink-0 text-mist">
                    {legendTwoColumns ? `${share.toFixed(0)}%` : `${d.value.toLocaleString()} · ${share.toFixed(1)}%`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
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
          className="absolute right-0 top-0 rounded-full border border-ink-600 bg-ink-800 p-1.5 text-mist transition-colors hover:text-paper"
          title="Limpiar filtro"
          aria-label="Limpiar filtro"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};
