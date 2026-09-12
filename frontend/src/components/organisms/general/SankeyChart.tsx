/**
 * Sankey tema -> categoria de transformacion digital (VIZ-7).
 */

import React from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { ChartCard } from '../../molecules';
import type { EnrichedTopic } from './types';
import { FACTOR_CATEGORIES, CAT_BY_ID } from './categories';

export interface SankeyChartProps {
  enrichedTopics: EnrichedTopic[];
}

export const SankeyChart: React.FC<SankeyChartProps> = ({ enrichedTopics }) => {
  return (
    <>
      {enrichedTopics.length >= 2 && (() => {
        const catNodes = FACTOR_CATEGORIES.map(c => ({ id: `cat:${c.id}` }));
        const topicNodes = enrichedTopics.map(t => ({ id: `t:${t.id}` }));
        const links = enrichedTopics.map(t => ({
          source: `t:${t.id}`,
          target: `cat:${t.categoryId}`,
          value: Math.max(t.numDocuments, 1),
        }));
        // Only include categories that have at least one topic
        const usedCatIds = new Set(enrichedTopics.map(t => t.categoryId));
        const filteredCatNodes = catNodes.filter(n => usedCatIds.has(n.id.replace('cat:', '')));
        const sankeyData = { nodes: [...topicNodes, ...filteredCatNodes], links };
        return (
          <ChartCard
            title="Flujo Tema → Categoría OE3"
            subtitle="Sankey — cada banda muestra cómo los temas se asignan a las categorías del marco OE3"
            accentColor="purple"
            size="lg"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
          >
            <div style={{ height: Math.max(300, enrichedTopics.length * 28 + 60) }}>
              <ResponsiveSankey
                data={sankeyData as any}
                margin={{ top: 16, right: 160, bottom: 16, left: 160 }}
                align="justify"
                colors={(node: any) => {
                  const id: string = node.id || '';
                  if (id.startsWith('cat:')) {
                    const cat = FACTOR_CATEGORIES.find(c => c.id === id.replace('cat:', ''));
                    return cat?.color || '#64748b';
                  }
                  const tid = Number(id.replace('t:', ''));
                  const topic = enrichedTopics.find(t => t.id === tid);
                  return CAT_BY_ID[topic?.categoryId || '']?.color || '#8b5cf6';
                }}
                nodeOpacity={1}
                nodeHoverOpacity={1}
                nodeThickness={18}
                nodeInnerPadding={3}
                nodeSpacing={12}
                nodeBorderWidth={0}
                linkOpacity={0.4}
                linkHoverOpacity={0.7}
                linkContract={2}
                enableLinkGradient
                labelPosition="outside"
                labelOrientation="horizontal"
                labelPadding={14}
                labelTextColor={{ from: 'color', modifiers: [['brighter', 1]] } as any}
                theme={{
                  text: { fill: '#94a3b8', fontSize: 11 },
                  tooltip: { container: { background: '#1e293b', color: '#f8fafc', fontSize: 12, borderRadius: '8px', border: '1px solid #334155' } },
                }}
              />
            </div>
          </ChartCard>
        );
      })()}
    </>
  );
};
