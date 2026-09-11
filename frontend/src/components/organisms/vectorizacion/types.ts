/**
 * Tipos compartidos por los componentes del dashboard de Vectorizacion.
 */

export interface SelectedTerm {
  text: string;
  bowScore: number | null;
  bowRank: number | null;
  tfidfScore: number | null;
  tfidfRank: number | null;
  idfScore: number | null;
  relatedNgrams: Array<{ label: string; value: number }>;
  source: 'bow' | 'tfidf' | 'ngram';
}

export interface ScatterPoint {
  term: string;
  tf: number;
  idf: number;
  tfidf: number;
}

export interface HeatmapDataRow {
  id: string;
  data: Array<{ x: string; y: number | null }>;
}

export interface ComparacionItem {
  term: string;
  bowFreq: number;
  bowRank: number;
  tfidfScore: number;
  tfidfRank: number;
  rankDiff: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
