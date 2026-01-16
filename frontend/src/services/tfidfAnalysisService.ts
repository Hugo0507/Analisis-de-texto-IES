/**
 * TF-IDF Analysis Service
 *
 * Servicio para gestión de análisis TF-IDF.
 * Permite crear análisis desde múltiples fuentes y visualizar 3 matrices.
 */

import apiClient from './api';

export interface TopTerm {
  term: string;
  score: number;
  rank: number;
}

export interface IDFTerm {
  term: string;
  idf: number;
  rank: number;
}

export interface MatrixShape {
  rows: number;
  cols: number;
}

// Matriz TF (Term Frequency)
export interface TFMatrix {
  matrix_shape: MatrixShape;
  matrix_sparsity: number;
  top_terms_by_tf: TopTerm[];
  avg_tf_per_document: number;
  sublinear_applied: boolean;
}

// Vector IDF (Inverse Document Frequency)
export interface IDFVector {
  idf_values: Record<string, number>;  // Términos con sus valores IDF
  top_terms_by_idf: IDFTerm[];  // Términos más raros/específicos
  bottom_terms_by_idf: IDFTerm[];  // Términos más comunes
  avg_idf: number;
  smooth_applied: boolean;
}

// Matriz TF-IDF final
export interface TFIDFMatrix {
  matrix_shape: MatrixShape;
  matrix_sparsity: number;
  top_terms: TopTerm[];
  avg_tfidf_per_document: number;
  total_score: number;
}

export interface TfIdfAnalysis {
  id: number;
  name: string;
  description: string | null;

  // Tipo de origen
  source_type: 'data_preparation' | 'bag_of_words' | 'ngram_config' | 'ngram_all' | 'ngram_vocabulary';
  source_type_label: string;
  source_name: string;
  dataset_name: string;

  // Relaciones (IDs)
  data_preparation: number | null;
  bag_of_words: number | null;
  ngram_analysis: number | null;
  ngram_config: string;  // Ej: "2_2" para bigramas

  created_by: number;
  created_by_email: string;

  // Parámetros
  max_features: number;
  min_df: number;
  max_df: number;
  ngram_min: number;
  ngram_max: number;
  use_idf: boolean;
  smooth_idf: boolean;
  sublinear_tf: boolean;

  // Contadores
  document_count: number;
  vocabulary_size: number;

  // Las 3 matrices
  tf_matrix: TFMatrix;
  idf_vector: IDFVector;
  tfidf_matrix: TFIDFMatrix;

  // Estado
  status: 'pending' | 'processing' | 'completed' | 'error';
  status_label: string;
  current_stage: string | null;
  current_stage_label: string | null;
  progress_percentage: number;
  error_message: string | null;

  // Timestamps
  created_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  updated_at: string;
}

export interface TfIdfAnalysisListItem {
  id: number;
  name: string;
  source_type: string;
  source_type_label: string;
  source_name: string;
  dataset_name: string;
  vocabulary_size: number;
  document_count: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  status_label: string;
  progress_percentage: number;
  current_stage_label: string | null;
  created_at: string;
}

export interface TfIdfAnalysisCreateRequest {
  name: string;
  description?: string;
  source_type: 'data_preparation' | 'bag_of_words' | 'ngram_config' | 'ngram_all' | 'ngram_vocabulary';
  data_preparation?: number;
  bag_of_words?: number;
  ngram_analysis?: number;
  ngram_config?: string;  // Requerido si source_type es 'ngram_config'
  max_features: number;
  min_df: number;
  max_df: number;
  ngram_min: number;
  ngram_max: number;
  use_idf: boolean;
  smooth_idf: boolean;
  sublinear_tf: boolean;
}

export interface ProgressData {
  status: 'pending' | 'processing' | 'completed' | 'error';
  status_label: string;
  progress_percentage: number;
  current_stage: string | null;
  current_stage_label: string | null;
  error_message: string | null;
}

export interface MatricesData {
  tf_matrix: TFMatrix;
  idf_vector: IDFVector;
  tfidf_matrix: TFIDFMatrix;
}

class TfIdfAnalysisService {
  /**
   * Listar todos los análisis TF-IDF del usuario
   */
  async getTfIdfAnalyses(): Promise<TfIdfAnalysisListItem[]> {
    const response = await apiClient.get('/tfidf-analysis/');
    return response.data;
  }

  /**
   * Obtener detalle de un análisis TF-IDF
   */
  async getTfIdfAnalysis(id: number): Promise<TfIdfAnalysis> {
    const response = await apiClient.get(`/tfidf-analysis/${id}/`);
    return response.data;
  }

  /**
   * Crear nuevo análisis TF-IDF
   */
  async createTfIdfAnalysis(data: TfIdfAnalysisCreateRequest): Promise<TfIdfAnalysis> {
    const response = await apiClient.post('/tfidf-analysis/', data);
    return response.data;
  }

  /**
   * Eliminar análisis TF-IDF
   */
  async deleteTfIdfAnalysis(id: number): Promise<void> {
    await apiClient.delete(`/tfidf-analysis/${id}/`);
  }

  /**
   * Obtener progreso de un análisis
   */
  async getProgress(id: number): Promise<ProgressData> {
    const response = await apiClient.get(`/tfidf-analysis/${id}/progress/`);
    return response.data;
  }

  /**
   * Obtener las 3 matrices por separado
   */
  async getMatrices(id: number): Promise<MatricesData> {
    const response = await apiClient.get(`/tfidf-analysis/${id}/matrices/`);
    return response.data;
  }
}

const tfIdfAnalysisService = new TfIdfAnalysisService();
export default tfIdfAnalysisService;
