/**
 * ModeladoDashboard - Modeling visualization dashboard
 *
 * Displays NLP modeling analysis results:
 * - NER entity distribution, top entities, frequency bar chart
 * - Topic Modeling visualization with word weight bars + quality KPIs
 * - BERTopic clusters with word weight bars, distribution donut, quality KPIs
 */

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardGrid, MetricCardDark } from '../organisms';
import { StageHeading } from '../molecules';
import { useFilter } from '../../contexts/FilterContext';
import { useModelingData } from '../../hooks/useModelingData';
import {
  ALGORITHM_BADGE_COLORS,
  NerSection,
  TopicsSection,
  BertopicSection,
} from '../organisms/modelado';

// ---------------------------------------------------------------------------
// Color helpers & constants
// ---------------------------------------------------------------------------

export const ModeladoDashboard: React.FC = () => {
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'ner' | 'topics' | 'bertopic'>('ner');
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [showAllClusters, setShowAllClusters] = useState(false);
  const [pcaHovered, setPcaHovered] = useState<number | null>(null);
  const { filters, setSelectedNer, setSelectedTopicModel, setSelectedBertopic } = useFilter();
  const { data, coherenceComparison, isLoading, error, refetch } = useModelingData();

  // Reset entity type filter when the NER selection changes
  useEffect(() => {
    setSelectedEntityType(null);
  }, [filters.selectedNerId, filters.selectedDatasetId]);

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
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-ink-850/50 flex items-center justify-center">
            <svg className="w-10 h-10 text-fog" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Selecciona un Dataset</h3>
          <p className="text-haze text-sm max-w-md">
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
          <p className="text-haze text-sm">Cargando análisis de modelado...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-stage-lab/10 border border-stage-lab/25 flex items-center justify-center">
            <svg className="w-7 h-7 text-stage-lab" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-haze mb-4">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm font-medium text-paper bg-ink-850 border border-ink-600 rounded-xl hover:bg-ink-800 transition-colors"
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
        <StageHeading stage="mod" title="Modelado" subtitle="Entidades nombradas, modelado de temas y BERTopic." />
        <div className="p-10 rounded-2xl bg-ink-900 border border-ink-700">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl border border-ink-700 bg-ink-850 flex items-center justify-center">
              <svg className="w-7 h-7 text-stage-mod" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-semibold text-paper mb-1.5">Este corpus aún no tiene modelos</h3>
            <p className="text-mist max-w-md mx-auto">
              Crea un análisis de entidades, un modelo de temas o un BERTopic desde Administración para verlos aquí.
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
      <StageHeading
        stage="mod"
        title="Modelado"
        subtitle="Qué entidades y temas aparecen en el corpus: entidades nombradas, modelado de temas y BERTopic."
      />

      {/* Analysis Selector Bar */}
      {(
        (data?.nerAnalyses?.length ?? 0) > 1 ||
        (data?.topicModelingAnalyses?.length ?? 0) > 1 ||
        (data?.bertopicAnalyses?.length ?? 0) > 1
      ) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-2xl bg-ink-900 border border-ink-700">
          {(data?.nerAnalyses?.length ?? 0) > 1 && (
            <div className="flex min-w-0 flex-col gap-1.5 p-1">
              <div className="flex min-h-[22px] items-center"><span className="text-xs text-mist whitespace-nowrap">Entidades (NER)</span></div>
              <select
                value={filters.selectedNerId ?? data?.selectedNer?.id ?? ''}
                onChange={e => setSelectedNer(Number(e.target.value))}
                className="w-full min-w-0 bg-ink-850 border border-ink-600 text-paper text-sm rounded-xl px-3 py-2 transition-colors hover:border-fog/50 focus:outline-none focus:border-stage-mod/60 cursor-pointer"
              >
                {data?.nerAnalyses.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {(data?.topicModelingAnalyses?.length ?? 0) > 1 && (
            <div className="flex min-w-0 flex-col gap-1.5 p-1">
              <div className="flex min-h-[22px] min-w-0 items-center gap-2">
                <span className="text-xs text-mist whitespace-nowrap">Modelo de temas</span>
                {topicAlgorithmDisplay && (
                  <span className={`min-w-0 truncate px-1.5 py-0.5 text-[11px] rounded-md border ${topicAlgorithmBadge}`} title={topicAlgorithmDisplay}>
                    {topicAlgorithmDisplay}
                  </span>
                )}
              </div>
              <select
                value={filters.selectedTopicModelId ?? data?.selectedTopicModeling?.id ?? ''}
                onChange={e => setSelectedTopicModel(Number(e.target.value))}
                className="w-full min-w-0 bg-ink-850 border border-ink-600 text-paper text-sm rounded-xl px-3 py-2 transition-colors hover:border-fog/50 focus:outline-none focus:border-stage-mod/60 cursor-pointer"
              >
                {data?.topicModelingAnalyses.map(a => (
                  <option key={a.id} value={a.id}>{a.name} [{a.algorithm_display}]</option>
                ))}
              </select>
            </div>
          )}

          {(data?.bertopicAnalyses?.length ?? 0) > 1 && (
            <div className="flex min-w-0 flex-col gap-1.5 p-1">
              <div className="flex min-h-[22px] min-w-0 items-center gap-2">
                <span className="text-xs text-mist whitespace-nowrap">BERTopic</span>
                {data?.selectedBertopic?.embedding_model_display && (
                  <span className="min-w-0 truncate px-1.5 py-0.5 text-[11px] rounded-md border bg-stage-mod/10 text-stage-mod border-stage-mod/25" title={data.selectedBertopic.embedding_model_display}>
                    {data.selectedBertopic.embedding_model_display}
                  </span>
                )}
              </div>
              <select
                value={filters.selectedBertopicId ?? data?.selectedBertopic?.id ?? ''}
                onChange={e => setSelectedBertopic(Number(e.target.value))}
                className="w-full min-w-0 bg-ink-850 border border-ink-600 text-paper text-sm rounded-xl px-3 py-2 transition-colors hover:border-fog/50 focus:outline-none focus:border-stage-mod/60 cursor-pointer"
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
          title="Análisis de entidades"
          value={data?.nerAnalyses?.length || 0}
          subtitle="Reconocimiento de entidades"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
          accentColor="amber"
        />
        <MetricCardDark
          title="Modelos de temas"
          value={data?.topicModelingAnalyses?.length || 0}
          subtitle="LDA / NMF / LSA / PLSA"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
          accentColor="amber"
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
          title="Tipos de entidad"
          value={entityTypes.length || '—'}
          subtitle="Categorías NER activas"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          accentColor="amber"
        />
      </DashboardGrid>

      {/* ── Sub-tab navigation (QW-3) ── */}
      <div role="tablist" aria-label="Tipo de modelo" className="flex gap-1 p-1 rounded-2xl bg-ink-900 border border-ink-700">
        {(
          [
            { id: 'ner',      label: 'NER',                count: data?.nerAnalyses?.length ?? 0,                  accentActive: 'bg-ink-800 text-paper ring-1 ring-stage-mod/40', dot: 'bg-stage-mod/15 text-stage-mod' },
            { id: 'topics',   label: 'Modelado de temas',  count: data?.topicModelingAnalyses?.length ?? 0,        accentActive: 'bg-ink-800 text-paper ring-1 ring-stage-mod/40', dot: 'bg-stage-mod/15 text-stage-mod' },
            { id: 'bertopic', label: 'BERTopic',           count: data?.bertopicAnalyses?.length ?? 0,             accentActive: 'bg-ink-800 text-paper ring-1 ring-stage-mod/40', dot: 'bg-stage-mod/15 text-stage-mod' },
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeSubTab === tab.id}
            onClick={() => { setActiveSubTab(tab.id); setShowAllTopics(false); setShowAllClusters(false); }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors min-h-[44px] ${
              activeSubTab === tab.id
                ? tab.accentActive
                : 'text-mist hover:text-paper hover:bg-ink-850'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`num text-xs px-1.5 py-0.5 rounded-full ${activeSubTab === tab.id ? tab.dot : 'bg-ink-800 text-mist'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <NerSection
        activeSubTab={activeSubTab}
        data={data}
        isLoading={isLoading}
        refetch={refetch}
        entityTypes={entityTypes}
        nerEntities={nerEntities}
        filteredNerEntities={filteredNerEntities}
        nerNetworkData={nerNetworkData}
        selectedEntityType={selectedEntityType}
        setSelectedEntityType={setSelectedEntityType}
      />

      <TopicsSection
        activeSubTab={activeSubTab}
        data={data}
        isLoading={isLoading}
        refetch={refetch}
        coherenceComparison={coherenceComparison}
        topicAlgorithmDisplay={topicAlgorithmDisplay}
        topicAlgorithmBadge={topicAlgorithmBadge}
        showAllTopics={showAllTopics}
        setShowAllTopics={setShowAllTopics}
        pcaHovered={pcaHovered}
        setPcaHovered={setPcaHovered}
      />

      <BertopicSection
        activeSubTab={activeSubTab}
        data={data}
        isLoading={isLoading}
        refetch={refetch}
        bertopicDistData={bertopicDistData}
        bertopicDocsProcessed={bertopicDocsProcessed}
        showAllClusters={showAllClusters}
        setShowAllClusters={setShowAllClusters}
      />
    </div>
  );
};
