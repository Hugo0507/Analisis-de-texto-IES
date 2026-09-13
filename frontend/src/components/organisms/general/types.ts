/**
 * Tipos compartidos del dashboard Resumen.
 */


export interface FactorCategory {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  ringColor: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  description: string;
  icon: React.ReactNode;
  zoneX: number;
  zoneY: number;
}

/**
 * Clasificacion de un tema en las seis categorias del OE3, tal como la
 * devuelve el backend (apps/topic_modeling/factors.py).
 */
export interface TopicClassification {
  topic_id: number;
  primary_category: string;
  primary_category_label: string;
  secondary_category: string | null;
  confidence_score: number;
  matched_keywords: string[];
}

export interface EnrichedTopic {
  id: number;
  label: string;
  words: Array<{ word: string; weight: number }>;
  numDocuments: number;
  categoryId: string;
  source: 'lda' | 'bertopic';
  svgX: number;
  svgY: number;
}

export interface DocumentTopicItem {
  document_id?: number;
  document_name?: string;
  dominant_topic?: number;
  topic_id?: number;
  dominant_topic_weight?: number;
  topic_weight?: number;
}

export type ClusterTab = 'terms' | 'docs' | 'details';

export interface PrepSummary {
  files_processed: number;
  files_omitted: number;
  duplicates_removed: number;
  predominant_language: string;
  predominant_language_percentage: number;
}

export interface MetricItem {
  id: string;
  icon: React.ReactNode;
  value: string;
  label: string;
  quality: 'good' | 'average' | 'poor' | 'neutral' | 'info';
  tooltip: { title: string; body: string; range?: string; source?: string };
  show: boolean;
}

// Q — paleta de calidad con ratios WCAG AA verificados sobre bg-slate-800/85
// emerald-300 (#6ee7b7) / amber-300 (#fcd34d) / rose-300 (#fda4af) sobre #1e293b → ≥ 5.5:1
// slate-100 (#f1f5f9) sobre #1e293b → ≈ 14:1  |  blue-300 (#93c5fd) → ≈ 7.2:1
