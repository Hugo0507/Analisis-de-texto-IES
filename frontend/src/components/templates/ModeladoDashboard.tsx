/**
 * ModeladoDashboard - Modeling visualization dashboard
 *
 * Displays NLP modeling analysis results:
 * - NER entity distribution, top entities, frequency bar chart
 * - Topic Modeling visualization with word weight bars + quality KPIs
 * - BERTopic clusters with word weight bars, distribution donut, quality KPIs
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveNetwork } from '@nivo/network';
import { DashboardGrid, MetricCardDark, DonutChartViz } from '../organisms';
import { ChartCard } from '../molecules';
import { ScatterPlotProjection } from '../organisms/ScatterPlotProjection';
import dashboardService from '../../services/dashboardService';
import type { ModelingDashboardData } from '../../services/dashboardService';
import { useFilter } from '../../contexts/FilterContext';
import type { Projections2D } from '../../services/bertopicService';
import publicTopicModelingService from '../../services/publicTopicModelingService';
import type { CoherenceComparisonItem } from '../../services/publicTopicModelingService';
import { ContextTooltip } from '../atoms';

// ---------------------------------------------------------------------------
// Color helpers & constants
// ---------------------------------------------------------------------------

const ENTITY_BADGE_COLORS: Record<string, string> = {
  PERSON: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  ORG: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  GPE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  LOC: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  DATE: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  MONEY: 'bg-green-500/15 text-green-300 border-green-500/30',
  EVENT: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  PRODUCT: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  default: 'bg-slate-600/30 text-slate-300 border-slate-500/30',
};

const ALGORITHM_BADGE_COLORS: Record<string, string> = {
  lda: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  nmf: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  lsa: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  plsa: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

const TOPIC_CARD_COLORS: Record<string, { gradient: string; bar: string }> = {
  emerald: { gradient: 'from-emerald-500/15 to-teal-500/15 border-emerald-500/30', bar: 'bg-emerald-400' },
  purple:  { gradient: 'from-purple-500/15 to-violet-500/15 border-purple-500/30', bar: 'bg-purple-400' },
  cyan:    { gradient: 'from-cyan-500/15 to-blue-500/15 border-cyan-500/30',       bar: 'bg-cyan-400' },
  amber:   { gradient: 'from-amber-500/15 to-orange-500/15 border-amber-500/30',   bar: 'bg-amber-400' },
};

const coherenceBadgeClass = (score: number | null): string => {
  if (score === null) return 'bg-slate-600/30 text-slate-300 border-slate-500/30';
  if (score > 0.5) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (score > 0.3) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
};

const outliersBadgeClass = (num_outliers: number, docs: number): string => {
  if (docs === 0) return 'bg-slate-600/30 text-slate-300 border-slate-500/30';
  return num_outliers / docs > 0.2
    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    : 'bg-slate-600/30 text-slate-300 border-slate-500/30';
};

// ---------------------------------------------------------------------------
// Compact quality metric card (smaller than MetricCardDark)
// ---------------------------------------------------------------------------

interface CompactMetricProps {
  label: string;
  value: string | number;
  badge?: string;
  badgeClass?: string;
  contextKey?: string;
}

const CompactMetric: React.FC<CompactMetricProps> = ({ label, value, badge, badgeClass, contextKey }) => (
  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
    <div className="flex items-center gap-1 mb-1">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      {contextKey && <ContextTooltip contextKey={contextKey} />}
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xl font-bold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      {badge !== undefined && badgeClass && (
        <span className={`px-2 py-0.5 text-xs rounded border ${badgeClass}`}>{badge}</span>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Topic Card — word weight bars replace opacity trick
// ---------------------------------------------------------------------------

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
  const colors = TOPIC_CARD_COLORS[accentColor] || TOPIC_CARD_COLORS.emerald;
  const maxWeight = Math.max(...topic.words.map(w => w.weight), 0.001);

  return (
    <div className={`p-4 rounded-xl bg-gradient-to-br ${colors.gradient} border`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white truncate pr-2">
          {topic.label || `Tópico ${topic.id}`}
        </h4>
        <span className="text-xs text-slate-300 shrink-0">{topic.documentCount} docs</span>
      </div>
      <div className="space-y-1.5">
        {topic.words.slice(0, 8).map((word) => {
          const barPct = Math.round((word.weight / maxWeight) * 100);
          return (
            <div key={word.word} className="flex items-center gap-2">
              <span className="text-xs text-slate-300 w-20 truncate shrink-0">{word.word}</span>
              <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.bar} rounded-full`}
                  style={{ width: `${barPct}%`, opacity: 0.8 }}
                />
              </div>
              <span className="text-xs text-slate-400 w-10 text-right shrink-0">
                {word.weight.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// BERTopic Cluster Card — word weight bars
// ---------------------------------------------------------------------------

interface BertopicClusterCardProps {
  cluster: {
    topicId: number;
    label: string;
    words: Array<{ word: string; weight: number }>;
    numDocuments: number;
  };
}

const BertopicClusterCard: React.FC<BertopicClusterCardProps> = ({ cluster }) => {
  const maxWeight = Math.max(...cluster.words.map(w => w.weight), 0.001);
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white truncate pr-2">
          {cluster.label || `Clúster ${cluster.topicId}`}
        </h4>
        <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300">
          {cluster.numDocuments} docs
        </span>
      </div>
      <div className="space-y-1.5">
        {cluster.words.slice(0, 6).map((word) => {
          const barPct = Math.round((word.weight / maxWeight) * 100);
          return (
            <div key={word.word} className="flex items-center gap-2">
              <span className="text-xs text-slate-300 w-20 truncate shrink-0">{word.word}</span>
              <div className="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${barPct}%`, opacity: 0.8 }}
                />
              </div>
              <span className="text-xs text-slate-400 w-10 text-right shrink-0">
                {word.weight.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Entity List (existing — minor color update)
// ---------------------------------------------------------------------------

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
        <span className={`px-2 py-0.5 text-xs rounded border ${badgeClass}`}>{entityType}</span>
        <span className="text-xs text-slate-400">{entities.length} entidades</span>
      </div>
      <div className="space-y-1">
        {entities.slice(0, maxItems).map((entity) => (
          <div key={entity.text} className="flex items-center justify-between text-sm">
            <span className="text-slate-300 truncate">{entity.text}</span>
            <span className="text-slate-400">{entity.frequency}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Entity Frequency Bar Chart (CSS horizontal bars, top-20 by frequency)
// ---------------------------------------------------------------------------

interface EntityFrequencyChartProps {
  entities: Array<{ text: string; label: string; frequency: number }>;
}

const EntityFrequencyChart: React.FC<EntityFrequencyChartProps> = ({ entities }) => {
  const top20 = [...entities].sort((a, b) => b.frequency - a.frequency).slice(0, 20);
  const maxFreq = top20[0]?.frequency || 1;

  if (top20.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        No hay datos de frecuencia
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: '340px' }}>
      {top20.map((entity, i) => {
        const badgeClass = ENTITY_BADGE_COLORS[entity.label] || ENTITY_BADGE_COLORS.default;
        const barPct = Math.round((entity.frequency / maxFreq) * 100);
        return (
          <div key={`${entity.text}-${entity.label}-${i}`} className="flex items-center gap-2">
            <span className={`text-xs px-1.5 py-0.5 rounded border ${badgeClass} shrink-0 w-14 text-center`}>
              {entity.label}
            </span>
            <span className="text-sm text-slate-300 truncate w-28 shrink-0">{entity.text}</span>
            <div className="flex-1 h-4 bg-slate-700/50 rounded overflow-hidden">
              <div className="h-full bg-purple-500/60 rounded" style={{ width: `${barPct}%` }} />
            </div>
            <span className="text-sm text-slate-300 w-10 text-right shrink-0">{entity.frequency}</span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const ModeladoDashboard: React.FC = () => {
  const [data, setData] = useState<ModelingDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'ner' | 'topics' | 'bertopic'>('ner');
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [showAllClusters, setShowAllClusters] = useState(false);
  const [coherenceComparison, setCoherenceComparison] = useState<CoherenceComparisonItem[]>([]);
  const [pcaHovered, setPcaHovered] = useState<number | null>(null);
  const { filters, setSelectedNer, setSelectedTopicModel, setSelectedBertopic } = useFilter();

  // Reset entity type filter when the NER selection changes
  useEffect(() => {
    setSelectedEntityType(null);
  }, [filters.selectedNerId, filters.selectedDatasetId]);

  useEffect(() => {
    if (filters.selectedDatasetId) {
      fetchData(
        filters.selectedDatasetId,
        filters.selectedNerId,
        filters.selectedTopicModelId,
        filters.selectedBertopicId,
      );
      publicTopicModelingService.getCoherenceComparison(filters.selectedDatasetId)
        .then(setCoherenceComparison)
        .catch(() => setCoherenceComparison([]));
    } else {
      setData(null);
      setCoherenceComparison([]);
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

  // VIZ-4: NER co-occurrence network data (must be before early returns — hook rule)
  const nerNetworkData = useMemo(() => {
    const cooccs = data?.selectedNer?.cooccurrences || [];
    if (cooccs.length === 0) return null;
    const top = [...cooccs].sort((a, b) => b.cooccurrence_count - a.cooccurrence_count).slice(0, 25);
    const nodeMap = new Map<string, { freq: number; label: string }>();
    top.forEach(c => {
      const e1 = c.entity1.text, e2 = c.entity2.text;
      nodeMap.set(e1, { freq: (nodeMap.get(e1)?.freq || 0) + c.cooccurrence_count, label: c.entity1.label });
      nodeMap.set(e2, { freq: (nodeMap.get(e2)?.freq || 0) + c.cooccurrence_count, label: c.entity2.label });
    });
    const maxFreq = Math.max(...Array.from(nodeMap.values()).map(v => v.freq)) || 1;
    const maxCount = Math.max(...top.map(c => c.cooccurrence_count)) || 1;
    const EC: Record<string, string> = { PERSON: '#3b82f6', ORG: '#10b981', GPE: '#f59e0b', LOC: '#8b5cf6', DATE: '#ec4899', default: '#64748b' };
    const nodes = Array.from(nodeMap.entries()).map(([id, val]) => ({
      id,
      size: 8 + (val.freq / maxFreq) * 18,
      color: EC[val.label] || EC.default,
    }));
    const links = top.map(c => ({
      source: c.entity1.text,
      target: c.entity2.text,
      distance: 60 + (1 - c.cooccurrence_count / maxCount) * 70,
      thickness: 1 + (c.cooccurrence_count / maxCount) * 4,
    }));
    return { nodes, links };
  }, [data?.selectedNer?.cooccurrences]);

  // ------- Empty / loading / error states (unchanged) --------

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
          <p className="text-slate-300 text-sm max-w-md">
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
          <p className="text-slate-300 text-sm">Cargando análisis de modelado...</p>
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

  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Modelado</h2>
          <p className="text-slate-300 text-sm mt-1">Análisis de NER, Modelado de Temas y BERTopic</p>
        </div>
        <div className="p-8 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Sin Análisis de Modelado</h3>
            <p className="text-slate-300 max-w-md mx-auto mb-6">
              No se han encontrado análisis de modelado para este dataset.
              Crea un análisis NER, Modelado de Temas o BERTopic desde la sección de Administración.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ------- Derived data --------

  const entityTypes = Object.keys(data?.topEntitiesByType || {});

  const nerEntities = data?.selectedNer?.entities || [];
  const filteredNerEntities = selectedEntityType
    ? nerEntities.filter(e => e.label === selectedEntityType)
    : nerEntities;

  const topicAlgorithm = data?.selectedTopicModeling?.algorithm || '';
  const topicAlgorithmDisplay = data?.selectedTopicModeling?.algorithm_display || '';
  const topicAlgorithmBadge = ALGORITHM_BADGE_COLORS[topicAlgorithm] || ALGORITHM_BADGE_COLORS.lda;

  const bertopicDistData = (data?.selectedBertopic?.topic_distribution || []).map((t) => ({
    id: t.topic_label || `Clúster ${t.topic_id}`,
    label: t.topic_label || `Clúster ${t.topic_id}`,
    value: t.count,
  }));

  const bertopicDocsProcessed = data?.selectedBertopic?.documents_processed || 0;

  // ------- Render --------

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-white">Modelado</h2>
        <p className="text-slate-300 text-sm mt-1">Análisis de NER, Modelado de Temas y BERTopic</p>
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
            <div className="flex items-center gap-2 min-w-[220px] flex-1">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-slate-400 whitespace-nowrap font-medium">Modelo de Tema:</span>
                {topicAlgorithmDisplay && (
                  <span className={`px-1.5 py-0.5 text-xs rounded border ${topicAlgorithmBadge}`}>
                    {topicAlgorithmDisplay}
                  </span>
                )}
              </div>
              <select
                value={filters.selectedTopicModelId ?? data?.selectedTopicModeling?.id ?? ''}
                onChange={e => setSelectedTopicModel(Number(e.target.value))}
                className="flex-1 bg-slate-900/70 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 cursor-pointer"
              >
                {data?.topicModelingAnalyses.map(a => (
                  <option key={a.id} value={a.id}>{a.name} [{a.algorithm_display}]</option>
                ))}
              </select>
            </div>
          )}

          {(data?.bertopicAnalyses?.length ?? 0) > 1 && (
            <div className="flex items-center gap-2 min-w-[200px] flex-1">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-slate-400 whitespace-nowrap font-medium">BERTopic:</span>
                {data?.selectedBertopic?.embedding_model_display && (
                  <span className="px-1.5 py-0.5 text-xs rounded border bg-amber-500/15 text-amber-300 border-amber-500/30">
                    {data.selectedBertopic.embedding_model_display}
                  </span>
                )}
              </div>
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

      {/* ── KPI Metrics Row (aggregate counts) ── */}
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
          subtitle="LDA / NMF / LSA / PLSA"
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
          subtitle="Categorías NER activas"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          accentColor="cyan"
        />
      </DashboardGrid>

      {/* ── Sub-tab navigation (QW-3) ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-800/40 border border-slate-700/50">
        {(
          [
            { id: 'ner',      label: 'NER',                count: data?.nerAnalyses?.length ?? 0,                  accentActive: 'bg-purple-500/20 text-white', dot: 'bg-purple-500/25 text-purple-300' },
            { id: 'topics',   label: 'Modelado de Temas',  count: data?.topicModelingAnalyses?.length ?? 0,        accentActive: 'bg-emerald-500/20 text-white', dot: 'bg-emerald-500/25 text-emerald-300' },
            { id: 'bertopic', label: 'BERTopic',           count: data?.bertopicAnalyses?.length ?? 0,             accentActive: 'bg-amber-500/20 text-white', dot: 'bg-amber-500/25 text-amber-300' },
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveSubTab(tab.id); setShowAllTopics(false); setShowAllClusters(false); }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors min-h-[44px] ${
              activeSubTab === tab.id
                ? `${tab.accentActive} shadow-sm`
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSubTab === tab.id ? tab.dot : 'bg-slate-700 text-slate-400'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          NER SECTION
      ════════════════════════════════════════════════════════ */}
      {activeSubTab === 'ner' && !data?.selectedNer && (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl bg-slate-800/30 border border-slate-700/50 text-center">
          <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <p className="text-slate-300 text-sm">Sin análisis NER para este dataset.</p>
          <p className="text-slate-400 text-xs mt-1">Crea uno desde Administración › NER.</p>
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
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    No hay datos de entidades
                  </div>
                )}
              </div>
            </ChartCard>

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
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    No hay entidades disponibles
                  </div>
                )}
              </div>
            </ChartCard>
          </DashboardGrid>

          {/* NER — Top 20 entidades por frecuencia (filtrado por tipo al hacer click en el donut) */}
          {nerEntities.length > 0 && (
            <ChartCard
              title="Frecuencia de Entidades"
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
                    <span className="text-sm text-slate-300">
                      {filteredNerEntities.length} entidades encontradas
                    </span>
                    <button
                      onClick={() => setSelectedEntityType(null)}
                      className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-slate-300 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg border border-slate-600/50 transition-colors min-h-[32px]"
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
              title="Red de Co-ocurrencia de Entidades"
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
                    <span className="text-xs text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          TOPIC MODELING SECTION
      ════════════════════════════════════════════════════════ */}
      {activeSubTab === 'topics' && !data?.selectedTopicModeling && (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl bg-slate-800/30 border border-slate-700/50 text-center">
          <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-slate-300 text-sm">Sin modelos de temas para este dataset.</p>
          <p className="text-slate-400 text-xs mt-1">Crea uno desde Administración › Modelado de Temas.</p>
        </div>
      )}
      {activeSubTab === 'topics' && data?.selectedTopicModeling && data.topics && data.topics.length > 0 && (
        <>
          {/* Topic Modeling Quality KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CompactMetric
              label="Algoritmo"
              value={topicAlgorithmDisplay || '—'}
              badge={topicAlgorithmDisplay || undefined}
              badgeClass={topicAlgorithmBadge}
            />
            <CompactMetric
              label="Coherencia (C_V)"
              value={data.selectedTopicModeling.coherence_score !== null
                ? data.selectedTopicModeling.coherence_score.toFixed(4)
                : '—'}
              badge={data.selectedTopicModeling.coherence_score !== null
                ? (data.selectedTopicModeling.coherence_score > 0.5 ? 'Buena' : data.selectedTopicModeling.coherence_score > 0.3 ? 'Media' : 'Baja')
                : undefined}
              badgeClass={coherenceBadgeClass(data.selectedTopicModeling.coherence_score)}
              contextKey="coherence_score"
            />
            {data.selectedTopicModeling.perplexity_score !== null && (
              <CompactMetric
                label="Perplejidad (LDA)"
                value={data.selectedTopicModeling.perplexity_score.toFixed(2)}
                badge="menor = mejor"
                badgeClass="bg-slate-600/30 text-slate-300 border-slate-500/30"
              />
            )}
            <CompactMetric
              label="Documentos"
              value={data.selectedTopicModeling.documents_processed}
            />
          </div>

          {/* Topics Grid */}
          <ChartCard
            title="Temas Identificados"
            subtitle={`${data.selectedTopicModeling.name} — ${data.topics.length} temas`}
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
              {data.topics.slice(0, showAllTopics ? data.topics.length : 9).map((topic, i) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  accentColor={['emerald', 'purple', 'cyan', 'amber'][i % 4]}
                />
              ))}
            </div>
            {data.topics.length > 9 && (
              <div className="flex justify-center pt-1 pb-2">
                <button
                  onClick={() => setShowAllTopics(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors"
                >
                  {showAllTopics ? (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>Ver menos</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>Ver todos los {data.topics.length} temas</>
                  )}
                </button>
              </div>
            )}
          </ChartCard>

          {/* Topic Distribution Donut */}
          {data.topicDistribution && data.topicDistribution.length > 0 && (
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

          {/* VIZ-5: Coherence elbow plot */}
          {coherenceComparison.filter(c => c.coherence_score !== null).length >= 2 && (() => {
            const withScore = coherenceComparison.filter(c => c.coherence_score !== null);
            const algorithms = [...new Set(withScore.map(c => c.algorithm))];
            const ALG_COLORS: Record<string, string> = { lda: '#10b981', nmf: '#06b6d4', lsa: '#8b5cf6', plsa: '#f59e0b' };
            const sorted = [...withScore].sort((a, b) => a.num_topics - b.num_topics);
            const maxTopics = Math.max(...sorted.map(c => c.num_topics));
            const minTopics = Math.min(...sorted.map(c => c.num_topics));
            const maxScore = Math.max(...sorted.map(c => c.coherence_score!));
            const minScore = Math.min(...sorted.map(c => c.coherence_score!));
            const scoreRange = maxScore - minScore || 1;
            const topicsRange = maxTopics - minTopics || 1;
            const W = 480, H = 200, PAD = { top: 16, right: 16, bottom: 36, left: 50 };
            const chartW = W - PAD.left - PAD.right;
            const chartH = H - PAD.top - PAD.bottom;
            const sx = (t: number) => ((t - minTopics) / topicsRange) * chartW;
            const sy = (s: number) => chartH - ((s - minScore) / scoreRange) * chartH;
            const currentId = data.selectedTopicModeling?.id;
            return (
              <ChartCard
                title="Coherencia vs. Número de Tópicos"
                subtitle="Curva del codo — compara todos los modelos del dataset"
                accentColor="emerald"
                size="md"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                }
              >
                <div className="px-2 pb-2 overflow-x-auto">
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: `${H}px` }}>
                    <g transform={`translate(${PAD.left},${PAD.top})`}>
                      {/* Y axis gridlines + labels */}
                      {[0, 0.25, 0.5, 0.75, 1].map(t => {
                        const scoreVal = minScore + t * scoreRange;
                        const y = sy(scoreVal);
                        return (
                          <g key={t}>
                            <line x1={0} y1={y} x2={chartW} y2={y} stroke="#334155" strokeWidth={1} strokeDasharray="4,3" />
                            <text x={-6} y={y + 4} textAnchor="end" fill="#64748b" fontSize={10}>{scoreVal.toFixed(2)}</text>
                          </g>
                        );
                      })}
                      {/* X axis labels */}
                      {[...new Set(sorted.map(c => c.num_topics))].map(nt => (
                        <text key={nt} x={sx(nt)} y={chartH + 20} textAnchor="middle" fill="#64748b" fontSize={10}>{nt}</text>
                      ))}
                      <text x={chartW / 2} y={chartH + 34} textAnchor="middle" fill="#94a3b8" fontSize={10}>Nº tópicos</text>
                      {/* Lines per algorithm */}
                      {algorithms.map(alg => {
                        const pts = sorted.filter(c => c.algorithm === alg);
                        if (pts.length < 2) return null;
                        const d = pts.map((c, i) => `${i === 0 ? 'M' : 'L'}${sx(c.num_topics)},${sy(c.coherence_score!)}`).join(' ');
                        return <path key={alg} d={d} fill="none" stroke={ALG_COLORS[alg] || '#64748b'} strokeWidth={2} strokeLinecap="round" />;
                      })}
                      {/* Data points */}
                      {sorted.map((c) => {
                        const isCurrent = c.id === currentId;
                        return (
                          <g key={c.id}>
                            <circle cx={sx(c.num_topics)} cy={sy(c.coherence_score!)} r={isCurrent ? 6 : 4}
                              fill={isCurrent ? '#fff' : (ALG_COLORS[c.algorithm] || '#64748b')}
                              stroke={ALG_COLORS[c.algorithm] || '#64748b'} strokeWidth={2}
                            />
                            {isCurrent && <circle cx={sx(c.num_topics)} cy={sy(c.coherence_score!)} r={10} fill="none" stroke="#fff" strokeWidth={1} strokeDasharray="3,2" />}
                            <title>{c.name}: {c.num_topics} tópicos, coherencia {c.coherence_score?.toFixed(4)}</title>
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {algorithms.map(alg => (
                      <div key={alg} className="flex items-center gap-1.5">
                        <div className="w-4 h-1.5 rounded" style={{ backgroundColor: ALG_COLORS[alg] || '#64748b' }} />
                        <span className="text-xs text-slate-400 uppercase">{alg}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 ml-2">
                      <div className="w-3 h-3 rounded-full border-2 border-white bg-transparent" />
                      <span className="text-xs text-slate-400">modelo activo</span>
                    </div>
                  </div>
                </div>
              </ChartCard>
            );
          })()}

          {/* VIZ-6: PCA inter-topic distance map */}
          {data.selectedTopicModeling?.pca_projection && data.selectedTopicModeling.pca_projection.length >= 2 && (() => {
            const pts = data.selectedTopicModeling!.pca_projection!;
            const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
            const xMin = Math.min(...xs), xMax = Math.max(...xs);
            const yMin = Math.min(...ys), yMax = Math.max(...ys);
            const xRange = xMax - xMin || 1, yRange = yMax - yMin || 1;
            const W = 480, H = 280, PAD = 40;
            const chartW = W - PAD * 2, chartH = H - PAD * 2;
            const maxSize = Math.max(...pts.map(p => p.size)) || 1;
            const COLORS = ['#10b981','#06b6d4','#8b5cf6','#f59e0b','#ec4899','#3b82f6','#2dd4bf','#f472b6','#a78bfa','#34d399'];
            const hovered = pcaHovered;
            const setHovered = setPcaHovered;
            return (
              <ChartCard
                title="Mapa de Distancia Inter-Tópicos (PCA)"
                subtitle="Proyección 2D — tópicos cercanos comparten vocabulario"
                accentColor="emerald"
                size="lg"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                <div className="relative px-2 pb-2">
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: `${H}px` }}>
                    <g transform={`translate(${PAD},${PAD})`}>
                      {/* Grid */}
                      {[-0.5, 0, 0.5].map(t => {
                        const xv = xMin + (t + 0.5) * xRange;
                        const yv = yMin + (t + 0.5) * yRange;
                        const cx = ((xv - xMin) / xRange) * chartW;
                        const cy = chartH - ((yv - yMin) / yRange) * chartH;
                        return (
                          <g key={t}>
                            <line x1={cx} y1={0} x2={cx} y2={chartH} stroke="#1e293b" strokeWidth={1} />
                            <line x1={0} y1={cy} x2={chartW} y2={cy} stroke="#1e293b" strokeWidth={1} />
                          </g>
                        );
                      })}
                      {/* Bubbles */}
                      {pts.map((p, i) => {
                        const cx = ((p.x - xMin) / xRange) * chartW;
                        const cy = chartH - ((p.y - yMin) / yRange) * chartH;
                        const r = 10 + (p.size / maxSize) * 16;
                        const color = COLORS[i % COLORS.length];
                        const isHov = hovered === i;
                        return (
                          <g key={p.topic_id} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
                            <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={isHov ? 0.9 : 0.55} stroke={color} strokeWidth={isHov ? 2 : 1} />
                            <text x={cx} y={cy + 4} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="600" style={{ pointerEvents: 'none' }}>
                              {p.topic_id + 1}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                  {hovered !== null && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-600/60 rounded-lg px-3 py-2 shadow-xl text-xs pointer-events-none z-10">
                      <p className="font-bold text-white mb-0.5">{pts[hovered]?.label}</p>
                      <p className="text-slate-400">{pts[hovered]?.size} documentos</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 px-4 pb-3">El tamaño del círculo refleja el número de documentos. La posición refleja la similitud semántica calculada con PCA sobre los pesos de palabras.</p>
              </ChartCard>
            );
          })()}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          BERTOPIC SECTION
      ════════════════════════════════════════════════════════ */}
      {activeSubTab === 'bertopic' && !data?.selectedBertopic && (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl bg-slate-800/30 border border-slate-700/50 text-center">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-slate-300 text-sm">Sin análisis BERTopic para este dataset.</p>
          <p className="text-slate-400 text-xs mt-1">Crea uno desde Administración › BERTopic.</p>
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
            onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
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
                  <p className="text-xs text-slate-400 mb-3">
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
    </div>
  );
};
