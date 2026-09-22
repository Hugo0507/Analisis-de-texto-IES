/**
 * Public LSTM Service
 *
 * Acceso de solo lectura a las clasificaciones LSTM completadas, para el
 * dashboard público. El endpoint filtra por `status='completed'` y no
 * serializa ese campo (siempre lo es); se lo agregamos al mapear cada
 * resultado para poder reutilizar `porMasReciente`/`masRecienteCompletado`
 * de `utils/ordenAnalisis.ts`, igual que las demás secciones del dashboard.
 */

import publicApiClient from './publicApi';

export type LstmLabelMode = 'topic' | 'oe3';

export interface ClassificationEntry {
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

interface LstmListFields {
  id: number;
  name: string;
  label_mode: LstmLabelMode;
  fragment_words: number;
  data_preparation: number;
  data_preparation_name: string;
  dataset_id: number;
  topic_modeling: number;
  topic_modeling_name: string;
  topic_modeling_algorithm: string;
  documents_used: number;
  samples_used: number | null;
  num_classes: number;
  accuracy: number | null;
  macro_f1: number | null;
  baseline_accuracy: number | null;
  baseline_macro_f1: number | null;
  fragment_accuracy: number | null;
  fragment_macro_f1: number | null;
  num_epochs: number;
  training_time_seconds: number | null;
  created_at: string;
  processing_completed_at: string | null;
}

export interface LstmAnalysisListItem extends LstmListFields {
  /** El endpoint público solo devuelve análisis completados; se agrega aquí. */
  status: 'completed';
}

interface LstmDetailFields extends LstmListFields {
  description: string | null;
  label_mode_display: string;
  embedding_dim: number;
  hidden_dim: number;
  num_layers: number;
  learning_rate: number;
  batch_size: number;
  train_split: number;
  max_vocab_size: number;
  max_seq_length: number;
  vocab_size_actual: number;
  loss_history: number[];
  confusion_matrix: number[][];
  classification_report: Record<string, ClassificationEntry>;
  class_labels: string[];
}

export interface LstmAnalysisDetail extends LstmDetailFields {
  status: 'completed';
}

class PublicLstmService {
  async list(datasetId?: number): Promise<LstmAnalysisListItem[]> {
    const params = datasetId ? { dataset_id: datasetId } : {};
    const response = await publicApiClient.get('/lstm-analysis/', { params });
    const results = (response.data.results ?? response.data) as LstmListFields[];
    return results.map((item) => ({ ...item, status: 'completed' as const }));
  }

  async getById(id: number): Promise<LstmAnalysisDetail> {
    const response = await publicApiClient.get(`/lstm-analysis/${id}/`);
    return { ...(response.data as LstmDetailFields), status: 'completed' as const };
  }
}

const publicLstmService = new PublicLstmService();
export default publicLstmService;
