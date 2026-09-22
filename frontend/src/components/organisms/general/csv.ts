/**
 * Construccion de los CSV que exporta el dashboard Resumen.
 */

import type { EnrichedTopic, DocumentTopicItem, FactorCategory } from './types';
import { CAT_BY_ID } from './categories';
import { contribucion, totalPesos } from './pesos';

export function toCSVRow(cells: (string | number)[]): string {
  return cells.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
}

export function buildTopicsCSV(topics: EnrichedTopic[]): string {
  const header = toCSVRow(['ID', 'Etiqueta', 'Categoría', 'Fuente', 'Documentos', 'Términos principales (aporte al tema)']);
  const rows = topics.map(t => {
    const total = totalPesos(t.words);
    return toCSVRow([
      t.id,
      t.label,
      CAT_BY_ID[t.categoryId]?.label ?? t.categoryId,
      t.source.toUpperCase(),
      t.numDocuments,
      t.words.slice(0, 8).map(w => `${w.word}(${contribucion(w.weight, total).toFixed(1)}%)`).join('; '),
    ]);
  });
  return [header, ...rows].join('\n');
}

export function buildCategoryCSV(cat: FactorCategory, topics: EnrichedTopic[], docTopics: DocumentTopicItem[]): string {
  const header = toCSVRow(['Categoría', 'Tema', 'Términos', 'Documentos', 'Top Documentos']);
  const rows = topics.map(t => {
    const topDocs = docTopics
      .filter(d => (d.dominant_topic ?? d.topic_id) === t.id)
      .slice(0, 5)
      .map(d => d.document_name ?? `Doc ${d.document_id}`)
      .join('; ');
    return toCSVRow([
      cat.label,
      t.label,
      t.words.slice(0, 6).map(w => w.word).join('; '),
      t.numDocuments,
      topDocs || 'N/A',
    ]);
  });
  return [header, ...rows].join('\n');
}

export function buildClusterCSV(topic: EnrichedTopic, docTopics: DocumentTopicItem[]): string {
  const infoHeader = toCSVRow(['Campo', 'Valor']);
  const infoRows = [
    toCSVRow(['Etiqueta', topic.label]),
    toCSVRow(['Categoría', CAT_BY_ID[topic.categoryId]?.label ?? topic.categoryId]),
    toCSVRow(['Fuente', topic.source.toUpperCase()]),
    toCSVRow(['Documentos', topic.numDocuments]),
    toCSVRow(['', '']),
    toCSVRow(['Término', 'Aporte al tema (%)', 'Peso del modelo']),
    ...topic.words.map(w => toCSVRow([w.word, contribucion(w.weight, totalPesos(topic.words)).toFixed(2), w.weight])),
    toCSVRow(['', '']),
    toCSVRow(['Documento', 'Peso del tema']),
    ...docTopics
      .filter(d => (d.dominant_topic ?? d.topic_id) === topic.id)
      .map(d => toCSVRow([d.document_name ?? `Doc ${d.document_id}`, (d.dominant_topic_weight ?? d.topic_weight ?? 0).toFixed(2)])),
  ];
  return [infoHeader, ...infoRows].join('\n');
}
