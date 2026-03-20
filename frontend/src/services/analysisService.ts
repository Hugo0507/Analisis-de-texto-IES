/**
 * Analysis Service
 *
 * API service for analysis endpoints (BoW, TF-IDF, Topics, Factors).
 */

import apiClient from './api';

// ===== Bag of Words =====
export interface GenerateBowRequest {
  document_ids?: number[] | null;
  max_features?: number;
  min_df?: number;
  max_df?: number;
  ngram_range?: [number, number];
  use_cache?: boolean;
}

export interface BowResponse {
  success: boolean;
  cached?: boolean;
  cache_source?: string;
  document_count: number;
  vocabulary_size: number;
  matrix_shape: [number, number];
  sparsity: number;
  processing_time?: number;
}

// ===== TF-IDF =====
export interface CalculateTfidfRequest {
  document_ids?: number[] | null;
  max_features?: number;
  norm?: 'l1' | 'l2';
  use_idf?: boolean;
  sublinear_tf?: boolean;
  use_cache?: boolean;
}

export interface TfidfResponse {
  success: boolean;
  cached?: boolean;
  document_count: number;
  vocabulary_size: number;
  matrix_shape: [number, number];
  avg_tfidf_score: number;
}

// ===== Topic Modeling =====
export interface TrainTopicModelRequest {
  model_type: 'lda' | 'nmf' | 'lsa' | 'plsa';
  n_topics?: number;
  document_ids?: number[] | null;
  use_cache?: boolean;
}

export interface Topic {
  topic_id: number;
  top_words: Array<{ word: string; weight: number }>;
  coherence_score?: number;
}

export interface TopicModelResponse {
  success: boolean;
  cached?: boolean;
  model_type: string;
  n_topics: number;
  topics: Topic[];
  perplexity?: number;
  coherence?: number;
  reconstruction_error?: number;
  explained_variance?: number[];
}

export interface CompareModelsResponse {
  success: boolean;
  models: Record<string, {
    n_topics: number;
    coherence: number;
    perplexity?: number;
    reconstruction_error?: number;
    explained_variance?: number;
  }>;
  best_model: string;
}

// ===== Cooccurrence Graph =====
export interface CooccurrenceGraphNode {
  id: string;
  label: string;
  category: string;
  frequency: number;
  size: number;
}

export interface CooccurrenceGraphEdge {
  source: string;
  target: string;
  weight: number;
  strength: number;
}

export interface CooccurrenceGraphResponse {
  nodes: CooccurrenceGraphNode[];
  edges: CooccurrenceGraphEdge[];
}

// ===== Factor Catalog =====
export interface FactorCatalogItem {
  id: number;
  name: string;
  category: string;
  keywords: string[];
  keyword_count: number;
  global_frequency: number;
  relevance_score: number | null;
}

export interface FactorRunListItem {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  data_preparation_id: number | null;
  data_preparation_name: string | null;
  dataset_name: string | null;
  document_count: number;
  factor_count: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

// ===== Factor Analysis =====
export interface AnalyzeFactorsRequest {
  document_ids?: number[] | null;
  normalize_by_length?: boolean;
  use_cache?: boolean;
}

export interface Factor {
  factor_id: number;
  factor_name: string;
  category: string;
  global_frequency: number;
  document_coverage?: number;
  relevance_score: number;
}

export interface FactorAnalysisResponse {
  success: boolean;
  cached?: boolean;
  document_count: number;
  factor_count: number;
  global_statistics: Factor[];
  category_statistics: Record<string, {
    n_factors: number;
    avg_relevance: number;
    total_frequency: number;
    factors: string[];
  }>;
  co_occurrence: Array<{
    factor1_id: number;
    factor1_name: string;
    factor1_category: string;
    factor2_id: number;
    factor2_name: string;
    factor2_category: string;
    co_occurrence_count: number;
  }>;
  consolidated_ranking: Array<{
    rank: number;
    factor_id: number;
    factor_name: string;
    consolidated_score: number;
  }>;
}

class AnalysisService {
  // ===== Bag of Words =====
  async generateBow(data: GenerateBowRequest): Promise<BowResponse> {
    const response = await apiClient.post('/analysis/bow/generate/', data);
    return response.data;
  }

  async getDocumentBow(documentId: number, topN: number = 50): Promise<any> {
    const response = await apiClient.get(`/analysis/bow/${documentId}/`, {
      params: { top_n: topN },
    });
    return response.data;
  }

  async getVocabularyStats(): Promise<any> {
    const response = await apiClient.get('/analysis/bow/vocabulary/');
    return response.data;
  }

  // ===== TF-IDF =====
  async calculateTfidf(data: CalculateTfidfRequest): Promise<TfidfResponse> {
    const response = await apiClient.post('/analysis/tfidf/calculate/', data);
    return response.data;
  }

