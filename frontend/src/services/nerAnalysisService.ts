/**
 * NER Analysis Service
 *
 * Servicio para gestión de análisis de Reconocimiento de Entidades Nombradas (NER)
 * usando spaCy en el backend.
 */

import apiClient from './api';

// ============================================================
// INTERFACES
// ============================================================

/**
 * Estado del análisis NER
 */
export type NerAnalysisStatus = 'pending' | 'processing' | 'completed' | 'error';

/**
 * Etapa actual del procesamiento
 */
export type NerAnalysisStage =
  | 'pending'
  | 'loading_model'
  | 'loading_data'
  | 'extracting_entities'
  | 'calculating_stats'
  | 'analyzing_cooccurrences'
  | 'saving_results'
  | 'completed';

/**
 * Tipo de fuente de datos
 */
export type NerSourceType = 'data_preparation' | 'dataset';

/**
 * Modelos spaCy soportados
 */
export type SpacyModel =
  | 'en_core_web_sm'
  | 'en_core_web_md'
  | 'en_core_web_lg'
  | 'en_core_web_trf'
  | 'es_core_news_sm'
  | 'es_core_news_md'
  | 'es_core_news_lg';

/**
 * Entidad extraída
 */
export interface Entity {
  text: string;
  label: string;
  frequency: number;
  documents: number[];
  document_count: number;
}

/**
 * Tipo de entidad con descripción
 */
export interface EntityType {
  type: string;
  label: string;
  description: string;
  examples: string;
}

/**
 * Grupo predefinido de entidades
 */
export interface EntityGroup {
  id: string;
  name: string;
  description: string;
  entities: string[];
  icon: string;
}

/**
 * Entidad top por tipo
 */
export interface TopEntity {
  text: string;
  frequency: number;
  document_count: number;
}

/**
 * Co-ocurrencia de entidades
 */
export interface Cooccurrence {
  entity1: {
    text: string;
    label: string;
  };
  entity2: {
    text: string;
    label: string;
  };
  cooccurrence_count: number;
  documents: number[];
  document_count: number;
}

/**
 * Distribución de entidades (para donut chart)
 */
export interface EntityDistribution {
  label: string;
  value: number;
  percentage: number;
}

/**
 * Información de la fuente de datos
 */
export interface NerSourceInfo {
  type: 'data_preparation' | 'dataset';
  id: number;
  name: string;
  dataset?: {
    id: number;
    name: string;
  };
  predominant_language?: string;
  files_processed?: number;
  total_files?: number;
}

/**
 * Item de lista de análisis NER
 */
export interface NerAnalysisListItem {
  id: number;
  name: string;
  source_type: NerSourceType;
  source_name: string;
  spacy_model: SpacyModel;
  spacy_model_label: string;
  status: NerAnalysisStatus;
  progress_percentage: number;
  current_stage: NerAnalysisStage | null;
  current_stage_label: string | null;
  documents_processed: number;
  total_entities_found: number;
  unique_entities_count: number;
  entity_types_count: number;
  created_at: string;
}

/**
 * Detalle completo de análisis NER
 */
export interface NerAnalysis {
  id: number;
  name: string;
  description: string | null;

  // Fuente de datos
  source_type: NerSourceType;
  source_info: NerSourceInfo | null;
  created_by_email: string;

  // Configuración
  spacy_model: SpacyModel;
  spacy_model_label: string;
  selected_entities: string[];

  // Estado
  status: NerAnalysisStatus;
  current_stage: NerAnalysisStage | null;
  current_stage_label: string | null;
  progress_percentage: number;
  error_message: string | null;

  // Resultados: Estadísticas
  documents_processed: number;
  total_entities_found: number;
  unique_entities_count: number;
  entity_types_found: Record<string, number>;

  // Resultados: Datos
  entities: Entity[];
  top_entities_by_type: Record<string, TopEntity[]>;
  cooccurrences: Cooccurrence[];
  entity_distribution: EntityDistribution[];

