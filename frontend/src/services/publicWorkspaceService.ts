/**
 * Public Workspace Service
 *
 * API para el Laboratorio público: inferencia con modelos entrenados sobre nuevos PDFs.
 * Usa publicApiClient (sin autenticación) en lugar del apiClient autenticado.
 * Los workspaces anónimos expiran en 48h.
 */

import publicApiClient from './publicApi';
import type { Workspace, WorkspaceDocument } from './workspaceService';

// Re-export shared types so consumers can import from one place
export type {
  WorkspaceDocument,
  TopTermResult,
  BowInferenceResult,
  TfidfInferenceResult,
  DocumentTopicResult,
  TopicAffinityResult,
  TopicInferenceResult,
  PreprocessingStats,
  RejectedDocument,
  NerEntityTypeDistribution,
  NerInferenceResult,
  BertopicDocumentAssignment,
  BertopicSimilarityResult,
  WorkspaceResults,
  Workspace,
} from './workspaceService';

// ── Payload type for the public create endpoint ────────────────────────────────

export interface CreatePublicWorkspacePayload {
  dataset_id: number;
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

const publicWorkspaceService = {
  async createWorkspace(payload: CreatePublicWorkspacePayload): Promise<Workspace> {
    const res = await publicApiClient.post<Workspace>('/workspace/', payload);
    return res.data;
  },

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const res = await publicApiClient.get<Workspace>(`/workspace/${workspaceId}/`);
    return res.data;
  },

  async uploadDocument(workspaceId: string, file: File): Promise<WorkspaceDocument> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await publicApiClient.post<WorkspaceDocument>(
      `/workspace/${workspaceId}/upload/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
    );
    return res.data;
  },

  async runInference(workspaceId: string): Promise<{ status: string; workspace_id: string }> {
    const res = await publicApiClient.post(`/workspace/${workspaceId}/run/`);
    return res.data;
  },

  async getCorpusStopwords(datasetId: number): Promise<string[]> {
    const res = await publicApiClient.get<{ corpus_stopwords: string[] }>(
      `/corpus-stopwords/?dataset_id=${datasetId}`
    );
    return res.data.corpus_stopwords;
  },

  async exportExcel(workspaceId: string, filename?: string): Promise<void> {
    const res = await publicApiClient.get(`/workspace/${workspaceId}/export/excel/`, {
      responseType: 'blob',
    });
    _triggerDownload(res.data, filename ?? `lab_results_${workspaceId.slice(0, 8)}.xlsx`);
  },

  async exportConfig(workspaceId: string, filename?: string): Promise<void> {
    const res = await publicApiClient.get(`/workspace/${workspaceId}/export/config/`, {
      responseType: 'blob',
    });
    _triggerDownload(res.data, filename ?? `lab_config_${workspaceId.slice(0, 8)}.json`);
  },
};

export default publicWorkspaceService;
