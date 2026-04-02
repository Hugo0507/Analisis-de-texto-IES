/**
 * BERTopic Analysis Service
 *
 * Servicio para gestionar análisis de BERTopic (Topic Modeling con BERT).
 */

import apiClient from './api';

// ============================================================
// INTERFACES
// ============================================================

/**
 * Modelo de embeddings disponible
 */
export interface EmbeddingModel {
  id: string;
  name: string;
  full_name: string;
  language: string;
  size_mb: number;
  speed: 'very_fast' | 'fast' | 'moderate';
  quality: 'good' | 'excellent';
  description: string;
  pros: string[];
  cons: string[];
  use_cases: string;
  recommended: boolean;
}

/**
 * Grupo de modelos de embeddings
 */
export interface EmbeddingModelsResponse {
  embedding_models: EmbeddingModel[];
}

/**
 * Palabra de un tópico con su peso
 */
export interface TopicWord {
  word: string;
  weight: number;
}

/**
 * Tópico extraído
 */
export interface Topic {
  topic_id: number;
  topic_label: string;
  words: TopicWord[];
  num_documents: number;
}

/**
 * Asignación de documento a tópico
 */
export interface DocumentTopic {
  document_id: number;
  topic_id: number;
  text_preview: string;
}

/**
 * Distribución de tópicos
 */
export interface TopicDistribution {
  topic_id: number;
  topic_label: string;
  count: number;
  percentage: number;
}

/**
 * Tamaños de tópicos
 */
export interface TopicSizes {
  [key: string]: number;
}

/**
 * Punto de proyección 2D
 */
export interface ProjectionPoint {
  x: number;
  y: number;
  topic_id: number;
  topic_label: string;
}

/**
 * Proyecciones 2D del análisis
 */
export interface Projections2D {
  pca: ProjectionPoint[];
  tsne: ProjectionPoint[];
  umap: ProjectionPoint[];
}

/**
 * Item de lista de análisis BERTopic (resumen)
 */
export interface BERTopicListItem {
  id: number;
  name: string;
  description: string;
  embedding_model: string;
  embedding_model_display: string;
  num_topics_found: number;
  num_words: number;
  source_type: 'data_preparation' | 'dataset';
  source_name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  status_display: string;
  progress_percentage: number;
  documents_processed: number;
  coherence_score: number | null;
  num_outliers: number;
  created_by_username: string;
  created_at: string;
}

/**
 * Análisis BERTopic completo (detalle)
 */
export interface BERTopicAnalysis {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_by_username: string;

  // Data source
  source_type: 'data_preparation' | 'dataset';
  data_preparation: number | null;
  dataset: number | null;
  source_name: string;

  // Configuration
  embedding_model: string;
  embedding_model_display: string;
  n_neighbors: number;
  n_components: number;
  min_cluster_size: number;
  min_samples: number;
  nr_topics: number | null;
  num_words: number;
  random_seed: number | null;

  // Status & Progress
  status: 'pending' | 'processing' | 'completed' | 'error';
  status_display: string;
  current_stage: string;
  current_stage_display: string;
  progress_percentage: number;
  error_message: string | null;

  // Results - General
  documents_processed: number;
  vocabulary_size: number;
  num_topics_found: number;
  coherence_score: number | null;
  num_outliers: number;

  // Results - Detailed
  topics: Topic[];
  document_topics: DocumentTopic[];
  topic_distribution: TopicDistribution[];
  topic_sizes: TopicSizes;
  projections_2d: Projections2D | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
}

/**
 * Datos para crear análisis BERTopic
 */
export interface BERTopicCreateRequest {
  name: string;
  description?: string;
  source_type: 'data_preparation' | 'dataset';
  data_preparation?: number;
  dataset?: number;
  embedding_model: string;
  n_neighbors?: number;
  n_components?: number;
  min_cluster_size?: number;
  min_samples?: number;
  nr_topics?: number | null;
  num_words?: number;
  random_seed?: number | null;
}

/**
 * Datos para actualizar análisis BERTopic
 */
export interface BERTopicUpdateRequest {
  name?: string;
  description?: string;
}

/**
 * Progreso de procesamiento
 */
export interface ProgressData {
  status: 'pending' | 'processing' | 'completed' | 'error';
  status_display: string;
  current_stage: string;
  current_stage_display: string;
  progress_percentage: number;
  error_message: string | null;
}

/**
 * Estadísticas generales
 */
export interface StatsData {
  total: number;
  by_status: { [key: string]: number };
  by_embedding_model: { [key: string]: number };
}

// ============================================================
// SERVICIO
// ============================================================

export const bertopicService = {
  /**
   * Listar análisis BERTopic
   */
  getBERTopicAnalyses: async (): Promise<BERTopicListItem[]> => {
    const response = await apiClient.get('/bertopic/');
    return response.data.results || response.data;
  },

  /**
   * Obtener análisis BERTopic por ID
   */
  getBERTopicById: async (id: number): Promise<BERTopicAnalysis> => {
    const response = await apiClient.get(`/bertopic/${id}/`);
    return response.data;
  },

  /**
   * Crear nuevo análisis BERTopic
   */
  createBERTopic: async (data: BERTopicCreateRequest): Promise<BERTopicAnalysis> => {
    const response = await apiClient.post('/bertopic/', data, {
      timeout: 300000, // 5 minutos
    });
    return response.data;
  },

  /**
   * Actualizar análisis BERTopic
   */
  updateBERTopic: async (id: number, data: BERTopicUpdateRequest): Promise<BERTopicAnalysis> => {
    const response = await apiClient.patch(`/bertopic/${id}/`, data);
    return response.data;
  },

  /**
   * Eliminar análisis BERTopic
   */
  deleteBERTopic: async (id: number): Promise<void> => {
    await apiClient.delete(`/bertopic/${id}/`);
  },

  /**
   * Obtener progreso de procesamiento
   */
  getProgress: async (id: number): Promise<ProgressData> => {
    const response = await apiClient.get(`/bertopic/${id}/progress/`);
    return response.data;
  },

  /**
   * Obtener estadísticas generales
   */
  getStats: async (): Promise<StatsData> => {
    const response = await apiClient.get('/bertopic/stats/');
    return response.data;
  },

  /**
   * Obtener modelos de embeddings disponibles
   */
  getEmbeddingModels: async (): Promise<EmbeddingModelsResponse> => {
    const response = await apiClient.get('/bertopic/embedding_models/');
    return response.data;
  },

  /**
   * Obtener proyecciones 2D (PCA, t-SNE, UMAP) del análisis
   */
  getProjections: async (id: number): Promise<Projections2D> => {
    const response = await apiClient.get(`/bertopic/${id}/projections/`);
    return response.data.projections_2d;
  },
};

export default bertopicService;
