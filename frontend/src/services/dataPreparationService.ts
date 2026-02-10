/**
 * Data Preparation Service
 *
 * Maneja preparación y limpieza de datos NLP.
 */

import apiClient from './api';

// Interfaces
export interface DataPreparation {
  id: number;
  name: string;
  dataset: {
    id: number;
    name: string;
  };

  // Configuración
  custom_stopwords: string[];
  filter_by_predominant_language: boolean;
  enable_tokenization: boolean;
  enable_lemmatization: boolean;
  enable_special_chars_removal: boolean;
  enable_integrity_check: boolean;
  enable_duplicate_removal: boolean;

  // Estado
  status: 'pending' | 'processing' | 'completed' | 'error';
  current_stage: string | null;
  current_stage_label: string | null;
  progress_percentage: number;
  error_message: string | null;

  // Resultados
  detected_languages: Record<string, number>;
  predominant_language: string | null;
  predominant_language_percentage: number;
  total_files_analyzed: number;
  files_processed: number;
  files_omitted: number;
  duplicates_removed: number;

  // Metadatos
  processing_started_at: string | null;
  processing_completed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_email: string;
}

export interface DataPreparationListItem {
  id: number;
  name: string;
  dataset_name: string;
  predominant_language: string | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress_percentage: number;
  current_stage_label: string | null;
  created_at: string;
}

export interface DataPreparationCreateRequest {
  name: string;
  dataset_id: number;
  custom_stopwords: string[];
  filter_by_predominant_language: boolean;
  enable_tokenization: boolean;
  enable_lemmatization: boolean;
  enable_special_chars_removal: boolean;
  enable_integrity_check: boolean;
  enable_duplicate_removal: boolean;
}

export interface ProgressData {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress_percentage: number;
  current_stage: string | null;
  current_stage_label: string | null;
  error_message: string | null;
}

