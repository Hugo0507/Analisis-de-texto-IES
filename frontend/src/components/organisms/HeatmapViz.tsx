/**
 * HeatmapViz Component (Organism)
 *
 * Heatmap visualization using Nivo for document-term matrices, topic distributions, etc.
 */

import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';

export interface HeatmapData {
  id: string;
  data: Array<{
    x: string | number;
    y: number;
  }>;
}

export interface HeatmapVizProps {
  data: HeatmapData[];
  title?: string;
  height?: number;
  colorScheme?: string;
  className?: string;
}

export const HeatmapViz: React.FC<HeatmapVizProps> = ({
  data,
  title,
  height = 500,
  colorScheme = 'blues',
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {title}
        </h3>
      )}

      <div style={{ height: `${height}px` }}>
        <ResponsiveHeatMap
          data={data}
          margin={{ top: 60, right: 90, bottom: 60, left: 90 }}
          valueFormat=">-.2f"
          axisTop={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: '',
            legendOffset: 46,
          }}
          axisRight={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: '',
            legendPosition: 'middle',
            legendOffset: 70,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: '',
            legendPosition: 'middle',
            legendOffset: -72,
          }}
          colors={{
            type: 'quantize',
            scheme: colorScheme as any,
          }}
          emptyColor="#ffffff"
          borderColor={{
            from: 'color',
            modifiers: [['darker', 0.4]],
          }}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 2]],
          }}
          legends={[
            {
              anchor: 'bottom',
              translateX: 0,
              translateY: 30,
              length: 400,
              thickness: 8,
              direction: 'row',
              tickPosition: 'after',
              tickSize: 3,
              tickSpacing: 4,
              tickOverlap: false,
              tickFormat: '>-.2f',
              title: 'Value →',
              titleAlign: 'start',
              titleOffset: 4,
            },
          ]}
          tooltip={({ cell }) => (
            <div className="bg-white px-3 py-2 rounded shadow-lg border border-gray-200">
              <div className="text-sm font-semibold">{cell.serieId}</div>
              <div className="text-sm text-gray-600">
                {cell.data.x}: <span className="font-medium">{cell.formattedValue}</span>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};
