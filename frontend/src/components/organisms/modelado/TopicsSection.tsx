/**
 * Sub-pestana de modelado de temas: temas, coherencia y proyeccion PCA.
 */

import React from 'react';
import type { ModelingDashboardData } from '../../../services/dashboardService';
import { ChartCard } from '../../molecules';
import { DonutChartViz } from '../index';
import { CompactMetric } from './CompactMetric';
import { TopicCard } from './TopicCard';
import { coherenceBadgeClass } from './badges';
import type { CoherenceComparisonItem } from '../../../services/publicTopicModelingService';

export interface TopicsSectionProps {
  activeSubTab: string;
  data: ModelingDashboardData | null;
  isLoading: boolean;
  refetch: (opts?: { resetSelections?: boolean }) => void;
  coherenceComparison: CoherenceComparisonItem[];
  topicAlgorithmDisplay: string;
  topicAlgorithmBadge: string;
  showAllTopics: boolean;
  setShowAllTopics: React.Dispatch<React.SetStateAction<boolean>>;
  pcaHovered: number | null;
  setPcaHovered: React.Dispatch<React.SetStateAction<number | null>>;
}

export const TopicsSection: React.FC<TopicsSectionProps> = ({
  activeSubTab, data, isLoading, refetch, coherenceComparison,
  topicAlgorithmDisplay, topicAlgorithmBadge,
  showAllTopics, setShowAllTopics, pcaHovered, setPcaHovered,
}) => {
  return (
    <>
      {activeSubTab === 'topics' && !data?.selectedTopicModeling && (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl bg-ink-850/30 border border-ink-700/50 text-center">
          <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-haze text-sm">Sin modelos de temas para este dataset.</p>
          <p className="text-mist text-xs mt-1">Crea uno desde Administración › Modelado de Temas.</p>
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
                badgeClass="bg-ink-700/30 text-haze border-fog/30"
              />
            )}
            <CompactMetric
              label="Documentos"
              value={data.selectedTopicModeling.documents_processed}
            />
          </div>

          {/* Topics Grid */}
          <ChartCard
            title="Temas identificados"
            subtitle={`${data.selectedTopicModeling.name} — ${data.topics.length} temas`}
            accentColor="emerald"
            size="lg"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
            onRefreshClick={() => refetch({ resetSelections: true })}
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
              title="Distribución de temas"
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
                title="Coherencia vs. Número de Temas"
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
                      <text x={chartW / 2} y={chartH + 34} textAnchor="middle" fill="#94a3b8" fontSize={10}>Nº temas</text>
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
                            <title>{c.name}: {c.num_topics} temas, coherencia {c.coherence_score?.toFixed(4)}</title>
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {algorithms.map(alg => (
                      <div key={alg} className="flex items-center gap-1.5">
                        <div className="w-4 h-1.5 rounded" style={{ backgroundColor: ALG_COLORS[alg] || '#64748b' }} />
                        <span className="text-xs text-mist uppercase">{alg}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 ml-2">
                      <div className="w-3 h-3 rounded-full border-2 border-white bg-transparent" />
                      <span className="text-xs text-mist">modelo activo</span>
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
                title="Mapa de distancia entre temas (PCA)"
                subtitle="Proyección 2D — temas cercanos comparten vocabulario"
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
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-ink-900 border border-ink-600/60 rounded-lg px-3 py-2 shadow-xl text-xs pointer-events-none z-10">
                      <p className="font-bold text-white mb-0.5">{pts[hovered]?.label}</p>
                      <p className="text-mist">{pts[hovered]?.size} documentos</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-mist px-4 pb-3">El tamaño del círculo refleja el número de documentos. La posición refleja la similitud semántica calculada con PCA sobre los pesos de palabras.</p>
              </ChartCard>
            );
          })()}
        </>
      )}
    </>
  );
};