export interface StatsData {
  total_preparations: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface FileDetail {
  id: number;
  original_filename: string;
}

export interface FileDetailsData {
  processed: FileDetail[];
  omitted: FileDetail[];
  duplicates: FileDetail[];
}

export interface DatasetChanges {
  has_changes: boolean;
  added_count: number;
  deleted_count: number;
  added_files: FileDetail[];
  deleted_files: FileDetail[];
  current_total: number;
  original_total: number;
}

// Códigos de idioma a nombres y banderas
export const LANGUAGE_NAMES: Record<string, { name: string; flag: string }> = {
  'en': { name: 'Inglés', flag: '🇺🇸' },
  'es': { name: 'Español', flag: '🇪🇸' },
  'pt': { name: 'Portugués', flag: '🇵🇹' },
  'fr': { name: 'Francés', flag: '🇫🇷' },
  'de': { name: 'Alemán', flag: '🇩🇪' },
  'it': { name: 'Italiano', flag: '🇮🇹' },
  'ru': { name: 'Ruso', flag: '🇷🇺' },
  'zh': { name: 'Chino', flag: '🇨🇳' },
  'ja': { name: 'Japonés', flag: '🇯🇵' },
  'ko': { name: 'Coreano', flag: '🇰🇷' },
  'ar': { name: 'Árabe', flag: '🇸🇦' },
  'hr': { name: 'Croata', flag: '🇭🇷' },
  'nl': { name: 'Holandés', flag: '🇳🇱' },
  'pl': { name: 'Polaco', flag: '🇵🇱' },
  'cs': { name: 'Checo', flag: '🇨🇿' },
  'sv': { name: 'Sueco', flag: '🇸🇪' },
  'da': { name: 'Danés', flag: '🇩🇰' },
  'fi': { name: 'Finlandés', flag: '🇫🇮' },
  'no': { name: 'Noruego', flag: '🇳🇴' },
  'hu': { name: 'Húngaro', flag: '🇭🇺' },
  'ro': { name: 'Rumano', flag: '🇷🇴' },
  'bg': { name: 'Búlgaro', flag: '🇧🇬' },
  'uk': { name: 'Ucraniano', flag: '🇺🇦' },
  'el': { name: 'Griego', flag: '🇬🇷' },
  'tr': { name: 'Turco', flag: '🇹🇷' },
  'vi': { name: 'Vietnamita', flag: '🇻🇳' },
  'th': { name: 'Tailandés', flag: '🇹🇭' },
  'id': { name: 'Indonesio', flag: '🇮🇩' },
  'ms': { name: 'Malayo', flag: '🇲🇾' },
  'tl': { name: 'Tagalo', flag: '🇵🇭' },
  'hi': { name: 'Hindi', flag: '🇮🇳' },
  'bn': { name: 'Bengalí', flag: '🇧🇩' },
  'ta': { name: 'Tamil', flag: '🇮🇳' },
  'he': { name: 'Hebreo', flag: '🇮🇱' },
  'fa': { name: 'Persa', flag: '🇮🇷' },
  'ur': { name: 'Urdu', flag: '🇵🇰' },
  'sw': { name: 'Swahili', flag: '🇰🇪' },
  'ca': { name: 'Catalán', flag: '🏴' },
  'gl': { name: 'Gallego', flag: '🏴' },
  'eu': { name: 'Euskera', flag: '🏴' },
  'sk': { name: 'Eslovaco', flag: '🇸🇰' },
  'sl': { name: 'Esloveno', flag: '🇸🇮' },
  'lt': { name: 'Lituano', flag: '🇱🇹' },
  'lv': { name: 'Letón', flag: '🇱🇻' },
  'et': { name: 'Estonio', flag: '🇪🇪' },
  'sq': { name: 'Albanés', flag: '🇦🇱' },
  'mk': { name: 'Macedonio', flag: '🇲🇰' },
  'af': { name: 'Afrikáans', flag: '🇿🇦' },
  'cy': { name: 'Galés', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  'sr': { name: 'Serbio', flag: '🇷🇸' },
  'bs': { name: 'Bosnio', flag: '🇧🇦' },
  'unknown': { name: 'Desconocido', flag: '❓' },
};

class DataPreparationService {
  /**
   * Obtener lista de preparaciones
   */
  async getPreparations(): Promise<DataPreparationListItem[]> {
    const response = await apiClient.get('/data-preparation/');
    // Handle both paginated and plain array responses
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results;
    }
    return response.data;
  }

  /**
   * Obtener detalle de una preparación
   */
  async getPreparation(id: number): Promise<DataPreparation> {
    const response = await apiClient.get(`/data-preparation/${id}/`);
    return response.data;
  }

  /**
   * Crear nueva preparación e iniciar procesamiento
   */
  async createPreparation(data: DataPreparationCreateRequest): Promise<DataPreparation> {
    const response = await apiClient.post('/data-preparation/', data, {
      timeout: 300000, // 5 minutos (inicia proceso pero no espera a que termine)
    });
    return response.data;
  }

  /**
   * Eliminar preparación
   */
  async deletePreparation(id: number): Promise<void> {
    await apiClient.delete(`/data-preparation/${id}/`);
  }

  /**
   * Obtener progreso en tiempo real
   */
  async getProgress(id: number): Promise<ProgressData> {
    const response = await apiClient.get(`/data-preparation/${id}/progress/`);
    return response.data;
  }

  /**
   * Obtener estadísticas generales
   */
  async getStats(): Promise<StatsData> {
    const response = await apiClient.get('/data-preparation/stats/');
    return response.data;
  }

  /**
   * Obtener detalles de archivos (procesados, omitidos, duplicados)
   */
  async getFileDetails(id: number): Promise<FileDetailsData> {
    const response = await apiClient.get(`/data-preparation/${id}/file_details/`);
    return response.data;
  }

  /**
   * Detectar cambios en el dataset original
   */
  async detectChanges(id: number): Promise<DatasetChanges> {
    const response = await apiClient.get(`/data-preparation/${id}/detect_changes/`);
    return response.data;
  }

  /**
   * Actualizar preparación con cambios detectados
   */
  async updatePreparation(id: number): Promise<DataPreparation> {
    const response = await apiClient.post(`/data-preparation/${id}/update_preparation/`);
    return response.data;
  }

  /**
   * Obtener nombre de idioma desde código
   */
  getLanguageName(code: string): string {
    return LANGUAGE_NAMES[code]?.name || code.toUpperCase();
  }

  /**
   * Obtener bandera de idioma desde código
   */
  getLanguageFlag(code: string): string {
    return LANGUAGE_NAMES[code]?.flag || '🌐';
  }
}

const dataPreparationService = new DataPreparationService();
export default dataPreparationService;
