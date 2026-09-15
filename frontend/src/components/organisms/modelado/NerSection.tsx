/**
 * Sub-pestana NER: entidades reconocidas, su frecuencia y su red de
 * co-ocurrencia.
 */

import React from 'react';
import { ResponsiveNetwork } from '@nivo/network';
import type { ModelingDashboardData } from '../../../services/dashboardService';
import { ChartCard } from '../../molecules';
import { DonutChartViz } from '../index';
import { CompactMetric } from './CompactMetric';
import { DashboardGrid } from '../index';
import { EntityList } from './EntityList';
import { EntityFrequencyChart } from './EntityFrequencyChart';
import { ENTITY_BADGE_COLORS } from './badges';

export interface NerSectionProps {
  activeSubTab: string;
  data: ModelingDashboardData | null;
  isLoading: boolean;
  refetch: (opts?: { resetSelections?: boolean }) => void;
  entityTypes: string[];
  nerEntities: any[];
  filteredNerEntities: any[];
  nerNetworkData: any;
  selectedEntityType: string | null;
  setSelectedEntityType: React.Dispatch<React.SetStateAction<string | null>>;
}

export const NerSection: React.FC<NerSectionProps> = ({
  activeSubTab, data, isLoading, refetch, entityTypes, nerEntities,
  filteredNerEntities, nerNetworkData, selectedEntityType, setSelectedEntityType,
}) => {
  return (
    <>
      {activeSubTab === 'ner' && !data?.selectedNer && (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl bg-ink-850/30 border border-ink-700/50 text-center">
          <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <p className="text-haze text-sm">Sin análisis NER para este dataset.</p>
          <p className="text-mist text-xs mt-1">Crea uno desde Administración › NER.</p>
        </div>
      )}
      {activeSubTab === 'ner' && data?.selectedNer && (
        <>
          {/* NER Quality KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CompactMetric
              label="Documentos analizados"
              value={data.selectedNer.documents_processed}
            />
            <CompactMetric
              label="Entidades únicas"
              value={data.selectedNer.unique_entities_count}
            />
            <CompactMetric
              label="Total entidades"
              value={data.selectedNer.total_entities_found}
            />
            <CompactMetric
              label="Modelo spaCy"
              value={data.selectedNer.spacy_model_label || data.selectedNer.spacy_model}
            />
          </div>

          {/* NER Charts — donut + top entities by type */}
          <DashboardGrid columns={2} gap="lg">
            <ChartCard
              title="Distribución de entidades"
              subtitle={data.selectedNer.name}
              accentColor="purple"
              size="lg"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                </svg>
              }
              onRefreshClick={() => refetch()}
              isLoading={isLoading}
            >
              <div className="h-[280px]">
                {data.entityDistribution && data.entityDistribution.length > 0 ? (
                  <DonutChartViz
                    data={data.entityDistribution}
                    chartId="entity-distribution"
                    centerValue={
                      selectedEntityType
                        ? (data.entityDistribution.find(e => e.id === selectedEntityType)?.value ?? 0)
                        : data.entityDistribution.reduce((sum, e) => sum + e.value, 0)
                    }
                    centerLabel={selectedEntityType ?? 'entidades'}
                    activeSegments={selectedEntityType ? [selectedEntityType] : []}
                    skipCrossFilter
                    onSegmentClick={(datum) => {
                      setSelectedEntityType(prev => prev === datum.id ? null : datum.id);
                    }}
                    onClearFilter={() => setSelectedEntityType(null)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-mist text-sm">
                    No hay datos de entidades
                  </div>
                )}
              </div>
            </ChartCard>

            <ChartCard
              title="Entidades principales por tipo"
              subtitle="Entidades más frecuentes"
              accentColor="blue"
              size="lg"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              }
            >
              <div className="h-[280px] overflow-y-auto">
                {entityTypes.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {entityTypes.slice(0, 6).map((type) => (
                      <EntityList
                        key={type}
                        entityType={type}
                        entities={data.topEntitiesByType[type]}
                        maxItems={4}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-mist text-sm">
                    No hay entidades disponibles
                  </div>
                )}
              </div>
            </ChartCard>
          </DashboardGrid>

          {/* NER — Top 20 entidades por frecuencia (filtrado por tipo al hacer click en el donut) */}
          {nerEntities.length > 0 && (
            <ChartCard
              title="Frecuencia de entidades"
              subtitle={
                selectedEntityType
                  ? `Filtrando por tipo: ${selectedEntityType} — ${filteredNerEntities.length} entidades`
                  : `Top ${Math.min(nerEntities.length, 20)} entidades más frecuentes — haz click en el donut para filtrar`
              }
              accentColor="purple"
              size="lg"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            >
              <div className="p-2">
                {selectedEntityType && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 text-xs rounded border ${ENTITY_BADGE_COLORS[selectedEntityType] || ENTITY_BADGE_COLORS.default}`}>
                      {selectedEntityType}
                    </span>
                    <span className="text-sm text-haze">
                      {filteredNerEntities.length} entidades encontradas
                    </span>
                    <button
                      onClick={() => setSelectedEntityType(null)}
                      className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-haze bg-ink-800/50 hover:bg-ink-700/50 rounded-lg border border-ink-600/50 transition-colors min-h-[32px]"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Ver todos
                    </button>
                  </div>
                )}
                <EntityFrequencyChart entities={filteredNerEntities} />
              </div>
            </ChartCard>
          )}

          {/* VIZ-4: NER Co-occurrence Network */}
          {nerNetworkData && (
            <ChartCard
              title="Red de co-ocurrencia de entidades"
              subtitle={`Top 25 pares — grosor del enlace proporcional a la frecuencia de co-ocurrencia`}
              accentColor="blue"
              size="lg"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              }
            >
              <div style={{ height: '380px' }}>
                <ResponsiveNetwork
                  data={nerNetworkData as any}
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                  linkDistance={(e: any) => e.distance}
                  centeringStrength={0.3}
                  repulsivity={6}
                  nodeSize={(n: any) => n.size}
                  activeNodeSize={(n: any) => n.size * 1.4}
                  nodeColor={(n: any) => n.color}
                  nodeBorderWidth={1}
                  nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] } as any}
                  linkThickness={(l: any) => l.thickness}
                  motionConfig="gentle"
                  theme={{
                    tooltip: { container: { background: '#1e293b', color: '#f8fafc', fontSize: 12, borderRadius: '8px', border: '1px solid #334155' } },
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-3 px-3 pb-3">
                {Object.entries({ PERSON: '#3b82f6', ORG: '#10b981', GPE: '#f59e0b', LOC: '#8b5cf6', DATE: '#ec4899' }).map(([label, color]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs text-mist">{label}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </>
      )}
    </>
  );
};
