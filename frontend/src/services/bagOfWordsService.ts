/**
 * Bag of Words Service
 *
 * Maneja análisis de Bolsa de Palabras (BoW).
 */

import apiClient from './api';

// Interfaces
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

export interface BagOfWords {
  id: number;
  name: string;
  description: string | null;

  // Relaciones
  data_preparation: DataPreparationInfo;
  created_by_email: string;

  // Configuración (Count Vectorizer)
  max_features: number;
  min_df: number;
  max_df: number;
  ngram_min: number;
  ngram_max: number;

  // Estado
  status: 'pending' | 'processing' | 'completed' | 'error';
  current_stage: string | null;
  current_stage_label: string | null;
  progress_percentage: number;
  error_message: string | null;

  // Resultados
  vocabulary_size: number;
  document_count: number;
  matrix_shape: MatrixShape;
  matrix_sparsity: number;
  top_terms: TopTerm[];
  vocabulary: Record<string, number>;
  feature_names: string[];
  avg_terms_per_document: number;
  total_term_occurrences: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
}

export interface BagOfWordsListItem {
  id: number;
  name: string;
  data_preparation_name: string;
  dataset_name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress_percentage: number;
  current_stage: string | null;
  current_stage_label: string | null;
  vocabulary_size: number;
  document_count: number;
  has_artifact: boolean;
  created_at: string;
}

export interface BagOfWordsCreateRequest {
  name: string;
  description?: string;
  data_preparation: number;
  max_features: number;
  min_df: number;
  max_df: number;
  ngram_min: number;
  ngram_max: number;
}

export interface BagOfWordsUpdateRequest {
  name: string;
  description?: string;
}

export interface ProgressData {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress_percentage: number;
  current_stage: string | null;
  current_stage_label: string | null;
  error_message: string | null;
}

export interface StatsData {
  total_analyses: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface VocabularyItem {
  term: string;
  index: number;
}

export interface VocabularyResponse {
  total: number;
  page: number;
  page_size: number;
  vocabulary: VocabularyItem[];
}

export interface TopTermsResponse {
  total_vocabulary: number;
  returned: number;
  top_terms: TopTerm[];
}

class BagOfWordsService {
  /**
   * Obtener lista de análisis BoW
   */
  async getBagOfWords(): Promise<BagOfWordsListItem[]> {
    const response = await apiClient.get('/bag-of-words/');
    // Handle both paginated and plain array responses
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results;
    }
    return response.data;
  }

  /**
   * Obtener detalle de un análisis BoW
   */
  async getBagOfWordsById(id: number): Promise<BagOfWords> {
    const response = await apiClient.get(`/bag-of-words/${id}/`);
    return response.data;
  }

  /**
   * Crear nuevo análisis BoW e iniciar procesamiento
   */
  async createBagOfWords(data: BagOfWordsCreateRequest): Promise<BagOfWords> {
    const response = await apiClient.post('/bag-of-words/', data, {
      timeout: 300000, // 5 minutos (inicia proceso pero no espera a que termine)
    });
    return response.data;
  }

  /**
   * Actualizar análisis BoW (solo nombre y descripción)
   */
  async updateBagOfWords(id: number, data: BagOfWordsUpdateRequest): Promise<BagOfWords> {
    const response = await apiClient.patch(`/bag-of-words/${id}/`, data);
    return response.data;
  }

  /**
   * Eliminar análisis BoW
   */
  async deleteBagOfWords(id: number): Promise<void> {
    await apiClient.delete(`/bag-of-words/${id}/`);
  }

  /**
   * Obtener progreso en tiempo real
   */
  async getProgress(id: number): Promise<ProgressData> {
    const response = await apiClient.get(`/bag-of-words/${id}/progress/`);
    return response.data;
  }

  /**
   * Obtener estadísticas generales
   */
  async getStats(): Promise<StatsData> {
    const response = await apiClient.get('/bag-of-words/stats/');
    return response.data;
  }

  /**
   * Obtener vocabulario completo (paginado)
   */
  async getVocabulary(id: number, page: number = 1, pageSize: number = 100): Promise<VocabularyResponse> {
    const response = await apiClient.get(`/bag-of-words/${id}/vocabulary/`, {
      params: { page, page_size: pageSize }
    });
    return response.data;
  }

  /**
   * Obtener top términos
   */
  async getTopTerms(id: number, limit: number = 50): Promise<TopTermsResponse> {
    const response = await apiClient.get(`/bag-of-words/${id}/top_terms/`, {
      params: { limit }
    });
    return response.data;
  }
}

const bagOfWordsService = new BagOfWordsService();
export default bagOfWordsService;
