/**
 * Topic Modeling Service
 *
 * Servicio para gestión de análisis de Topic Modeling (LSA, NMF, PLSA, LDA).
 */

import apiClient from './api';

// ============================================================
// INTERFACES
// ============================================================

/**
 * Estado del análisis
 */
export type TopicModelingStatus = 'pending' | 'processing' | 'completed' | 'error';

/**
 * Etapa actual del procesamiento
 */
export type TopicModelingStage =
  | 'pending'
  | 'loading_data'
  | 'preprocessing'
  | 'vectorizing'
  | 'training_model'
  | 'extracting_topics'
  | 'calculating_coherence'
  | 'saving_results'
  | 'completed';

/**
 * Tipo de fuente de datos
 */
export type TopicModelingSourceType = 'data_preparation' | 'dataset';

/**
 * Algoritmos soportados
 */
export type TopicModelingAlgorithm = 'lsa' | 'nmf' | 'plsa' | 'lda';

/**
 * Palabra en un tópico
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
}

/**
 * Documento con su tópico asignado
 */
export interface DocumentTopic {
  document_id: number;
  document_name: string;
  dominant_topic: number;
  topic_distribution: number[];
  dominant_topic_weight: number;
}

/**
 * Distribución de tópico
 */
export interface TopicDistribution {
  topic_id: number;
  topic_label: string;
  document_count: number;
  percentage: number;
}

/**
 * Información de algoritmo
 */
export interface AlgorithmInfo {
  id: string;
  name: string;
  full_name: string;
  category: 'Non-Probabilistic' | 'Probabilistic';
  description: string;
  pros: string[];
  cons: string[];
  use_cases: string;
}

/**
 * Topic Modeling completo (detalle)
 */
export interface TopicModeling {
  // Información básica
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_by_username: string;

  // Origen de datos
  source_type: TopicModelingSourceType;
  source_name: string;
  data_preparation: number | null;
  dataset: number | null;

  // Configuración
  algorithm: TopicModelingAlgorithm;
  algorithm_display: string;
  algorithm_category: string;
  is_probabilistic: boolean;
  num_topics: number;
  num_words: number;
  max_iterations: number;
  random_seed: number | null;

  // Estado y progreso
  status: TopicModelingStatus;
  status_display: string;
  current_stage: TopicModelingStage;
  current_stage_display: string;
  progress_percentage: number;
  error_message: string | null;

  // Resultados generales
  documents_processed: number;
  vocabulary_size: number;
  coherence_score: number | null;
  perplexity_score: number | null;

  // Resultados detallados
  topics: Topic[];
  document_topics: DocumentTopic[];
  topic_distribution: TopicDistribution[];

  // Timestamps
  created_at: string;
  updated_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
}

/**
 * Topic Modeling resumido (para lista)
 */
export interface TopicModelingListItem {
  id: number;
  name: string;
  description: string;
  algorithm: TopicModelingAlgorithm;
  algorithm_display: string;
  algorithm_category: string;
  num_topics: number;
  num_words: number;
  source_type: TopicModelingSourceType;
  source_name: string;
  status: TopicModelingStatus;
  status_display: string;
  progress_percentage: number;
  documents_processed: number;
  coherence_score: number | null;
  created_by_username: string;
  created_at: string;
}

/**
 * Datos para crear nuevo Topic Modeling
 */
export interface TopicModelingCreateRequest {
  name: string;
  description?: string;
  source_type: TopicModelingSourceType;
  data_preparation?: number;
  dataset?: number;
  algorithm: TopicModelingAlgorithm;
  num_topics: number;
  num_words: number;
  max_iterations?: number;
  random_seed?: number;
}

/**
 * Datos para actualizar Topic Modeling
 */
export interface TopicModelingUpdateRequest {
  name?: string;
  description?: string;
}

/**
 * Progreso del procesamiento
 */
export interface ProgressData {
  status: TopicModelingStatus;
  status_display: string;
  progress_percentage: number;
  current_stage: TopicModelingStage;
  current_stage_display: string;
  error_message: string | null;
}

/**
 * Estadísticas
 */
export interface StatsData {
  total: number;
  by_status: Record<string, number>;
  by_algorithm: Record<string, number>;
}

/**
 * Respuesta de algoritmos
 */
export interface AlgorithmsResponse {
  algorithms: AlgorithmInfo[];
}

// ============================================================
// SERVICIO
// ============================================================

const topicModelingService = {
  /**
   * Obtener lista de topic modelings del usuario
   */
  getTopicModelings: async (): Promise<TopicModelingListItem[]> => {
    const response = await apiClient.get('/topic-modeling/');
    return response.data;
  },

  /**
   * Obtener detalle de un topic modeling
   */
  getTopicModelingById: async (id: number): Promise<TopicModeling> => {
    const response = await apiClient.get(`/topic-modeling/${id}/`);
    return response.data;
  },

  /**
   * Crear nuevo topic modeling
   */
  createTopicModeling: async (data: TopicModelingCreateRequest): Promise<TopicModeling> => {
    const response = await apiClient.post('/topic-modeling/', data, {
      timeout: 300000, // 5 minutos
    });
    return response.data;
  },

  /**
   * Actualizar topic modeling (nombre y descripción)
   */
  updateTopicModeling: async (
    id: number,
    data: TopicModelingUpdateRequest
  ): Promise<TopicModeling> => {
    const response = await apiClient.patch(`/topic-modeling/${id}/`, data);
    return response.data;
  },

  /**
   * Eliminar topic modeling
   */
  deleteTopicModeling: async (id: number): Promise<void> => {
    await apiClient.delete(`/topic-modeling/${id}/`);
  },

  /**
   * Obtener progreso de procesamiento (para polling)
   */
  getProgress: async (id: number): Promise<ProgressData> => {
    const response = await apiClient.get(`/topic-modeling/${id}/progress/`);
    return response.data;
  },

  /**
   * Obtener estadísticas generales
   */
  getStats: async (): Promise<StatsData> => {
    const response = await apiClient.get('/topic-modeling/stats/');
    return response.data;
  },

  /**
   * Obtener información de algoritmos disponibles
   */
  getAlgorithms: async (): Promise<AlgorithmsResponse> => {
    const response = await apiClient.get('/topic-modeling/algorithms/');
    return response.data;
  },
};

export default topicModelingService;
