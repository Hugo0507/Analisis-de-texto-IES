/**
 * Tarjeta de un tema con pestanas de terminos, documentos y detalle.
 */

import React, { useMemo, useCallback } from 'react';
import type { EnrichedTopic, DocumentTopicItem, ClusterTab } from './types';
import { CAT_BY_ID } from './categories';
import { buildClusterCSV } from './csv';
import { contribucion, totalPesos } from './pesos';
import { downloadFile } from '../../../utils/download';

export interface ClusterCardProps {
  topic: EnrichedTopic;
  docTopics: DocumentTopicItem[];
  activeTab: ClusterTab;
  onTabChange: (tab: ClusterTab) => void;
}

export const ClusterCard: React.FC<ClusterCardProps> = ({ topic, docTopics, activeTab, onTabChange }) => {
  const cat = CAT_BY_ID[topic.categoryId];
  // El peso crudo cambia de escala según el algoritmo; se muestra cuánto aporta
  // cada término al tema (ver pesos.ts).
  const totalPeso = totalPesos(topic.words);
  const aporteMaximo = contribucion(topic.words[0]?.weight ?? 0, totalPeso) || 1;

  const topicDocs = useMemo(() =>
    docTopics
      .filter(d => (d.dominant_topic ?? d.topic_id) === topic.id)
      .sort((a, b) => (b.dominant_topic_weight ?? b.topic_weight ?? 0) - (a.dominant_topic_weight ?? a.topic_weight ?? 0))
      .slice(0, 10),
    [docTopics, topic.id]
  );

  const handleDownload = useCallback(() => {
    const csv = buildClusterCSV(topic, docTopics);
    downloadFile(csv, `cluster_${topic.id}_${topic.label.replace(/\s+/g, '_').slice(0, 30)}.csv`, 'text/csv');
  }, [topic, docTopics]);

  const tabs: Array<{ id: ClusterTab; label: string }> = [
    { id: 'terms', label: 'Términos' },
    { id: 'docs', label: `Documentos${topicDocs.length > 0 ? ` (${topicDocs.length})` : ''}` },
    { id: 'details', label: 'Detalles' },
  ];

  return (
    // bg-ink-850 sólido + borde izquierdo semántico (via cat.borderClass actualizado)
    <div className={`rounded-xl border ${cat.borderClass} bg-ink-850 flex flex-col`}>
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between mb-3">
          {/* Título: text-sm (14px) + text-white → ≈ 21:1 */}
          <h5 className="text-sm font-semibold text-white leading-snug flex-1 mr-2">{topic.label}</h5>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Badge de categoría: text-xs + color semántico */}
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${cat.badgeClass}`}>{cat.shortLabel}</span>
            {/* Download — 32px, visible, semántico */}
            <button
              onClick={handleDownload}
              title="Descargar CSV de este clúster"
              aria-label={`Descargar CSV del clúster ${topic.label}`}
              className={`w-8 h-8 flex items-center justify-center rounded-md ${cat.badgeClass} hover:opacity-75 transition-opacity cursor-pointer`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs — texto-sm, altura mínima ~36px, estados activo/inactivo con contraste claro */}
        <div className="flex gap-1" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  // Activo: bg+texto semántico + borde visible
                  ? `${cat.badgeClass} border`
                  // Inactivo: slate-300 (≈ 7.5:1) → hover a white (≈ 21:1)
                  : 'text-haze hover:text-white hover:bg-ink-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pb-4 pt-2 flex-1" role="tabpanel">
        {/* Términos tab */}
        {activeTab === 'terms' && (
          <div className="space-y-2">
            {topic.words.slice(0, 8).map((w, i) => {
              const aporte = contribucion(w.weight, totalPeso);
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="text-sm text-paper w-24 truncate shrink-0" title={w.word}>{w.word}</span>
                  <div className="flex-1 h-2 bg-ink-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min((aporte / aporteMaximo) * 100, 100)}%`, backgroundColor: cat.color }}
                    />
                  </div>
                  <span
                    className="num text-sm text-haze w-12 text-right shrink-0 font-medium"
                    title={`Aporta el ${aporte.toFixed(1)} % del peso del tema`}
                  >
                    {aporte.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Documentos tab */}
        {activeTab === 'docs' && (
          topicDocs.length > 0 ? (
            <ul className="space-y-2">
              {topicDocs.map((d, i) => (
                <li key={i} className="flex items-start gap-2">
                  {/* Número: color semántico de categoría */}
                  <span className={`text-sm ${cat.textClass} font-bold shrink-0`}>{i + 1}.</span>
                  {/* Nombre: text-sm + slate-100 → ≈ 14:1 */}
                  <span className="text-sm text-paper break-all leading-relaxed flex-1" title={d.document_name}>
                    {d.document_name ?? `Documento ${d.document_id}`}
                  </span>
                  {(d.dominant_topic_weight ?? d.topic_weight) != null && (
                    // Peso: text-sm + slate-300 + tabular-nums
                    <span className="text-sm text-haze shrink-0 font-medium tabular-nums">
                      {((d.dominant_topic_weight ?? d.topic_weight ?? 0) * 100).toFixed(0)}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            // text-sm + slate-300 — legible, no invisible
            <p className="text-sm text-haze italic py-2">
              No hay información de documentos disponible para este clúster.
            </p>
          )
        )}

        {/* Detalles tab */}
        {activeTab === 'details' && (
          <div className="space-y-2.5">
            {[
              { label: 'Fuente del modelo', value: topic.source.toUpperCase() },
              { label: 'Categoría OE3', value: CAT_BY_ID[topic.categoryId]?.label ?? topic.categoryId },
              { label: 'Documentos dominantes', value: topic.numDocuments > 0 ? topic.numDocuments.toLocaleString() : 'N/A' },
              { label: 'Términos en el clúster', value: topic.words.length },
              { label: 'Aporte del término principal', value: `${contribucion(topic.words[0]?.weight ?? 0, totalPeso).toFixed(1)}%` },
              { label: 'Aporte del término menor', value: `${contribucion(topic.words[topic.words.length - 1]?.weight ?? 0, totalPeso).toFixed(1)}%` },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-start gap-2">
                {/* Etiqueta: text-sm + slate-300 → ≈ 7.5:1 (antes text-xs slate-400 = ≈ 3.5:1, fallaba) */}
                <span className="text-sm text-haze">{item.label}</span>
                {/* Valor: color semántico, font-semibold, tabular-nums */}
                <span className={`text-sm ${cat.textClass} font-semibold text-right tabular-nums`}>{String(item.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
