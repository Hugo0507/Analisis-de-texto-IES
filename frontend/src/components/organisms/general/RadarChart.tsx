/**
 * Radar de cobertura por categoria (VIZ-8).
 */

import React from 'react';
import { ResponsiveRadar } from '@nivo/radar';
import { ChartCard } from '../../molecules';
import type { EnrichedTopic } from './types';
import { FACTOR_CATEGORIES } from './categories';

export interface RadarChartProps {
  enrichedTopics: EnrichedTopic[];
  topicsByCategory: Record<string, EnrichedTopic[]>;
}

export const RadarChart: React.FC<RadarChartProps> = ({ enrichedTopics, topicsByCategory }) => {
  return (
    <>
      {enrichedTopics.length >= 2 && (() => {
        const catMetrics = FACTOR_CATEGORIES.map(cat => {
          const catTopics = topicsByCategory[cat.id] ?? [];
          const docCount = catTopics.reduce((s, t) => s + t.numDocuments, 0);
          return {
            category: cat.shortLabel,
            'Nº Temas': catTopics.length,
            'Cobertura (docs)': docCount,
          };
        });
        const hasData = catMetrics.some(m => m['Nº Temas'] > 0);
        if (!hasData) return null;
        return (
          <ChartCard
            title="Radar de cobertura por categoría"
            subtitle="Comparativa de temas y documentos cubiertos por cada factor OE3"
            accentColor="cyan"
            size="md"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            }
          >
            <div style={{ height: '340px' }}>
              <ResponsiveRadar
                data={catMetrics as any}
                keys={['Nº Temas', 'Cobertura (docs)']}
                indexBy="category"
                maxValue="auto"
                margin={{ top: 50, right: 80, bottom: 50, left: 80 }}
                curve="linearClosed"
                borderWidth={2}
                borderColor={{ from: 'color' } as any}
                gridLevels={4}
                gridShape="circular"
                gridLabelOffset={18}
                enableDots
                dotSize={8}
                dotColor={{ from: 'color' } as any}
                dotBorderWidth={2}
                dotBorderColor={{ from: 'color', modifiers: [['darker', 0.5]] } as any}
                enableDotLabel={false}
                fillOpacity={0.25}
                blendMode="normal"
                animate
                motionConfig="gentle"
                colors={['#06b6d4', '#8b5cf6']}
                theme={{
                  text: { fill: '#94a3b8', fontSize: 11 },
                  grid: { line: { stroke: '#334155' } },
                  tooltip: { container: { background: '#1e293b', color: '#f8fafc', fontSize: 12, borderRadius: '8px', border: '1px solid #334155' } },
                }}
                legends={[{
                  anchor: 'top-left',
                  direction: 'column',
                  translateX: -40,
                  translateY: -30,
                  itemWidth: 90,
                  itemHeight: 18,
                  itemTextColor: '#94a3b8',
                  symbolSize: 10,
                  symbolShape: 'circle',
                  effects: [{ on: 'hover', style: { itemTextColor: '#fff' } }],
                }] as any}
              />
            </div>
          </ChartCard>
        );
      })()}
    </>
  );
};
