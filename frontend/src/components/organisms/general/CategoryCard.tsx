/**
 * Tarjeta de categoria con sus temas asociados.
 */

import React, { useMemo, useCallback } from 'react';
import type { FactorCategory, EnrichedTopic, DocumentTopicItem } from './types';
import { buildCategoryCSV } from './csv';
import { downloadFile } from '../../../utils/download';

export interface CategoryCardProps {
  cat: FactorCategory;
  topics: EnrichedTopic[];
  docTopics: DocumentTopicItem[];
  expanded: boolean;
  onToggle: () => void;
  isFilterActive: boolean;
  onFilterClick: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ cat, topics, docTopics, expanded, onToggle, isFilterActive, onFilterClick }) => {
  const topTerms = Array.from(
    new Set(topics.flatMap(t => t.words.slice(0, 4).map(w => w.word)))
  ).slice(0, 8);

  const topDocs = useMemo(() => {
    const seen = new Set<string>();
    return docTopics
      .filter(d => {
        const topicId = d.dominant_topic ?? d.topic_id;
        return topics.some(t => t.id === topicId);
      })
      .sort((a, b) => (b.dominant_topic_weight ?? b.topic_weight ?? 0) - (a.dominant_topic_weight ?? a.topic_weight ?? 0))
      .filter(d => {
        const name = d.document_name ?? String(d.document_id);
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .slice(0, 8);
  }, [topics, docTopics]);

  const handleDownload = useCallback(() => {
    const csv = buildCategoryCSV(cat, topics, docTopics);
    downloadFile(csv, `categoria_${cat.id}_${Date.now()}.csv`, 'text/csv');
  }, [cat, topics, docTopics]);

  return (
    // bg-slate-800 sólido — contraste predecible para todos los textos interiores
    <div className={`rounded-xl border ${isFilterActive ? `${cat.borderClass} ring-2 ring-offset-2 ring-offset-slate-900` : cat.borderClass} ${cat.bgClass} transition-all duration-200`}
      style={isFilterActive ? { outlineColor: cat.color } : undefined}>
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          {/* Icono de categoría — 40px, color semántico, border visible + filtro */}
          <button
            onClick={onFilterClick}
            title={isFilterActive ? 'Quitar filtro de categoría' : `Filtrar mapa por: ${cat.label}`}
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cat.badgeClass} hover:opacity-75 transition-opacity cursor-pointer`}
          >
            {isFilterActive ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              cat.icon
            )}
          </button>
          <div className="flex items-center gap-2">
            {isFilterActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white font-semibold border border-white/20 animate-pulse">
                Filtro activo
              </span>
            )}
            {topics.length > 0 && (
              // Badge de conteo — text-sm (14px) + color semántico de categoría
              <span className={`text-sm px-2.5 py-1 rounded-full font-semibold ${cat.badgeClass}`}>
                {topics.length} tema{topics.length !== 1 ? 's' : ''}
              </span>
            )}
            {/* Download button — 32px mínimo, hover con feedback visual */}
            {topics.length > 0 && (
              <button
                onClick={handleDownload}
                title="Descargar CSV de esta categoría"
                aria-label={`Descargar CSV de ${cat.label}`}
                className={`w-8 h-8 flex items-center justify-center rounded-lg ${cat.badgeClass} hover:opacity-75 transition-opacity cursor-pointer`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Título: text-base (16px) + color semántico → ≥ 5.5:1 contraste sobre bg-slate-800 */}
        <h4 className={`text-base font-semibold ${cat.textClass} mb-1.5`}>{cat.label}</h4>
        {/* Descripción: text-sm (14px) + slate-300 → ≈ 7.5:1 contraste */}
        <p className="text-sm text-slate-300 mb-4 leading-relaxed">{cat.description}</p>

        {topTerms.length > 0 ? (
          // Pills de términos — borde sólido slate-600 + texto legible slate-100
          <div className="flex flex-wrap gap-1.5">
            {topTerms.map(term => (
              <span
                key={term}
                className="text-sm px-2.5 py-1 rounded-md border border-slate-600 text-slate-100 bg-slate-700/60"
              >
                {term}
              </span>
            ))}
          </div>
        ) : (
          // text-sm + slate-300 en itálica — legible, no invisible
          <p className="text-sm text-slate-300 italic">Sin temas asignados aún</p>
        )}

        {/* Toggle de documentos — min-h-[44px] (WCAG 2.5.5), text-sm, padding adecuado */}
        {topDocs.length > 0 && (
          <button
            onClick={onToggle}
            className={`mt-4 w-full flex items-center justify-between px-4 min-h-[44px] rounded-lg text-sm font-semibold ${cat.badgeClass} hover:opacity-75 transition-opacity cursor-pointer`}
            aria-expanded={expanded}
          >
            <span>Top documentos ({topDocs.length})</span>
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Listado expandible de documentos */}
      {expanded && topDocs.length > 0 && (
        <div className="border-t border-slate-600 px-5 pb-5 pt-4">
          {/* Título sección: text-sm + slate-300 → contraste ≥ 7.5:1 */}
          <p className="text-sm font-semibold text-slate-300 mb-3">Documentos representativos</p>
          <ul className="space-y-2">
            {topDocs.map((d, i) => (
              <li key={i} className="flex items-start gap-2">
                {/* Número: color semántico de categoría */}
                <span className={`text-sm ${cat.textClass} font-bold shrink-0`}>{i + 1}.</span>
                {/* Nombre doc: text-sm + slate-100 → ≈ 14:1 contraste */}
                <span
                  className="text-sm text-slate-100 break-all leading-relaxed flex-1"
                  title={d.document_name}
                >
                  {d.document_name ?? `Documento ${d.document_id}`}
                </span>
                {(d.dominant_topic_weight ?? d.topic_weight) != null && (
                  // Peso: text-sm + slate-300 → contraste ≥ 7.5:1
                  <span className="text-sm text-slate-300 shrink-0 ml-auto font-medium tabular-nums">
                    {((d.dominant_topic_weight ?? d.topic_weight ?? 0) * 100).toFixed(0)}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
