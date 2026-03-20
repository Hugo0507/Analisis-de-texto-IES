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

export interface TopicInferenceResult {
  document_topics: DocumentTopicResult[];
  topic_distribution: Array<{
    topic_id: number;
    topic_label: string;
    document_count: number;
    percentage: number;
  }>;
  num_topics: number;
  algorithm: string;
  corpus_topics: Array<{ topic_id: number; topic_label: string; words: Array<{ word: string; weight: number }> }>;
  reference_topic_model_id: number;
  reference_topic_model_name: string;
  error?: string;
}

export interface WorkspaceResults {
  document_count?: number;
  bow?: BowInferenceResult;
  tfidf?: TfidfInferenceResult;
  topics?: TopicInferenceResult;
}

export interface Workspace {
  id: string;
  dataset: number;
  dataset_name: string;
  bow_id: number | null;
  tfidf_id: number | null;
  topic_model_id: number | null;
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
};

export default workspaceService;
