/**
 * LSTM Analysis Service
 */

import apiClient from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LstmLabelMode = 'topic' | 'oe3';

export interface LstmListItem {
  id: number;
  name: string;
  description: string | null;
  data_preparation: number;
  data_preparation_name: string;
  topic_modeling: number;
  topic_modeling_name: string;
  num_epochs: number;
  accuracy: number | null;
  macro_f1: number | null;
  baseline_macro_f1: number | null;
  label_mode: LstmLabelMode;
  fragment_words: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  status_display: string;
  progress_percentage: number;
  documents_used: number;
  num_classes: number;
  created_by_username: string;
  created_at: string;
}

export interface ClassificationEntry {
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface LstmAnalysis {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_by_username: string;

  data_preparation: number;
  data_preparation_name: string;
  topic_modeling: number;
  topic_modeling_name: string;

  embedding_dim: number;
  hidden_dim: number;
  num_layers: number;
  num_epochs: number;
  learning_rate: number;
  batch_size: number;
  train_split: number;
  max_vocab_size: number;
  max_seq_length: number;

  label_mode: LstmLabelMode;
  label_mode_display: string;
  fragment_words: number;

  status: 'pending' | 'processing' | 'completed' | 'error';
  status_display: string;
  current_stage: string;
  current_stage_display: string;
  progress_percentage: number;
  error_message: string | null;

  // Métricas por documento (principales)
  accuracy: number | null;
  macro_f1: number | null;
  baseline_accuracy: number | null;
  baseline_macro_f1: number | null;

  // Métricas por fragmento (secundarias; null si fragment_words = 0)
  fragment_accuracy: number | null;
  fragment_macro_f1: number | null;

  training_time_seconds: number | null;
  documents_used: number;
  samples_used: number | null;
  num_classes: number;
  vocab_size_actual: number;

  loss_history: number[];
  confusion_matrix: number[][];
  classification_report: Record<string, ClassificationEntry>;
  class_labels: string[];

  created_at: string;
  updated_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
}

export interface LstmCreatePayload {
  name: string;
  description?: string;
  data_preparation: number;
  topic_modeling: number;
  embedding_dim?: number;
  hidden_dim?: number;
  num_layers?: number;
  num_epochs?: number;
  learning_rate?: number;
  batch_size?: number;
  train_split?: number;
  max_vocab_size?: number;
  max_seq_length?: number;
  label_mode?: LstmLabelMode;
  fragment_words?: number;
}

export interface LstmProgress {
  status: 'pending' | 'processing' | 'completed' | 'error';
  status_display: string;
  current_stage: string;
  current_stage_display: string;
  progress_percentage: number;
  error_message: string | null;
}

// ── Service ───────────────────────────────────────────────────────────────────

const lstmService = {
  async list(): Promise<LstmListItem[]> {
    const res = await apiClient.get('/lstm-analysis/');
    // DRF pagination returns { count, next, previous, results: [...] }
    return res.data.results ?? res.data;
  },

  async getById(id: number): Promise<LstmAnalysis> {
    const res = await apiClient.get<LstmAnalysis>(`/lstm-analysis/${id}/`);
    return res.data;
  },

  async create(payload: LstmCreatePayload): Promise<LstmAnalysis> {
    const res = await apiClient.post<LstmAnalysis>('/lstm-analysis/', payload);
    return res.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/lstm-analysis/${id}/`);
  },

  async getProgress(id: number): Promise<LstmProgress> {
    const res = await apiClient.get<LstmProgress>(`/lstm-analysis/${id}/progress/`);
    return res.data;
  },
};

export default lstmService;
