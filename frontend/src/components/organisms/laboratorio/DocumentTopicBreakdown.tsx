/**
 * Desglose de temas por documento, con tres modos segun el numero de documentos.
 */

import React, { useState } from 'react';
import type { DocumentTopicResult, WorkspaceDocument } from '../../../services/publicWorkspaceService';

export const DOC_THRESHOLD_EXPANDED = 10;

export const DOC_THRESHOLD_ACCORDION = 25;

export interface DocumentTopicBreakdownProps {
  documentTopics: DocumentTopicResult[];
  corpusTopics: Array<{ topic_id: number; topic_label: string }>;
  documents: WorkspaceDocument[];
}

export const DocumentTopicBreakdown: React.FC<DocumentTopicBreakdownProps> = ({
  documentTopics,
  corpusTopics,
  documents,
}) => {
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const count = documentTopics.length;
  const mode =
    count <= DOC_THRESHOLD_EXPANDED ? 'expanded'
    : count <= DOC_THRESHOLD_ACCORDION ? 'accordion'
    : 'summary';

  const topicLabel = (topicId: number) =>
    corpusTopics.find(t => t.topic_id === topicId)?.topic_label ?? `Tema ${topicId}`;

  const docName = (idx: number) =>
    documents[idx]?.original_filename ?? `Documento ${idx + 1}`;

  const DocBars: React.FC<{ dt: DocumentTopicResult }> = ({ dt }) => {
    const items = dt.topic_distribution
      .map((w, i) => ({ topicId: i, pct: +(w * 100).toFixed(1) }))
      .filter(t => t.pct >= 1)
      .sort((a, b) => b.pct - a.pct);
    return (
      <div className="space-y-1.5 pt-2">
        {items.map(t => (
          <div key={t.topicId} className="flex items-center gap-2">
            <span
              className="text-xs w-28 truncate shrink-0"
              title={topicLabel(t.topicId)}
              style={{ color: t.topicId === dt.dominant_topic ? '#fbbf24' : '#94a3b8' }}
            >
              {topicLabel(t.topicId)}
            </span>
            <div className="flex-1 h-4 bg-ink-800/50 rounded overflow-hidden">
              <div
                className="h-full rounded"
                style={{
                  width: `${Math.max(t.pct, 2)}%`,
                  background: t.topicId === dt.dominant_topic
                    ? 'rgba(245,158,11,0.75)'
                    : 'rgba(148,163,184,0.3)',
                }}
              />
            </div>
            <span className="text-xs text-mist w-10 text-right shrink-0">{t.pct}%</span>
          </div>
        ))}
      </div>
    );
  };

  if (mode === 'expanded') {
    return (
      <div className="mt-5 pt-4 border-t border-ink-700/50 space-y-3">
        <p className="text-xs text-haze font-medium">Desglose de temas por documento</p>
        {documentTopics.map((dt, i) => (
          <div key={i} className="p-3 rounded-xl bg-ink-900/40 border border-ink-700/40">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-paper truncate" title={docName(dt.document_index)}>
                📄 {docName(dt.document_index)}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 shrink-0">
                {topicLabel(dt.dominant_topic)} ({(dt.dominant_topic_weight * 100).toFixed(0)}%)
              </span>
            </div>
            <DocBars dt={dt} />
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'accordion') {
    const allExpanded = expandedDocs.size === documentTopics.length;
    const toggleAll = () =>
      setExpandedDocs(allExpanded ? new Set() : new Set(documentTopics.map((_, i) => i)));
    const toggle = (i: number) =>
      setExpandedDocs(prev => {
        const s = new Set(prev);
        s.has(i) ? s.delete(i) : s.add(i);
        return s;
      });
    return (
      <div className="mt-5 pt-4 border-t border-ink-700/50 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-haze font-medium">Desglose de temas por documento</p>
          <button
            onClick={toggleAll}
            className="text-xs text-mist hover:text-paper transition-colors"
          >
            {allExpanded ? 'Colapsar todos' : 'Expandir todos'}
          </button>
        </div>
        {documentTopics.map((dt, i) => {
          const open = expandedDocs.has(i);
          return (
            <div key={i} className="rounded-xl bg-ink-900/40 border border-ink-700/40 overflow-hidden">
              <button
                onClick={() => toggle(i)}
                className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-ink-800/20 transition-colors"
              >
                <span className="text-xs text-paper truncate text-left" title={docName(dt.document_index)}>
                  📄 {docName(dt.document_index)}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-amber-300">
                    {topicLabel(dt.dominant_topic)} ({(dt.dominant_topic_weight * 100).toFixed(0)}%)
                  </span>
                  <svg className={`w-3 h-3 text-mist transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {open && (
                <div className="px-3 pb-3">
                  <DocBars dt={dt} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // mode === 'summary' (> 25 docs)
  const sorted = [...documentTopics].sort((a, b) =>
    sortDir === 'desc'
      ? b.dominant_topic_weight - a.dominant_topic_weight
      : a.dominant_topic_weight - b.dominant_topic_weight
  );
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageItems = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="mt-5 pt-4 border-t border-ink-700/50 space-y-3">
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-900/20 border border-amber-700/30">
        <span className="text-amber-400 text-sm shrink-0 mt-0.5">⚠</span>
        <p className="text-xs text-amber-200 leading-relaxed">
          Tu análisis contiene <strong>{count} documentos</strong>. El Laboratorio está diseñado para exploración rápida con conjuntos pequeños.
          Para análisis detallado de corpus grandes, considera subirlos como un <strong>Dataset nuevo</strong> desde el panel de administración.
        </p>
      </div>
      <p className="text-xs text-haze font-medium">Desglose de temas por documento</p>
      <div className="rounded-xl overflow-hidden border border-ink-700/40">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-ink-850/60">
              <th className="text-left px-3 py-2 text-mist font-medium">Documento</th>
              <th className="text-left px-3 py-2 text-mist font-medium">Tema dominante</th>
              <th
                className="text-right px-3 py-2 text-mist font-medium cursor-pointer hover:text-paper select-none"
                onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setPage(0); }}
              >
                Confianza {sortDir === 'desc' ? '↓' : '↑'}
              </th>
              <th className="text-left px-3 py-2 text-mist font-medium hidden sm:table-cell">Temas secundarios</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((dt, i) => {
              const secondary = dt.topic_distribution
                .map((w, idx) => ({ topicId: idx, pct: +(w * 100).toFixed(1) }))
                .filter(t => t.topicId !== dt.dominant_topic && t.pct >= 5)
                .sort((a, b) => b.pct - a.pct)
                .slice(0, 2);
              return (
                <tr key={i} className={i % 2 === 0 ? 'bg-ink-900/20' : 'bg-ink-850/20'}>
                  <td className="px-3 py-2 text-paper max-w-[140px] truncate" title={docName(dt.document_index)}>
                    {docName(dt.document_index)}
                  </td>
                  <td className="px-3 py-2 text-amber-300">{topicLabel(dt.dominant_topic)}</td>
                  <td className="px-3 py-2 text-right text-haze">
                    {(dt.dominant_topic_weight * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {secondary.map(s => (
                        <span key={s.topicId} className="px-1.5 py-0.5 rounded bg-ink-800/60 text-mist">
                          {topicLabel(s.topicId)} {s.pct}%
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-fog">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} de {sorted.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs px-2 py-1 rounded bg-ink-800/40 text-haze disabled:opacity-40 hover:bg-ink-700/40 transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="text-xs px-2 py-1 rounded bg-ink-800/40 text-haze disabled:opacity-40 hover:bg-ink-700/40 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Stage 4: Results ──────────────────────────────────────────────────────────
