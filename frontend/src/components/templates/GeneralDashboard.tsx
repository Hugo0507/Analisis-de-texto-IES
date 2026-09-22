/**
 * GeneralDashboard — Science Mapping / Knowledge Landscape
 *
 * OE3: Landscape consolidado de la Transformación Digital en Educación Superior.
 * Interactive: click nodes on the map, expandable category cards, cluster detail tabs,
 * per-item downloads, and full export (CSV / JSON / TSV).
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChartCard, StageHeading } from '../molecules';
import publicTopicModelingService from '../../services/publicTopicModelingService';
import publicBertopicService from '../../services/publicBertopicService';
import publicDataPreparationService from '../../services/publicDataPreparationService';
import { useFilter } from '../../contexts/FilterContext';
import { masRecienteCompletado, porMasReciente } from '../../utils/ordenAnalisis';
import type { TopicModeling, TopicModelingListItem } from '../../services/topicModelingService';
import type { BERTopicAnalysis, BERTopicListItem } from '../../services/bertopicService';
import type { ExecutiveSummary as ExecutiveSummaryData } from '../../services/publicTopicModelingService';
import {
  ScienceMap,
  CategoryCard,
  ClusterCard,
  ExportMenu,
  MetricsStrip,
  LoadingSkeleton,
  FACTOR_CATEGORIES,
  CAT_BY_ID,
  categoryFromClassification,
  SankeyChart,
  RadarChart,
  ExecutiveSummary,
} from '../organisms/general';
import type {
  EnrichedTopic,
  DocumentTopicItem,
  ClusterTab,
  PrepSummary,
} from '../organisms/general';

// ─── Factor categories (OE3 framework) ───────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Export utilities ─────────────────────────────────────────────────────────

// ─── Science Map — pan/zoom SVG con layout multi-anillo sin solapamiento ──────

// ─── Category Card ─────────────────────────────────────────────────────────────

// ─── Cluster Card ─────────────────────────────────────────────────────────────

// ─── Export Menu ──────────────────────────────────────────────────────────────

// ─── Metrics Strip ────────────────────────────────────────────────────────────

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

// ─── Main Component ───────────────────────────────────────────────────────────

export const GeneralDashboard: React.FC = () => {
  const [topicModel, setTopicModel] = useState<TopicModeling | null>(null);
  const [bertopic, setBertopic] = useState<BERTopicAnalysis | null>(null);
  const [prepSummary, setPrepSummary] = useState<PrepSummary | null>(null);
  const [topicList, setTopicList] = useState<TopicModelingListItem[]>([]);
  const [bertopicList, setBertopicList] = useState<BERTopicListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interaction state
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [clusterTabs, setClusterTabs] = useState<Record<number, ClusterTab>>({});
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const { filters, setSelectedTopicModel, setSelectedBertopic } = useFilter();

  useEffect(() => {
    if (!filters.selectedDatasetId) {
      setTopicModel(null);
      setBertopic(null);
      setPrepSummary(null);
      setTopicList([]);
      setBertopicList([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        // En paralelo: el límite de peticiones del backend ya lo permite y así
        // la sección aparece en un viaje en vez de en tres.
        const [rawTopicList, rawBertopicList, prepList] = await Promise.all([
          publicTopicModelingService.getTopicModelings(filters.selectedDatasetId!),
          publicBertopicService.getBERTopicAnalyses(filters.selectedDatasetId!),
          publicDataPreparationService.getPreparations(filters.selectedDatasetId!),
        ]);

        // Del más reciente al más antiguo, igual que en los demás selectores
        const sortedTopics  = porMasReciente(rawTopicList);
        const sortedBertopic = porMasReciente(rawBertopicList);

        // Análisis mostrado: el elegido por el usuario o el más reciente completado
        const topicId   = filters.selectedTopicModelId;
        const bertopicId = filters.selectedBertopicId;
        const ctm = topicId
          ? sortedTopics.find(t => t.id === topicId)
          : sortedTopics.find(t => t.status === 'completed');
        const cbt = bertopicId
          ? sortedBertopic.find(b => b.id === bertopicId)
          : sortedBertopic.find(b => b.status === 'completed');

        // La preparación completada más reciente
        const completedPrep = masRecienteCompletado(prepList) ?? null;

        // Los tres detalles en paralelo
        const [td, bd, prepDetail] = await Promise.all([
          ctm ? publicTopicModelingService.getTopicModelingById(ctm.id) : Promise.resolve(null),
          cbt ? publicBertopicService.getBERTopicById(cbt.id) : Promise.resolve(null),
          completedPrep ? publicDataPreparationService.getPreparation(completedPrep.id) : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setTopicList(sortedTopics);
          setBertopicList(sortedBertopic);
          setTopicModel(td);
          setBertopic(bd);
          setPrepSummary(prepDetail ? {
            files_processed: prepDetail.files_processed ?? 0,
            files_omitted: prepDetail.files_omitted ?? 0,
            duplicates_removed: prepDetail.duplicates_removed ?? 0,
            predominant_language: prepDetail.predominant_language ?? '',
            predominant_language_percentage: prepDetail.predominant_language_percentage ?? 0,
          } : null);

          // Auto-select first completed if no explicit ID was set
          if (!topicId && ctm) setSelectedTopicModel(ctm.id);
          if (!bertopicId && cbt) setSelectedBertopic(cbt.id);
        }
      } catch {
        if (!cancelled) setError('No se pudo cargar el landscape. Verifica la conexión con el backend.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.selectedDatasetId, filters.selectedTopicModelId, filters.selectedBertopicId]);

  // Merge topics from LDA + BERTopic (prefer LDA)
  const enrichedTopics = useMemo((): EnrichedTopic[] => {
    const out: EnrichedTopic[] = [];
    if (topicModel?.topics?.length) {
      topicModel.topics.forEach(t => {
        const dist = topicModel.topic_distribution?.find(d => d.topic_id === t.topic_id);
        out.push({
          id: t.topic_id,
          label: t.topic_label,
          words: t.words,
          numDocuments: dist?.document_count ?? 0,
          categoryId: categoryFromClassification(topicModel.topic_classifications, t.topic_id),
          source: 'lda',
          svgX: 0,
          svgY: 0,
        });
      });
    } else if (bertopic?.topics?.length) {
      bertopic.topics.forEach(t => {
        out.push({
          id: t.topic_id + 10000,
          label: t.topic_label,
          words: t.words,
          numDocuments: t.num_documents,
          categoryId: categoryFromClassification(bertopic.topic_classifications, t.topic_id),
          source: 'bertopic',
          svgX: 0,
          svgY: 0,
        });
      });
    }
    return out;
  }, [topicModel, bertopic]);

  const topicsByCategory = useMemo(() => {
    const map: Record<string, EnrichedTopic[]> = {};
    FACTOR_CATEGORIES.forEach(c => { map[c.id] = []; });
    enrichedTopics.forEach(t => { (map[t.categoryId] ?? map['infraestructura']).push(t); });
    return map;
  }, [enrichedTopics]);

  // All document-topic assignments
  const docTopics = useMemo((): DocumentTopicItem[] => {
    if (topicModel?.document_topics?.length) return topicModel.document_topics as DocumentTopicItem[];
    if (bertopic?.document_topics?.length) return bertopic.document_topics as DocumentTopicItem[];
    return [];
  }, [topicModel, bertopic]);

  const totalDocs = topicModel?.documents_processed ?? bertopic?.documents_processed ?? 0;
  const totalTopics = enrichedTopics.length;
  const sourceLabel = topicModel
    ? `${topicModel.algorithm_display ?? topicModel.algorithm?.toUpperCase()} · ${topicModel.source_name}`
    : bertopic
    ? `BERTopic · ${bertopic.source_name}`
    : null;
  const datasetName = filters.selectedDataset?.name ?? 'dataset';

  const handleClusterTabChange = useCallback((topicId: number, tab: ClusterTab) => {
    setClusterTabs(prev => ({ ...prev, [topicId]: tab }));
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!filters.selectedDatasetId) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl border border-ink-700 bg-ink-900 flex items-center justify-center">
          <svg className="w-7 h-7 text-fog" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        </div>
        <h3 className="font-display text-lg font-semibold text-paper mb-1.5">Selecciona un dataset</h3>
        <p className="text-mist text-sm">Elígelo en el panel de filtros para ver el mapa de conocimiento.</p>
      </div>
    </div>
  );

  if (isLoading) return <LoadingSkeleton />;

  if (error) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-stage-lab/10 border border-stage-lab/25 flex items-center justify-center">
          <svg className="w-7 h-7 text-stage-lab" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-haze">{error}</p>
      </div>
    </div>
  );

  if (!topicModel && !bertopic) return (
    <div className="space-y-6">
      <StageHeading stage="sum" title="Landscape de la TD en Educación Superior" />
      <div className="p-10 rounded-2xl bg-ink-900 border border-ink-700 text-center">
        <h3 className="font-display text-lg font-semibold text-paper mb-1.5">Aún no hay modelos de temas para este dataset</h3>
        <p className="text-mist max-w-md mx-auto">
          Completa un modelado de temas o un BERTopic desde Administración para generar el mapa de conocimiento.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <StageHeading
          stage="sum"
          title="Landscape de la TD en Educación Superior"
          subtitle="Mapa de conocimiento consolidado a partir del modelado de temas sobre el corpus de literatura académica."
        />
        <div className="flex flex-wrap items-center gap-3 shrink-0">
            <dl className="flex items-stretch divide-x divide-ink-700 rounded-2xl border border-ink-700 bg-ink-900">
              {[
                { label: 'Temas', value: totalTopics || '—' },
                { label: 'Documentos', value: totalDocs ? totalDocs.toLocaleString() : '—' },
                { label: 'Categorías', value: 6 },
              ].map(s => (
                <div key={s.label} className="px-4 py-2.5 text-center">
                  <dd className="num font-display text-xl font-semibold leading-none text-paper">{s.value}</dd>
                  <dt className="mt-1 text-xs text-mist">{s.label}</dt>
                </div>
              ))}
            </dl>
            {/* Export button */}
            {enrichedTopics.length > 0 && (
              <ExportMenu
                topics={enrichedTopics}
                topicsByCategory={topicsByCategory}
                docTopics={docTopics}
                topicModel={topicModel}
                bertopic={bertopic}
                datasetName={datasetName}
              />
            )}
            {/* TRANS-2: PDF Report Export */}
            {enrichedTopics.length > 0 && (
              <button
                onClick={async () => {
                  // Ensure executive summary is loaded
                  let summary = executiveSummary;
                  if (!summary && topicModel) {
                    try { summary = await publicTopicModelingService.getExecutiveSummary(topicModel.id); setExecutiveSummary(summary); } catch { /* ok */ }
                  }
                  const date = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
                  const cats = FACTOR_CATEGORIES.map(fc => {
                    const catTopics = enrichedTopics.filter(t => t.categoryId === fc.id);
                    const terms = catTopics.flatMap(t => (t.words || []).slice(0, 3).map(w => w.word || w)).join(', ');
                    return `<tr><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;color:${fc.color};font-weight:600;">${fc.label}</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;">${catTopics.length} temas</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${terms}</td></tr>`;
                  }).join('');
                  const topicRows = enrichedTopics.slice(0, 20).map(t => {
                    const wordsStr = (t.words || []).slice(0, 7).map(w => w.word || w).join(', ');
                    const cat = FACTOR_CATEGORIES.find(fc => fc.id === t.categoryId);
                    return `<tr><td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-weight:600;font-size:13px;">${t.label || `Tema ${t.id}`}</td><td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:${cat?.color || '#94a3b8'};">${cat?.shortLabel || t.categoryId}</td><td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;">${wordsStr}</td><td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;text-align:center;">${t.numDocuments}</td></tr>`;
                  }).join('');
                  const summaryHtml = summary
                    ? summary.summary_paragraphs.map(p => `<p style="margin:8px 0;line-height:1.6;font-size:13px;">${p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`).join('')
                    : '';
                  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte — ${datasetName}</title><style>
                    body{font-family:system-ui,sans-serif;margin:0;padding:24px;color:#1e293b;background:#fff;}
                    h1{font-size:22px;color:#0f172a;margin:0 0 4px;}
                    h2{font-size:16px;color:#0f172a;margin:20px 0 8px;border-bottom:2px solid #e2e8f0;padding-bottom:6px;}
                    h3{font-size:14px;color:#334155;margin:12px 0 6px;}
                    table{width:100%;border-collapse:collapse;margin:8px 0;}
                    th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:2px solid #e2e8f0;}
                    .header{border-bottom:3px solid #0891b2;padding-bottom:12px;margin-bottom:20px;}
                    .meta{color:#64748b;font-size:13px;margin:4px 0;}
                    .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:12px 0;}
                    .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;}
                    .kpi-val{font-size:20px;font-weight:700;color:#0891b2;}
                    .kpi-lbl{font-size:11px;color:#64748b;margin-top:2px;}
                    .summary-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px;margin:12px 0;}
                    @media print{body{padding:12px;}.no-print{display:none!important;}}
                  </style></head><body>
                    <div class="header">
                      <h1>Reporte de Análisis — ${datasetName}</h1>
                      <p class="meta">Generado: ${date}</p>
                      <p class="meta">Algoritmo: ${topicModel?.algorithm_display ?? topicModel?.algorithm ?? 'BERTopic'} · ${totalTopics} temas · ${totalDocs.toLocaleString()} documentos</p>
                    </div>
                    <div class="kpi-grid">
                      <div class="kpi"><div class="kpi-val">${totalTopics}</div><div class="kpi-lbl">Temas</div></div>
                      <div class="kpi"><div class="kpi-val">${totalDocs.toLocaleString()}</div><div class="kpi-lbl">Documentos</div></div>
                      <div class="kpi"><div class="kpi-val">${summary?.oe3_coverage ?? '—'}/6</div><div class="kpi-lbl">Cobertura OE3</div></div>
                      <div class="kpi"><div class="kpi-val">${(topicModel?.coherence_score ?? null) != null ? (topicModel!.coherence_score!).toFixed(3) : '—'}</div><div class="kpi-lbl">Coherencia</div></div>
                    </div>
                    ${summaryHtml ? `<h2>Resumen Ejecutivo</h2><div class="summary-box">${summaryHtml}</div>` : ''}
                    <h2>Distribución por Factor OE3</h2>
                    <table><thead><tr><th>Categoría</th><th>Temas</th><th>Términos representativos</th></tr></thead><tbody>${cats}</tbody></table>
                    <h2>Temas Identificados${enrichedTopics.length > 20 ? ' (primeros 20)' : ''}</h2>
                    <table><thead><tr><th>Tema</th><th>Categoría</th><th>Palabras clave</th><th>Docs</th></tr></thead><tbody>${topicRows}</tbody></table>
                    <h2>Metodología</h2>
                    <p style="font-size:13px;color:#475569;line-height:1.6;">Los temas se extraen mediante modelos de modelado de temas (LDA / NMF / LSA) y BERTopic aplicados al corpus preprocesado. La clasificación en categorías factoriales se hace automáticamente comparando los términos de cada tema con las palabras clave de cada factor del marco OE3.</p>
                  </body></html>`;
                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(html);
                    win.document.close();
                    win.focus();
                    setTimeout(() => win.print(), 800);
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-ink-850 hover:bg-ink-800 border border-ink-600 text-paper text-sm font-medium transition-colors"
                title="Exportar reporte como PDF"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                PDF
              </button>
            )}
        </div>
      </div>

      {/* ── Analysis Selector Bar ── */}
      {(topicList.length > 1 || bertopicList.length > 1) && (
        // bg-ink-900 sólido + border-ink-600 → fondo predecible para contraste
        <div className="flex flex-wrap gap-4 p-4 rounded-2xl bg-ink-900 border border-ink-700">
          {topicList.length > 1 && (
            <div className="flex flex-col gap-1.5 min-w-[220px] flex-1">
              {/* Label visible: 14px (text-sm), slate-200 → ≈ 10:1 contraste */}
              <label
                htmlFor="select-topic-model"
                className="text-xs text-mist whitespace-nowrap"
              >
                Modelo de temas
              </label>
              <select
                id="select-topic-model"
                value={filters.selectedTopicModelId ?? topicModel?.id ?? ''}
                onChange={e => setSelectedTopicModel(Number(e.target.value))}
                // text-sm (14px) + text-white sobre bg-ink-850 → ≈ 13:1 contraste
                // border-fog sólido → visible sin depender de opacidad
                // focus ring 2px cyan con offset — cumple WCAG 2.4.11 (foco visible)
                // min-h-[44px] — cumple touch target WCAG 2.5.5 + Apple HIG
                className="min-h-[44px] bg-ink-850 border border-ink-600 text-paper text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-stage-sum/60 cursor-pointer transition-colors hover:border-fog/50"
              >
                {topicList.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.algorithm_display})</option>
                ))}
              </select>
            </div>
          )}
          {bertopicList.length > 1 && (
            <div className="flex flex-col gap-1.5 min-w-[220px] flex-1">
              <label
                htmlFor="select-bertopic"
                className="text-xs text-mist whitespace-nowrap"
              >
                Modelo BERTopic
              </label>
              <select
                id="select-bertopic"
                value={filters.selectedBertopicId ?? bertopic?.id ?? ''}
                onChange={e => setSelectedBertopic(Number(e.target.value))}
                className="min-h-[44px] bg-ink-850 border border-ink-600 text-paper text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-stage-sum/60 cursor-pointer transition-colors hover:border-fog/50"
              >
                {bertopicList.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Metrics Strip ── */}
      <MetricsStrip
        topicModel={topicModel}
        bertopic={bertopic}
        enrichedTopics={enrichedTopics}
        prepSummary={prepSummary}
      />

      {/* ── Category Filter Indicator ── */}
      {activeCategoryFilter && (() => {
        const cat = CAT_BY_ID[activeCategoryFilter];
        const catTopics = topicsByCategory[activeCategoryFilter] ?? [];
        const catDocs = catTopics.reduce((s, t) => s + t.numDocuments, 0);
        return cat ? (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border"
            style={{ borderColor: `${cat.color}40`, backgroundColor: `${cat.color}10` }}>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-sm text-mist">
                Filtro activo: <span className="font-medium text-paper">{cat.label}</span>
              </span>
              <span className="text-xs text-mist">
                · {catTopics.length} tema{catTopics.length !== 1 ? 's' : ''} · {catDocs} docs
              </span>
            </div>
            <button
              onClick={() => setActiveCategoryFilter(null)}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-haze bg-ink-800/50 rounded-lg hover:bg-ink-700/50 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtro
            </button>
          </div>
        ) : null;
      })()}

      {/* ── Knowledge Map ── */}
      <ChartCard
        title="Mapa de conocimiento"
        subtitle={
          totalTopics
            ? `${totalTopics} temas — haz clic en un nodo para ver sus términos y documentos`
            : 'Ejecuta un análisis de temas para visualizar el mapa de conocimiento'
        }
        accentColor="cyan"
        size="lg"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        }
      >
        {totalTopics > 0 ? (
          <ScienceMap
            key={`${topicModel?.id ?? 0}-${bertopic?.id ?? 0}`}
            topics={enrichedTopics}
            docTopics={docTopics}
            highlightCategory={activeCategoryFilter}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {/* Ícono de empty state — bg sólido + borde visible */}
            <div className="w-16 h-16 rounded-2xl bg-ink-850 border border-ink-600 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-mist" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            {/* Texto empty state: text-sm + slate-300 → contraste ≥ 7.5:1 */}
            <p className="text-haze text-sm max-w-xs leading-relaxed">
              No se encontraron análisis de temas completados. Ejecuta un modelo LDA o BERTopic en la pestaña{' '}
              <span className="text-stage-mod font-medium">Modelado</span> para generar el mapa.
            </p>
          </div>
        )}
      </ChartCard>

      {/* ── Factor Categories ── */}
      <div>
        <div className="mb-4">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-fog">Factores OE3</p>
          <h3 className="mt-1 font-display text-xl font-semibold tracking-[-0.01em] text-paper">
            Categorías factoriales de la TD en IES
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FACTOR_CATEGORIES.map(cat => (
            <CategoryCard
              key={cat.id}
              cat={cat}
              topics={topicsByCategory[cat.id] ?? []}
              docTopics={docTopics}
              expanded={expandedCategoryId === cat.id}
              onToggle={() => setExpandedCategoryId(prev => prev === cat.id ? null : cat.id)}
              isFilterActive={activeCategoryFilter === cat.id}
              onFilterClick={() => setActiveCategoryFilter(prev => prev === cat.id ? null : cat.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Cluster Detail ── */}
      {enrichedTopics.length > 0 && (() => {
        const visibleTopics = activeCategoryFilter
          ? enrichedTopics.filter(t => t.categoryId === activeCategoryFilter)
          : enrichedTopics;
        const clusterSubtitle = activeCategoryFilter
          ? `${visibleTopics.length} clústeres de "${CAT_BY_ID[activeCategoryFilter]?.shortLabel ?? activeCategoryFilter}" — selecciona una pestaña para ver términos, documentos o detalles`
          : `${enrichedTopics.length} clústeres extraídos del corpus — selecciona una pestaña para ver términos, documentos o detalles`;
        return (
        <ChartCard
          title="Clústeres temáticos identificados"
          subtitle={clusterSubtitle}
          accentColor="purple"
          size="md"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-1">
            {visibleTopics.map(topic => (
              <ClusterCard
                key={topic.id}
                topic={topic}
                docTopics={docTopics}
                activeTab={clusterTabs[topic.id] ?? 'terms'}
                onTabChange={(tab) => handleClusterTabChange(topic.id, tab)}
              />
            ))}
          </div>
        </ChartCard>
        );
      })()}

      <SankeyChart enrichedTopics={enrichedTopics} />

      <RadarChart
        enrichedTopics={enrichedTopics}
        topicsByCategory={topicsByCategory}
      />

      <ExecutiveSummary
        topicModel={topicModel}
        executiveSummary={executiveSummary}
        setExecutiveSummary={setExecutiveSummary}
        showSummary={showSummary}
        setShowSummary={setShowSummary}
        summaryLoading={summaryLoading}
        setSummaryLoading={setSummaryLoading}
      />
      {/* ── Methodology Footer — bg sólido, texto legible ── */}
      <div className="p-5 rounded-2xl bg-ink-900 border border-ink-700">
        <div className="flex items-start gap-3">
          {/* Icono: slate-300 → contraste ≥ 7.5:1 */}
          <svg className="w-5 h-5 text-fog mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            {/* Título: text-sm + text-white → ≈ 21:1 */}
            <p className="font-display text-[15px] font-semibold text-paper mb-1.5">Cómo se construyó el landscape</p>
            {/* Cuerpo: text-sm (14px) + slate-300 → ≈ 7.5:1 (antes text-xs slate-400 = ≈ 3.5:1) */}
            <p className="text-sm text-mist leading-relaxed">
              Los temas se extraen mediante modelos de{' '}
              <span className="text-white font-medium">modelado de temas</span> (LDA / NMF / LSA) y{' '}
              <span className="text-white font-medium">BERTopic</span> aplicados al corpus preprocesado.
              La clasificación en categorías factoriales se hace automáticamente comparando los
              términos de cada tema con las palabras clave de cada factor del marco OE3, no por
              interpretación semántica.
              {sourceLabel && (
                <span className="block mt-1.5 text-haze">Fuente activa: <span className="text-white font-medium">{sourceLabel}</span></span>
              )}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
