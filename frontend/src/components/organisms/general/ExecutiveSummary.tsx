/**
 * Resumen ejecutivo generado desde el modelo de temas (BE-7).
 */

import React from 'react';
import publicTopicModelingService from '../../../services/publicTopicModelingService';
import type { ExecutiveSummary as ExecutiveSummaryData } from '../../../services/publicTopicModelingService';
import type { TopicModeling } from '../../../services/topicModelingService';
import { FACTOR_CATEGORIES } from './categories';

export interface ExecutiveSummaryProps {
  topicModel: TopicModeling | null;
  executiveSummary: ExecutiveSummaryData | null;
  setExecutiveSummary: React.Dispatch<React.SetStateAction<ExecutiveSummaryData | null>>;
  showSummary: boolean;
  setShowSummary: React.Dispatch<React.SetStateAction<boolean>>;
  summaryLoading: boolean;
  setSummaryLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  topicModel, executiveSummary, setExecutiveSummary,
  showSummary, setShowSummary, summaryLoading, setSummaryLoading,
}) => {
  return (
    <>
      {topicModel && (
        <div className="rounded-xl bg-ink-850/60 border border-ink-700/50">
          <button
            onClick={async () => {
              if (!showSummary) {
                setShowSummary(true);
                if (!executiveSummary) {
                  setSummaryLoading(true);
                  try {
                    const s = await publicTopicModelingService.getExecutiveSummary(topicModel.id);
                    setExecutiveSummary(s);
                  } catch { /* silent */ }
                  finally { setSummaryLoading(false); }
                }
              } else {
                setShowSummary(false);
              }
            }}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-semibold text-white">Resumen Ejecutivo</span>
              <span className="text-xs text-mist">Generado automáticamente desde el modelo de temas</span>
            </div>
            <svg className={`w-4 h-4 text-mist transition-transform ${showSummary ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showSummary && (
            <div className="px-5 pb-5 border-t border-ink-700/40">
              {summaryLoading ? (
                <div className="flex items-center gap-3 py-6 text-mist">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Generando resumen ejecutivo...
                </div>
              ) : !executiveSummary ? (
                <p className="py-4 text-fog text-sm">No se pudo generar el resumen.</p>
              ) : (
                <div className="pt-4 space-y-3">
                  {/* Stats bar */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Temas', value: executiveSummary.n_topics, color: 'text-cyan-400' },
                      { label: 'Documentos', value: executiveSummary.n_docs.toLocaleString(), color: 'text-emerald-400' },
                      { label: 'Cobertura OE3', value: `${executiveSummary.oe3_coverage}/6`, color: 'text-violet-400' },
                      { label: 'Coherencia', value: executiveSummary.coherence_score != null ? executiveSummary.coherence_score.toFixed(3) : '—', color: (executiveSummary.coherence_score ?? 0) >= 0.5 ? 'text-emerald-400' : (executiveSummary.coherence_score ?? 0) >= 0.3 ? 'text-amber-400' : 'text-rose-400' },
                    ].map(s => (
                      <div key={s.label} className="text-center p-3 rounded-lg bg-ink-850/60 border border-ink-700/40">
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-mist mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Paragraphs */}
                  {executiveSummary.summary_paragraphs.map((p, i) => (
                    <p key={i} className="text-sm text-haze leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: p.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }}
                    />
                  ))}
                  {/* Factores sin cubrir */}
                  {executiveSummary.uncovered_categories && executiveSummary.uncovered_categories.length > 0 && (
                    <p className="text-sm text-mist">
                      Sin temas asignados:{' '}
                      {executiveSummary.uncovered_categories.map((c, i) => (
                        <span key={c}>
                          {i > 0 && ', '}
                          <span className="text-paper">{c}</span>
                        </span>
                      ))}
                      .
                    </p>
                  )}

                  {/* Category distribution */}
                  {executiveSummary.category_distribution.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-ink-700/40">
                      <p className="text-xs font-semibold text-mist uppercase tracking-wider mb-2">Distribución por categoría OE3</p>
                      <div className="space-y-1.5">
                        {executiveSummary.category_distribution.map(c => {
                          const pct = Math.round(c.count / executiveSummary.n_topics * 100);
                          const catColor = FACTOR_CATEGORIES.find(fc => fc.id === c.id)?.color || '#94a3b8';
                          return (
                            <div key={c.id} className="flex items-center gap-3">
                              <span className="text-xs text-mist w-40 truncate">{c.label}</span>
                              <div className="flex-1 h-2 bg-ink-800 rounded-full overflow-hidden">
                                <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: catColor }} />
                              </div>
                              <span className="text-xs font-mono text-haze w-6 text-right">{c.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
