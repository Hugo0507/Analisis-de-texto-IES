/**
 * Pestana Co-ocurrencia: grafo construido desde los bigramas.
 */

import React from 'react';
import type { VectorizationDashboardData } from '../../../services/dashboardService';
import { ChartCard } from '../../molecules';
import type { SelectedTerm } from './types';
import { CooccurrenceGraph } from './CooccurrenceGraph';

export interface CooccurrenceSectionProps {
  activeSection: string;
  data: VectorizationDashboardData | null;
  isLoading: boolean;
  refetch: () => void;
  cooccurrenceData: {
    nodes: Array<{ id: string; size: number; color: string }>;
    links: Array<{ source: string; target: string; distance: number; thickness: number }>;
    availableConfigs: string[];
  };
  setSelectedTerm: React.Dispatch<React.SetStateAction<SelectedTerm | null>>;
  buildTerm: (text: string, source: SelectedTerm['source'], bowScore?: number, bowRank?: number) => SelectedTerm;
}

export const CooccurrenceSection: React.FC<CooccurrenceSectionProps> = ({
  activeSection, data, isLoading, refetch, cooccurrenceData,
  setSelectedTerm, buildTerm,
}) => {
  return (
    <>
      {activeSection === 'cooccurrence' && (
        <ChartCard
          title="Grafo de co-ocurrencia"
          subtitle={`${cooccurrenceData.nodes.length} términos · ${cooccurrenceData.links.length} conexiones — construido desde bigramas · grosor = frecuencia`}
          accentColor="purple"
          size="xl"
          downloadable
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
        >
          <CooccurrenceGraph
            nodes={cooccurrenceData.nodes}
            links={cooccurrenceData.links}
            availableConfigs={cooccurrenceData.availableConfigs}
            onNodeClick={termText => {
              const bow = data?.selectedBow?.top_terms?.find(t => t.term === termText);
              const term = buildTerm(termText, 'ngram', bow?.score, bow?.rank);
              setSelectedTerm(prev => prev?.text === termText ? null : term);
            }}
          />
          <div className="mt-2 pt-3 border-t border-ink-700/40 text-xs text-fog text-center">
            Cada nodo es un término · cada arista conecta palabras que aparecen juntas en un bigrama · el grosor indica la frecuencia de co-ocurrencia
          </div>
        </ChartCard>
      )}
    </>
  );
};
