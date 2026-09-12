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
            onClick={() => refetch()}
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
