/**
 * Pestana Comparar: BoW frente a TF-IDF sobre los terminos en comun.
 */

import React from 'react';
import type { VectorizationDashboardData } from '../../../services/dashboardService';
import { ChartCard } from '../../molecules';
import type { SelectedTerm } from './types';
import { DashboardGrid } from '../index';
import { ComparacionView } from './ComparacionView';
import type { ComparacionItem } from './types';

export interface CompareSectionProps {
  activeSection: string;
  data: VectorizationDashboardData | null;
  isLoading: boolean;
  refetch: () => void;
  comparacionData: ComparacionItem[];
  selectedTerm: SelectedTerm | null;
  setSelectedTerm: React.Dispatch<React.SetStateAction<SelectedTerm | null>>;
  buildTerm: (text: string, source: SelectedTerm['source'], bowScore?: number, bowRank?: number) => SelectedTerm;
}

export const CompareSection: React.FC<CompareSectionProps> = ({
  activeSection, data, isLoading, refetch, comparacionData,
  selectedTerm, setSelectedTerm, buildTerm,
}) => {
  return (
    <>
      {activeSection === 'compare' && (
        <DashboardGrid columns={1} gap="lg">
          <ChartCard
            title="Comparar BoW vs TF-IDF"
            subtitle={`${comparacionData.length} términos en común — barras comparativas de frecuencia y relevancia`}
            accentColor="cyan"
            size="xl"
            downloadable
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>}
            onRefreshClick={() => refetch()}
            isLoading={isLoading}
          >
            <ComparacionView
              items={comparacionData}
              onTermClick={termText => {
                const bow = data?.selectedBow?.top_terms?.find(t => t.term === termText);
                const term = buildTerm(termText, 'bow', bow?.score, bow?.rank);
                setSelectedTerm(prev => prev?.text === termText ? null : term);
              }}
              selectedTerm={selectedTerm?.text ?? null}
            />
          </ChartCard>
        </DashboardGrid>
      )}
    </>
  );
};
