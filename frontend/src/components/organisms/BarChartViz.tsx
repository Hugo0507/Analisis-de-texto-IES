/**
 * BarChartViz Component (Organism)
 *
 * Bar chart visualization using Nivo for term frequencies, topic distributions, etc.
 */

import React from 'react';
import { ResponsiveBar } from '@nivo/bar';

export interface BarChartData {
  id: string;
  label?: string;
  value: number;
  [key: string]: any;
}

export interface BarChartVizProps {
  data: BarChartData[];
  keys?: string[];
  indexBy?: string;
  title?: string;
  height?: number;
  layout?: 'horizontal' | 'vertical';
  colorScheme?: string;
  showLegend?: boolean;
  className?: string;
}

export const BarChartViz: React.FC<BarChartVizProps> = ({
  data,
  keys = ['value'],
  indexBy = 'id',
  title,
  height = 400,
  layout = 'vertical',
  colorScheme = 'nivo',
  showLegend = false,
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
        <ResponsiveBar
          data={data}
          keys={keys}
          indexBy={indexBy}
          layout={layout}
          margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={{ scheme: colorScheme as any }}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 1.6]],
          }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: layout === 'vertical' ? -45 : 0,
            legend: '',
            legendPosition: 'middle',
            legendOffset: 40,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: '',
            legendPosition: 'middle',
            legendOffset: -50,
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 1.6]],
          }}
          legends={showLegend ? [
            {
              dataFrom: 'keys',
              anchor: 'bottom-right',
              direction: 'column',
              justify: false,
              translateX: 120,
              translateY: 0,
              itemsSpacing: 2,
              itemWidth: 100,
              itemHeight: 20,
              itemDirection: 'left-to-right',
              itemOpacity: 0.85,
              symbolSize: 20,
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemOpacity: 1,
                  },
                },
              ],
            },
          ] : []}
          role="application"
          ariaLabel="Bar chart"
          tooltip={({ id, value, indexValue }) => (
            <div className="bg-white px-3 py-2 rounded shadow-lg border border-gray-200">
              <div className="text-sm font-semibold">{indexValue || id}</div>
              <div className="text-sm text-gray-600">
                Value: <span className="font-medium">{value}</span>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};
