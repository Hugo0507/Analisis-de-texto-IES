/**
 * Sub-pestana BERTopic: clusteres, distribucion y proyeccion 2D.
 */

import React from 'react';
import type { ModelingDashboardData } from '../../../services/dashboardService';
import { ChartCard } from '../../molecules';
import { DonutChartViz } from '../index';
import { CompactMetric } from './CompactMetric';
import { BertopicClusterCard } from './BertopicClusterCard';
import { coherenceBadgeClass, outliersBadgeClass } from './badges';
import { ScatterPlotProjection } from '../ScatterPlotProjection';
import type { Projections2D } from '../../../services/bertopicService';

export interface BertopicSectionProps {
  activeSubTab: string;
  data: ModelingDashboardData | null;
  isLoading: boolean;
  refetch: (opts?: { resetSelections?: boolean }) => void;
  bertopicDistData: Array<{ id: string; label: string; value: number; color?: string }>;
  bertopicDocsProcessed: number;
  showAllClusters: boolean;
  setShowAllClusters: React.Dispatch<React.SetStateAction<boolean>>;
}

export const BertopicSection: React.FC<BertopicSectionProps> = ({
  activeSubTab, data, isLoading, refetch, bertopicDistData,
  bertopicDocsProcessed, showAllClusters, setShowAllClusters,
}) => {
  return (
    <>
      {activeSubTab === 'bertopic' && !data?.selectedBertopic && (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl bg-ink-850/30 border border-ink-700/50 text-center">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-haze text-sm">Sin análisis BERTopic para este dataset.</p>
          <p className="text-mist text-xs mt-1">Crea uno desde Administración › BERTopic.</p>
        </div>
      )}
      {activeSubTab === 'bertopic' && data?.selectedBertopic && data.bertopicClusters && data.bertopicClusters.length > 0 && (
        <>
          {/* BERTopic Quality KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CompactMetric
              label="Coherencia (C_V)"
              value={data.selectedBertopic.coherence_score !== null
                ? data.selectedBertopic.coherence_score.toFixed(4)
                : '—'}
              badge={data.selectedBertopic.coherence_score !== null
                ? (data.selectedBertopic.coherence_score > 0.5 ? 'Buena' : data.selectedBertopic.coherence_score > 0.3 ? 'Media' : 'Baja')
                : undefined}
              badgeClass={coherenceBadgeClass(data.selectedBertopic.coherence_score)}
            />
            <CompactMetric
              label="Outliers (ruido)"
              value={data.selectedBertopic.num_outliers}
              badge={bertopicDocsProcessed > 0
                ? `${((data.selectedBertopic.num_outliers / bertopicDocsProcessed) * 100).toFixed(1)}%`
                : undefined}
              badgeClass={outliersBadgeClass(data.selectedBertopic.num_outliers, bertopicDocsProcessed)}
            />
            <CompactMetric
              label="Clústeres encontrados"
              value={data.selectedBertopic.num_topics_found}
            />
            <CompactMetric
              label="Documentos"
              value={bertopicDocsProcessed}
            />
          </div>

          {/* BERTopic Clusters Grid */}
          <ChartCard
            title="Clústeres BERTopic"
            subtitle={`${data.selectedBertopic.name} — ${data.bertopicClusters.length} clústeres`}
            accentColor="amber"
            size="lg"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            onRefreshClick={() => refetch({ resetSelections: true })}
            isLoading={isLoading}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
              {data.bertopicClusters.slice(0, showAllClusters ? data.bertopicClusters.length : 9).map((cluster) => (
                <BertopicClusterCard key={cluster.topicId} cluster={cluster} />
              ))}
            </div>
            {data.bertopicClusters.length > 9 && (
              <div className="flex justify-center pt-1 pb-2">
                <button
                  onClick={() => setShowAllClusters(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors"
                >
                  {showAllClusters ? (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>Ver menos</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>Ver todos los {data.bertopicClusters.length} clústeres</>
                  )}
                </button>
              </div>
            )}
          </ChartCard>

          {/* BERTopic Distribution Donut */}
          {bertopicDistData.length > 0 && (
            <ChartCard
              title="Distribución de Clústeres"
              subtitle="Documentos por clúster BERTopic"
              accentColor="amber"
              size="md"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              }
            >
              <div className="h-[220px]">
                <DonutChartViz
                  data={bertopicDistData}
                  chartId="bertopic-distribution"
                  centerValue={bertopicDistData.reduce((sum, t) => sum + t.value, 0)}
                  centerLabel="docs"
                  skipCrossFilter
                />
              </div>
            </ChartCard>
          )}

          {/* Science Map — UMAP projection */}
          {(() => {
            const proj = data.selectedBertopic!.projections_2d as Projections2D | null | Record<string, never>;
            const umapPoints = (proj as Projections2D)?.umap;
            if (!umapPoints || umapPoints.length === 0) return null;
            return (
              <ChartCard
                title="Mapa de Ciencia del Corpus"
                subtitle="Proyección UMAP — cada punto es un documento"
                accentColor="amber"
                size="lg"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                <div className="px-2 pb-2">
                  <p className="text-xs text-mist mb-3">
                    Los documentos cercanos tratan temas similares. El color indica el tema dominante asignado.
                  </p>
                  <ScatterPlotProjection
                    projections={proj as Projections2D}
                    fixedMethod="umap"
                    dark
                  />
                </div>
              </ChartCard>
            );
          })()}
        </>
      )}
    </>
  );
};
