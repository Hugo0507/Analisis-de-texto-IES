/**
 * Workspace Service
 *
 * API para el Laboratorio: inferencia con modelos entrenados sobre nuevos PDFs.
 */

import apiClient from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorkspaceDocument {
  id: number;
  original_filename: string;
  file_size: number;
  status: 'pending' | 'extracting' | 'ready' | 'error';
  error_message: string | null;
  detected_language: string | null;
  language_confidence: number;
  created_at: string;
}

export interface TopTermResult {
  term: string;
  score: number;
  rank: number;
}

export interface BowInferenceResult {
  top_terms: TopTermResult[];
  matrix_shape: { rows: number; cols: number };
  matrix_sparsity: number;
  avg_terms_per_document: number;
  total_term_occurrences: number;
  vocabulary_size: number;
  reference_bow_id: number;
  reference_bow_name: string;
  error?: string;
}

export interface TfidfInferenceResult {
  top_terms: TopTermResult[];
  matrix_shape: { rows: number; cols: number };
  matrix_sparsity: number;
  avg_tfidf_per_document: number;
  reference_tfidf_id: number;
  reference_tfidf_name: string;
  error?: string;
}

export interface DocumentTopicResult {
  document_index: number;
  dominant_topic: number;
  dominant_topic_weight: number;
  topic_distribution: number[];
}

export interface TopicAffinityResult {
  topic_id: number;
  topic_label: string;
  top_words: Array<{ word: string; weight: number }>;
  weight: number;
  percentage: number;
}

export interface TopicInferenceResult {
  document_topics: DocumentTopicResult[];
  topic_distribution: Array<{
    topic_id: number;
    topic_label: string;
    document_count: number;
    percentage: number;
  }>;
  all_topics_affinity: TopicAffinityResult[];
  num_topics: number;
  algorithm: string;
  corpus_topics: Array<{ topic_id: number; topic_label: string; words: Array<{ word: string; weight: number }> }>;
  reference_topic_model_id: number;
  reference_topic_model_name: string;
  error?: string;
}

export interface PreprocessingStats {
  total_raw_tokens: number;
  total_clean_tokens: number;
  documents_processed: number;
  documents_failed: number;
}

export interface RejectedDocument {
  filename: string;
  detected_language: string;
  expected_language: string;
  confidence: number;
  reason: string;
}

export interface NerEntityTypeDistribution {
  type: string;
  count: number;
  unique_entities: number;
  percentage: number;
}

export interface NerInferenceResult {
  entity_distribution: NerEntityTypeDistribution[];
  top_entities_by_type: Record<string, Array<{ text: string; count: number }>>;
  document_entities: Array<{ document_index: number; entities: Array<{ text: string; type: string }> }>;
  total_entities_found: number;
  unique_entities_count: number;
  entity_types_used: string[];
  reference_ner_id: number;
  reference_ner_name: string;
  spacy_model: string;
  error?: string;
}

export interface BertopicDocumentAssignment {
  document_index: number;
  dominant_topic: number;
  dominant_topic_label: string;
  similarity_score: number;
  top_topics: Array<{ topic_id: number; topic_label: string; similarity_score: number }>;
}

export interface BertopicSimilarityResult {
  document_assignments: BertopicDocumentAssignment[];
  topic_distribution: Array<{ topic_id: number; topic_label: string; document_count: number; percentage: number }>;
  total_documents: number;
  method: string;
  method_note: string;
  reference_bertopic_id: number;
  reference_bertopic_name: string;
  error?: string;
}

export interface WorkspaceResults {
  document_count?: number;
  bow?: BowInferenceResult;
  tfidf?: TfidfInferenceResult;
  topics?: TopicInferenceResult;
  ner?: NerInferenceResult;
  bertopic?: BertopicSimilarityResult;
  preprocessing_stats?: PreprocessingStats;
  rejected_documents?: RejectedDocument[];
}

export interface Workspace {
  id: string;
  dataset: number;
  dataset_name: string;
  bow_id: number | null;
  tfidf_id: number | null;
  topic_model_id: number | null;
  ner_id: number | null;
  bertopic_id: number | null;
  custom_stopwords: string[];
  inference_params: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress_percentage: number;
  error_message: string | null;
  results: WorkspaceResults;
  documents: WorkspaceDocument[];
  document_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface CreateWorkspacePayload {
  dataset: number;
  bow_id?: number | null;
  tfidf_id?: number | null;
  topic_model_id?: number | null;
  ner_id?: number | null;
  bertopic_id?: number | null;
  custom_stopwords?: string[];
  inference_params?: Record<string, unknown>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ── Service ───────────────────────────────────────────────────────────────────

const workspaceService = {
  async listWorkspaces(): Promise<Workspace[]> {
    const res = await apiClient.get<Workspace[]>('/workspace/');
    return res.data;
  },

  async createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
    const res = await apiClient.post<Workspace>('/workspace/', payload);
    return res.data;
  },

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const res = await apiClient.get<Workspace>(`/workspace/${workspaceId}/`);
    return res.data;
  },

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await apiClient.delete(`/workspace/${workspaceId}/`);
  },

  async uploadDocument(workspaceId: string, file: File): Promise<WorkspaceDocument> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<WorkspaceDocument>(
      `/workspace/${workspaceId}/upload/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  },

  async runInference(workspaceId: string): Promise<{ status: string; workspace_id: string }> {
    const res = await apiClient.post(`/workspace/${workspaceId}/run/`);
    return res.data;
  },

  async getCorpusStopwords(datasetId: number): Promise<string[]> {
    const res = await apiClient.get<{ corpus_stopwords: string[] }>(
      `/workspace/corpus-stopwords/?dataset_id=${datasetId}`
    );
    return res.data.corpus_stopwords;
  },

  async exportExcel(workspaceId: string, filename?: string): Promise<void> {
    const res = await apiClient.get(`/workspace/${workspaceId}/export/excel/`, {
      responseType: 'blob',
    });
    _triggerDownload(res.data, filename ?? `lab_results_${workspaceId.slice(0, 8)}.xlsx`);
  },

  async exportConfig(workspaceId: string, filename?: string): Promise<void> {
    const res = await apiClient.get(`/workspace/${workspaceId}/export/config/`, {
      responseType: 'blob',
    });
    _triggerDownload(res.data, filename ?? `lab_config_${workspaceId.slice(0, 8)}.json`);
  },
};

export default workspaceService;