  async getDocumentTfidf(documentId: number, topN: number = 50): Promise<any> {
    const response = await apiClient.get(`/analysis/tfidf/${documentId}/`, {
      params: { top_n: topN },
    });
    return response.data;
  }

  async calculateSimilarity(docId1: number, docId2: number): Promise<any> {
    const response = await apiClient.get('/analysis/tfidf/similarity/', {
      params: { doc_id1: docId1, doc_id2: docId2 },
    });
    return response.data;
  }

  // ===== Topic Modeling =====
  async trainTopicModel(data: TrainTopicModelRequest): Promise<TopicModelResponse> {
    const response = await apiClient.post('/analysis/topics/train/', data);
    return response.data;
  }

  async getLdaResults(nTopics: number = 10, useCache: boolean = true): Promise<TopicModelResponse> {
    const response = await apiClient.get('/analysis/topics/lda/', {
      params: { n_topics: nTopics, use_cache: useCache },
    });
    return response.data;
  }

  async getNmfResults(nTopics: number = 10, useCache: boolean = true): Promise<TopicModelResponse> {
    const response = await apiClient.get('/analysis/topics/nmf/', {
      params: { n_topics: nTopics, use_cache: useCache },
    });
    return response.data;
  }

  async getLsaResults(nTopics: number = 10, useCache: boolean = true): Promise<TopicModelResponse> {
    const response = await apiClient.get('/analysis/topics/lsa/', {
      params: { n_topics: nTopics, use_cache: useCache },
    });
    return response.data;
  }

  async getPlsaResults(nTopics: number = 10, useCache: boolean = true): Promise<TopicModelResponse> {
    const response = await apiClient.get('/analysis/topics/plsa/', {
      params: { n_topics: nTopics, use_cache: useCache },
    });
    return response.data;
  }

  async compareModels(nTopics: number = 10): Promise<CompareModelsResponse> {
    const response = await apiClient.get('/analysis/topics/compare/', {
      params: { n_topics: nTopics },
    });
    return response.data;
  }

  // ===== Factor Analysis (legacy) =====
  async analyzeFactors(data: AnalyzeFactorsRequest): Promise<FactorAnalysisResponse> {
    const response = await apiClient.post('/analysis/factors/analyze/', data);
    return response.data;
  }

  async getDocumentFactors(documentId: number, topN: number = 16): Promise<any> {
    const response = await apiClient.get(`/analysis/factors/${documentId}/`, {
      params: { top_n: topN },
    });
    return response.data;
  }

  async getFactorStatistics(): Promise<any> {
    const response = await apiClient.get('/analysis/factors/statistics/');
    return response.data;
  }

  async getCooccurrenceGraph(): Promise<CooccurrenceGraphResponse> {
    const response = await apiClient.get('/analysis/factors/cooccurrence-graph/');
    return response.data;
  }

  async seedFactors(): Promise<any> {
    const response = await apiClient.post('/analysis/factors/seed/');
    return response.data;
  }

  // ===== Factor Catalog CRUD =====
  async listFactors(): Promise<{ success: boolean; factors: FactorCatalogItem[]; total: number }> {
    const response = await apiClient.get('/analysis/factors-catalog/');
    return response.data;
  }

  async createFactor(data: { name: string; category: string; keywords: string[] }): Promise<any> {
    const response = await apiClient.post('/analysis/factors-catalog/', data);
    return response.data;
  }

  async updateFactor(id: number, data: Partial<{ name: string; category: string; keywords: string[] }>): Promise<any> {
    const response = await apiClient.patch(`/analysis/factors-catalog/${id}/`, data);
    return response.data;
  }

  async deleteFactor(id: number): Promise<any> {
    const response = await apiClient.delete(`/analysis/factors-catalog/${id}/`);
    return response.data;
  }

  // ===== Factor Analysis Runs =====
  async listFactorRuns(): Promise<{ success: boolean; runs: FactorRunListItem[]; total: number }> {
    const response = await apiClient.get('/analysis/factor-runs/');
    return response.data;
  }

  async createFactorRun(data: { name: string; data_preparation_id?: number | null }): Promise<any> {
    const response = await apiClient.post('/analysis/factor-runs/', data);
    return response.data;
  }

  async getFactorRun(id: number): Promise<any> {
    const response = await apiClient.get(`/analysis/factor-runs/${id}/`);
    return response.data;
  }

  async deleteFactorRun(id: number): Promise<any> {
    const response = await apiClient.delete(`/analysis/factor-runs/${id}/`);
    return response.data;
  }

  /**
   * Descarga los resultados de análisis de factores como CSV.
   * Usa responseType blob para que el navegador descargue el archivo directamente.
   */
  async exportFactorsCSV(): Promise<void> {
    const response = await apiClient.get('/analysis/factors/export/', {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'factores_transformacion_digital.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

const analysisService = new AnalysisService();
export default analysisService;
