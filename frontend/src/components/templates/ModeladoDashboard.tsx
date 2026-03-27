/**
 * ModeladoDashboard - Modeling visualization dashboard
 *
 * Displays NLP modeling analysis results:
 * - NER entity distribution and top entities
 * - Topic Modeling visualization
 * - BERTopic clusters
 */

import React, { useState, useEffect } from 'react';
import { DashboardGrid, MetricCardDark, DonutChartViz } from '../organisms';
import { ChartCard } from '../molecules';
import dashboardService from '../../services/dashboardService';
import type { ModelingDashboardData } from '../../services/dashboardService';
import { useFilter } from '../../contexts/FilterContext';

// Entity Type Badge Colors
const ENTITY_BADGE_COLORS: Record<string, string> = {
  PERSON: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ORG: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  GPE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  LOC: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  DATE: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  MONEY: 'bg-green-500/20 text-green-400 border-green-500/30',
  EVENT: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  PRODUCT: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  default: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

// Topic Card Component
interface TopicCardProps {
  topic: {
    id: number;
    label: string;
    words: Array<{ word: string; weight: number }>;
    documentCount: number;
  };
  accentColor: string;
}

const TopicCard: React.FC<TopicCardProps> = ({ topic, accentColor }) => {
  const colorClasses: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
    purple: 'from-purple-500/20 to-violet-500/20 border-purple-500/30',
    cyan: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30',
    amber: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
  };

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${colorClasses[accentColor] || colorClasses.emerald} border`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white">{topic.label || `Topic ${topic.id}`}</h4>
        <span className="text-xs text-slate-400">{topic.documentCount} docs</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {topic.words.slice(0, 8).map((word, i) => (
          <span
            key={word.word}
            className="px-2 py-0.5 text-xs rounded-full bg-slate-800/50 text-slate-300"
            style={{ opacity: 1 - i * 0.08 }}
          >
            {word.word}
          </span>
        ))}
      </div>
    </div>
  );
};

// Entity List Component
interface EntityListProps {
  entities: Array<{ text: string; frequency: number }>;
  entityType: string;
  maxItems?: number;
}

const EntityList: React.FC<EntityListProps> = ({ entities, entityType, maxItems = 5 }) => {
  const badgeClass = ENTITY_BADGE_COLORS[entityType] || ENTITY_BADGE_COLORS.default;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 text-xs rounded border ${badgeClass}`}>
          {entityType}
        </span>
        <span className="text-xs text-slate-500">{entities.length} entidades</span>
      </div>
      <div className="space-y-1">
        {entities.slice(0, maxItems).map((entity) => (
          <div key={entity.text} className="flex items-center justify-between text-sm">
            <span className="text-slate-300 truncate">{entity.text}</span>
            <span className="text-slate-500">{entity.frequency}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ModeladoDashboard: React.FC = () => {
  const [data, setData] = useState<ModelingDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { filters, setSelectedNer, setSelectedTopicModel, setSelectedBertopic } = useFilter();

  // Fetch data when selected dataset or any analysis selection changes
  useEffect(() => {
    if (filters.selectedDatasetId) {
      fetchData(
        filters.selectedDatasetId,
        filters.selectedNerId,
        filters.selectedTopicModelId,
        filters.selectedBertopicId,
      );
    } else {
      setData(null);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.selectedDatasetId, filters.selectedNerId, filters.selectedTopicModelId, filters.selectedBertopicId]);

  const fetchData = async (
    datasetId: number,
    nerId?: number | null,
    topicId?: number | null,
    bertopicId?: number | null,
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await dashboardService.getModelingData(datasetId, nerId, topicId, bertopicId);
      setData(result);
      // Auto-select first completed analysis alphabetically if no ID explicitly chosen
      if (!nerId) {
        const first = result.nerAnalyses.find(a => a.status === 'completed');
        if (first) setSelectedNer(first.id);
      }
      if (!topicId) {
        const first = result.topicModelingAnalyses.find(a => a.status === 'completed');
        if (first) setSelectedTopicModel(first.id);
      }
      if (!bertopicId) {
        const first = result.bertopicAnalyses.find(a => a.status === 'completed');
        if (first) setSelectedBertopic(first.id);
      }
    } catch (err) {
      setError('Error al cargar los datos de modelado');
      console.error('Modeling dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // No dataset selected state
  if (!filters.selectedDatasetId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Selecciona un Dataset</h3>
          <p className="text-slate-400 text-sm max-w-md">
            Usa el selector de Dataset en el panel lateral izquierdo para visualizar los análisis de modelado.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Cargando análisis de modelado...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-slate-300 mb-4">{error}</p>
          <button
            onClick={() => filters.selectedDatasetId && fetchData(
              filters.selectedDatasetId,
              filters.selectedNerId,
              filters.selectedTopicModelId,
              filters.selectedBertopicId,
            )}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const hasAnyData =
    (data?.nerAnalyses?.length || 0) > 0 ||
    (data?.topicModelingAnalyses?.length || 0) > 0 ||
    (data?.bertopicAnalyses?.length || 0) > 0;

  // No analyses available
  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Modelado</h2>
          <p className="text-slate-400 text-sm mt-1">
            Análisis de NER, Modelado de Temas y BERTopic
          </p>
        </div>

        <div className="p-8 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Sin Análisis de Modelado</h3>
            <p className="text-slate-400 max-w-md mx-auto mb-6">
              No se han encontrado análisis de modelado para este dataset.
              Crea un análisis NER, Modelado de Temas o BERTopic desde la sección de Administración.
            </p>
            <a
              href="/admin/ner"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Análisis
            </a>
          </div>
        </div>
      </div>
    );
  }

  const entityTypes = Object.keys(data?.topEntitiesByType || {});

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Modelado</h2>
          <p className="text-slate-400 text-sm mt-1">
            Análisis de NER, Modelado de Temas y BERTopic
          </p>
        </div>
      </div>

      {/* Analysis Selector Bar */}
      {(
        (data?.nerAnalyses?.length ?? 0) > 1 ||
        (data?.topicModelingAnalyses?.length ?? 0) > 1 ||
        (data?.bertopicAnalyses?.length ?? 0) > 1
      ) && (
        <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
          {(data?.nerAnalyses?.length ?? 0) > 1 && (
            <div className="flex items-center gap-2 min-w-[200px] flex-1">
              <span className="text-xs text-slate-400 whitespace-nowrap font-medium">NER:</span>
              <select
                value={filters.selectedNerId ?? data?.selectedNer?.id ?? ''}
                onChange={e => setSelectedNer(Number(e.target.value))}
                className="flex-1 bg-slate-900/70 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 cursor-pointer"
              >
                {data?.nerAnalyses.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          {(data?.topicModelingAnalyses?.length ?? 0) > 1 && (
            <div className="flex items-center gap-2 min-w-[200px] flex-1">
              <span className="text-xs text-slate-400 whitespace-nowrap font-medium">Modelo de Tema:</span>
              <select
                value={filters.selectedTopicModelId ?? data?.selectedTopicModeling?.id ?? ''}
                onChange={e => setSelectedTopicModel(Number(e.target.value))}
                className="flex-1 bg-slate-900/70 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 cursor-pointer"
              >
                {data?.topicModelingAnalyses.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          {(data?.bertopicAnalyses?.length ?? 0) > 1 && (
            <div className="flex items-center gap-2 min-w-[200px] flex-1">
              <span className="text-xs text-slate-400 whitespace-nowrap font-medium">BERTopic:</span>
              <select
                value={filters.selectedBertopicId ?? data?.selectedBertopic?.id ?? ''}
                onChange={e => setSelectedBertopic(Number(e.target.value))}
                className="flex-1 bg-slate-900/70 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 cursor-pointer"
              >
                {data?.bertopicAnalyses.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* KPI Metrics Row */}
      <DashboardGrid columns={4} gap="md">
        <MetricCardDark
          title="Análisis NER"
          value={data?.nerAnalyses?.length || 0}
          subtitle="Reconocimiento de entidades"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
          accentColor="purple"
        />

        <MetricCardDark
          title="Modelos de Temas"
          value={data?.topicModelingAnalyses?.length || 0}
          subtitle="Modelos LSA/NMF/LDA"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
          accentColor="emerald"
        />

        <MetricCardDark
          title="BERTopic"
          value={data?.bertopicAnalyses?.length || 0}
          subtitle="Modelos transformer"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          accentColor="amber"
        />

        <MetricCardDark
          title="Tipos de Entidad"
          value={entityTypes.length || '—'}
          subtitle="Categorías NER"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          accentColor="cyan"
        />
      </DashboardGrid>

      {/* NER Section */}
      {data?.selectedNer && (
        <DashboardGrid columns={2} gap="lg">
          {/* Entity Distribution Donut */}
          <ChartCard
            title="Distribución de Entidades"
            subtitle={data.selectedNer.name}
            accentColor="purple"
            size="lg"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
            onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId, filters.selectedNerId, filters.selectedTopicModelId, filters.selectedBertopicId)}
            isLoading={isLoading}
          >
            <div className="h-[280px]">
              {data.entityDistribution && data.entityDistribution.length > 0 ? (
                <DonutChartViz
                  data={data.entityDistribution}
                  chartId="entity-distribution"
                  centerValue={data.entityDistribution.reduce((sum, e) => sum + e.value, 0)}
                  centerLabel="entidades"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  No hay datos de entidades
                </div>
              )}
            </div>
          </ChartCard>

          {/* Top Entities by Type */}
          <ChartCard
            title="Top Entidades por Tipo"
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
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  No hay entidades disponibles
                </div>
              )}
            </div>
          </ChartCard>
        </DashboardGrid>
      )}

      {/* Topic Modeling Section */}
      {data?.selectedTopicModeling && data.topics && data.topics.length > 0 && (
        <ChartCard
          title="Temas Identificados"
          subtitle={`${data.selectedTopicModeling.name} - ${data.topics.length} temas`}
          accentColor="emerald"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
            {data.topics.slice(0, 9).map((topic, i) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                accentColor={['emerald', 'purple', 'cyan', 'amber'][i % 4]}
              />
            ))}
          </div>
        </ChartCard>
      )}

      {/* Topic Distribution */}
      {data?.topicDistribution && data.topicDistribution.length > 0 && (
        <ChartCard
          title="Distribución de Temas"
          subtitle="Documentos por tema"
          accentColor="cyan"
          size="md"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        >
          <div className="h-[200px]">
            <DonutChartViz
              data={data.topicDistribution}
              chartId="topic-distribution"
              centerValue={data.topicDistribution.reduce((sum, t) => sum + t.value, 0)}
              centerLabel="docs"
            />
          </div>
        </ChartCard>
      )}

      {/* BERTopic Section */}
      {data?.selectedBertopic && data.bertopicClusters && data.bertopicClusters.length > 0 && (
        <ChartCard
          title="Clústeres BERTopic"
          subtitle={`${data.bertopicClusters.length} clústeres identificados`}
          accentColor="amber"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
            {data.bertopicClusters.slice(0, 9).map((cluster) => (
              <div
                key={cluster.topicId}
                className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white">
                    {cluster.label || `Clúster ${cluster.topicId}`}
                  </h4>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                    {cluster.numDocuments} docs
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {cluster.words.slice(0, 6).map((word, j) => (
                    <span
                      key={word.word}
                      className="px-2 py-0.5 text-xs rounded-full bg-slate-800/50 text-slate-300"
                      style={{ opacity: 1 - j * 0.1 }}
                    >
                      {word.word}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Analysis Selectors */}
      {((data?.nerAnalyses?.length || 0) > 1 || (data?.topicModelingAnalyses?.length || 0) > 1 || (data?.bertopicAnalyses?.length || 0) > 1) && (
        <ChartCard
          title="Selección de Análisis"
          subtitle="Elige qué análisis visualizar"
          accentColor="blue"
          size="sm"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          }
        >
          <div className="grid grid-cols-3 gap-4 p-2">
            {/* NER Selector */}
            {data?.nerAnalyses && data.nerAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">NER</label>
                <select
                  value={filters.selectedNerId || ''}
                  onChange={(e) => setSelectedNer(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  <option value="">Más reciente</option>
                  {data.nerAnalyses.map((ner) => (
                    <option key={ner.id} value={ner.id}>
                      {ner.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Topic Modeling Selector */}
            {data?.topicModelingAnalyses && data.topicModelingAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Modelado de Temas</label>
                <select
                  value={filters.selectedTopicModelId || ''}
                  onChange={(e) => setSelectedTopicModel(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  <option value="">Más reciente</option>
                  {data.topicModelingAnalyses.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* BERTopic Selector */}
            {data?.bertopicAnalyses && data.bertopicAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">BERTopic</label>
                <select
                  value={filters.selectedBertopicId || ''}
                  onChange={(e) => setSelectedBertopic(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  <option value="">Más reciente</option>
                  {data.bertopicAnalyses.map((bt) => (
                    <option key={bt.id} value={bt.id}>
                      {bt.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </ChartCard>
      )}
    </div>
  );
};
