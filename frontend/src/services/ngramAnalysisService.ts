/**
 * Ngram Analysis Service
 *
 * Servicio para gestión de análisis de N-gramas.
 * Permite crear, listar, ver y eliminar análisis comparativos de múltiples configuraciones de n-gramas.
 */

import { apiClient } from './api';

export interface TopTerm {
  term: string;
  score: number;
  rank: number;
}

export interface MatrixShape {
  rows: number;
  cols: number;
}

export interface DataPreparationInfo {
  id: number;
  name: string;
  dataset: {
    id: number;
    name: string;
  };
  predominant_language: string | null;
  files_processed: number;
}

export interface NgramConfigResult {
  ngram_range: [number, number];
  vocabulary_size: number;
  matrix_shape: MatrixShape;
  matrix_sparsity: number;
  avg_terms_per_document: number;
  total_term_occurrences: number;
  top_terms: TopTerm[];
  unique_terms: number;
}

export interface ConfigStats {
  vocabulary_size: number;
  unique_contribution: number;
  coverage: number;
}

export interface Comparisons {
  overlapping_terms: Record<string, number>;
  unique_contributions: Record<string, number>;
  total_unique_terms: number;
  config_stats: Record<string, ConfigStats>;
}

export interface NgramAnalysis {
  id: number;
  name: string;
  description: string | null;

  // Relaciones
  data_preparation: DataPreparationInfo;
  created_by_email: string;

  // Configuraciones de n-gramas
  ngram_configurations: Array<[number, number]>;

  // Parámetros comunes
  max_features: number;
  min_df: number;
  max_df: number;

  // Contadores
  document_count: number;
  total_configurations: number;

  // Resultados por configuración
  // Key: "1_1", "1_2", etc.
  results: Record<string, NgramConfigResult>;

  // Comparaciones entre configuraciones
  comparisons: Comparisons;

  // Estado y progreso
  status: 'pending' | 'processing' | 'completed' | 'error';
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

export interface NgramAnalysisListItem {
  id: number;
  name: string;
  data_preparation_name: string;
  dataset_name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress_percentage: number;
  current_stage: string | null;
  current_stage_label: string | null;
  total_configurations: number;
  document_count: number;
  created_at: string;
}

export interface NgramAnalysisCreateRequest {
  name: string;
  description?: string;
  data_preparation: number;
  ngram_configurations: Array<[number, number]>;
  max_features: number;
  min_df: number;
  max_df: number;
}

export interface ProgressData {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress_percentage: number;
  current_stage: string | null;
  current_stage_label: string | null;
  error_message: string | null;
}

export interface ComparisonResponse {
  configurations: Array<[number, number]>;
  results: Record<string, NgramConfigResult>;
  comparisons: Comparisons;
}

export interface ConfigurationDetailResponse {
  configuration: string;
  result: NgramConfigResult;
}

class NgramAnalysisService {
  /**
   * Obtener lista de análisis de N-gramas
   */
  async getNgramAnalyses(): Promise<NgramAnalysisListItem[]> {
    const response = await apiClient.get('/ngram-analysis/');
    // Handle both paginated and plain array responses
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results;
    }
    return response.data || [];
  }

  /**
   * Obtener detalle completo de un análisis de N-gramas
   */
  async getNgramAnalysisById(id: number): Promise<NgramAnalysis> {
    const response = await apiClient.get(`/ngram-analysis/${id}/`);
    return response.data;
  }

  /**
   * Crear nuevo análisis de N-gramas
   */
  async createNgramAnalysis(data: NgramAnalysisCreateRequest): Promise<NgramAnalysis> {
    const response = await apiClient.post('/ngram-analysis/', data);
    return response.data;
  }

  /**
   * Eliminar análisis de N-gramas
   */
  async deleteNgramAnalysis(id: number): Promise<void> {
    await apiClient.delete(`/ngram-analysis/${id}/`);
  }

  /**
   * Obtener progreso de un análisis en tiempo real
   *
   * Usado para polling cada 2-3 segundos mientras está procesando
   */
  async getProgress(id: number): Promise<ProgressData> {
    const response = await apiClient.get(`/ngram-analysis/${id}/progress/`);
    return response.data;
  }

  /**
   * Obtener comparación detallada entre configuraciones
   */
  async getComparison(id: number): Promise<ComparisonResponse> {
    const response = await apiClient.get(`/ngram-analysis/${id}/comparison/`);
    return response.data;
  }

  /**
   * Obtener detalle de una configuración específica
   *
   * @param id ID del análisis
   * @param configKey Clave de configuración (ej: "1_2" para (1,2))
   */
  async getConfigurationDetail(id: number, configKey: string): Promise<ConfigurationDetailResponse> {
    const response = await apiClient.get(`/ngram-analysis/${id}/configuration_detail/`, {
      params: { config: configKey }
    });
    return response.data;
  }
}

export default new NgramAnalysisService();
