/**
 * Menu de exportacion del dashboard Resumen.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { EnrichedTopic, DocumentTopicItem } from './types';
import { FACTOR_CATEGORIES, CAT_BY_ID } from './categories';
import type { TopicModeling } from '../../../services/topicModelingService';
import type { BERTopicAnalysis } from '../../../services/bertopicService';
import { downloadFile } from '../../../utils/download';
import { buildTopicsCSV, buildCategoryCSV } from './csv';
import { contribucion, totalPesos } from './pesos';

export interface ExportMenuProps {
  topics: EnrichedTopic[];
  topicsByCategory: Record<string, EnrichedTopic[]>;
  docTopics: DocumentTopicItem[];
  topicModel: TopicModeling | null;
  bertopic: BERTopicAnalysis | null;
  datasetName: string;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ topics, topicsByCategory, docTopics, topicModel, bertopic, datasetName }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const exportAllCSV = () => {
    setOpen(false);
    // Build multi-section CSV
    const sections: string[] = [];
    sections.push('# RESUMEN — Science Mapping / Knowledge Landscape');
    sections.push(`# Dataset: ${datasetName}`);
    sections.push(`# Fecha: ${new Date().toLocaleDateString('es-CO')}`);
    sections.push('');
    sections.push('## TEMAS');
    sections.push(buildTopicsCSV(topics));
    sections.push('');
    sections.push('## POR CATEGORÍA');
    for (const cat of FACTOR_CATEGORIES) {
      const catTopics = topicsByCategory[cat.id] ?? [];
      if (catTopics.length === 0) continue;
      sections.push(`### ${cat.label}`);
      sections.push(buildCategoryCSV(cat, catTopics, docTopics));
      sections.push('');
    }
    downloadFile(sections.join('\n'), `science_mapping_${datasetName.replace(/\s+/g, '_').slice(0, 30)}_${Date.now()}.csv`, 'text/csv');
  };

  const exportJSON = () => {
    setOpen(false);
    const data = {
      dataset: datasetName,
      exported_at: new Date().toISOString(),
      summary: {
        total_topics: topics.length,
        total_documents: (topicModel?.documents_processed ?? bertopic?.documents_processed ?? 0),
        model_source: topicModel?.algorithm ?? 'bertopic',
        coherence_score: topicModel?.coherence_score ?? bertopic?.coherence_score,
      },
      categories: FACTOR_CATEGORIES.map(cat => ({
        id: cat.id,
        label: cat.label,
        topics: (topicsByCategory[cat.id] ?? []).map(t => ({
          id: t.id,
          label: t.label,
          words: t.words,
          num_documents: t.numDocuments,
        })),
      })),
      all_topics: topics.map(t => ({
        id: t.id,
        label: t.label,
        category: t.categoryId,
        source: t.source,
        num_documents: t.numDocuments,
        words: t.words,
        top_documents: docTopics
          .filter(d => (d.dominant_topic ?? d.topic_id) === t.id)
          .slice(0, 10)
          .map(d => ({ name: d.document_name ?? `Doc ${d.document_id}`, weight: d.dominant_topic_weight ?? d.topic_weight })),
      })),
    };
    downloadFile(JSON.stringify(data, null, 2), `science_mapping_${datasetName.replace(/\s+/g, '_').slice(0, 30)}_${Date.now()}.json`, 'application/json');
  };

  const exportTSV = () => {
    setOpen(false);
    const header = ['ID', 'Etiqueta', 'Categoría', 'Fuente', 'Documentos', ...Array.from({ length: 10 }, (_, i) => `Término_${i + 1}`)].join('\t');
    const rows = topics.map(t => {
      const total = totalPesos(t.words);
      return [
        t.id,
        t.label,
        CAT_BY_ID[t.categoryId]?.label ?? t.categoryId,
        t.source.toUpperCase(),
        t.numDocuments,
        ...t.words.slice(0, 10).map(w => `${w.word}(${contribucion(w.weight, total).toFixed(1)}%)`),
      ].join('\t');
    });
    downloadFile([header, ...rows].join('\n'), `science_mapping_${datasetName.replace(/\s+/g, '_').slice(0, 30)}_${Date.now()}.tsv`, 'text/tab-separated-values');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-paper bg-ink-850 border border-ink-600 rounded-xl hover:bg-ink-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Exportar datos
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-ink-600 bg-ink-850 shadow-2xl shadow-black/50 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-ink-700/40">
            <p className="font-mono text-[11px] text-fog font-medium uppercase tracking-[0.14em]">Formato de exportación</p>
          </div>
          {[
            { label: 'CSV completo (Excel)', ext: 'csv', desc: 'UTF-8 con BOM — compatible con Excel', action: exportAllCSV, color: 'text-emerald-300' },
            { label: 'TSV (Excel / Calc)', ext: 'tsv', desc: 'Separado por tabulaciones', action: exportTSV, color: 'text-blue-300' },
            { label: 'JSON completo', ext: 'json', desc: 'Ideal para análisis programático', action: exportJSON, color: 'text-violet-300' },
          ].map(opt => (
            <button
              key={opt.ext}
              onClick={opt.action}
              className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-ink-800 transition-colors text-left"
            >
              <div className={`mt-0.5 w-7 h-7 rounded-lg bg-ink-850 border border-ink-700/50 flex items-center justify-center shrink-0`}>
                <span className={`text-xs font-bold ${opt.color}`}>.{opt.ext}</span>
              </div>
              <div>
                <p className="text-sm text-paper font-medium">{opt.label}</p>
                <p className="text-xs text-mist">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