  // Timestamps
  created_at: string;
  updated_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
}

/**
 * Request para crear análisis NER
 */
export interface NerAnalysisCreateRequest {
  name: string;
  description?: string;
  source_type: NerSourceType;
  data_preparation?: number;
  dataset?: number;
  spacy_model: SpacyModel;
  selected_entities: string[];
}

/**
 * Request para actualizar análisis NER
 */
export interface NerAnalysisUpdateRequest {
  name?: string;
  description?: string;
}

/**
 * Datos de progreso en tiempo real
 */
export interface ProgressData {
  status: NerAnalysisStatus;
  progress_percentage: number;
  current_stage: NerAnalysisStage | null;
  current_stage_label: string | null;
  error_message: string | null;
}

/**
 * Estadísticas generales
 */
export interface NerStats {
  total_analyses: number;
  processing: number;
  completed: number;
  failed: number;
}

/**
 * Response de tipos de entidades
 */
export interface EntityTypesResponse {
  model: SpacyModel;
  entities: EntityType[];
  total: number;
}

/**
 * Response de grupos de entidades
 */
export interface EntityGroupsResponse {
  groups: EntityGroup[];
  total: number;
}

// ============================================================
// SERVICE
// ============================================================

/**
 * Servicio de API para análisis NER
 */
const nerAnalysisService = {
  /**
   * Obtener lista de todos los análisis NER del usuario
   */
  getNerAnalyses: async (): Promise<NerAnalysisListItem[]> => {
    const response = await apiClient.get<NerAnalysisListItem[]>('/ner-analysis/');
    return response.data;
  },

  /**
   * Obtener detalle completo de un análisis NER
   */
  getNerAnalysisById: async (id: number): Promise<NerAnalysis> => {
    const response = await apiClient.get<NerAnalysis>(`/ner-analysis/${id}/`);
    return response.data;
  },

  /**
   * Crear nuevo análisis NER e iniciar procesamiento
   */
  createNerAnalysis: async (data: NerAnalysisCreateRequest): Promise<NerAnalysis> => {
    const response = await apiClient.post<NerAnalysis>('/ner-analysis/', data, {
      timeout: 300000, // 5 minutos
    });
    return response.data;
  },

  /**
   * Actualizar análisis NER (solo nombre y descripción)
   */
  updateNerAnalysis: async (
    id: number,
    data: NerAnalysisUpdateRequest
  ): Promise<NerAnalysis> => {
    const response = await apiClient.patch<NerAnalysis>(`/ner-analysis/${id}/`, data);
    return response.data;
  },

  /**
   * Eliminar análisis NER
   */
  deleteNerAnalysis: async (id: number): Promise<void> => {
    await apiClient.delete(`/ner-analysis/${id}/`);
  },

  /**
   * Obtener progreso en tiempo real de un análisis
   * (Para polling cada 2 segundos)
   */
  getProgress: async (id: number): Promise<ProgressData> => {
    const response = await apiClient.get<ProgressData>(`/ner-analysis/${id}/progress/`);
    return response.data;
  },

  /**
   * Obtener estadísticas generales de análisis NER
   */
  getStats: async (): Promise<NerStats> => {
    const response = await apiClient.get<NerStats>('/ner-analysis/stats/');
    return response.data;
  },

  /**
   * Obtener tipos de entidades disponibles por modelo spaCy
   */
  getEntityTypes: async (model: SpacyModel = 'en_core_web_sm'): Promise<EntityTypesResponse> => {
    const response = await apiClient.get<EntityTypesResponse>(
      `/ner-analysis/entity_types/?model=${model}`
    );
    return response.data;
  },

  /**
   * Obtener grupos predefinidos de entidades
   */
  getEntityGroups: async (): Promise<EntityGroupsResponse> => {
    const response = await apiClient.get<EntityGroupsResponse>('/ner-analysis/entity_groups/');
    return response.data;
  },
};

export default nerAnalysisService;
