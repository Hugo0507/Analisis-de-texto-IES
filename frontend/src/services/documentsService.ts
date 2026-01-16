/**
 * Documents Service
 *
 * API service for document management endpoints.
 */

import apiClient from './api';

export interface Document {
  id: number;
  drive_file_id: string;
  filename: string;
  language_code?: string;
  language_confidence?: number;
  txt_content?: string;
  preprocessed_text?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Document[];
}

export interface UploadDocumentsRequest {
  folder_id: string;
  mime_type?: string;
  max_files?: number;
}

export interface UploadDocumentsResponse {
  success: boolean;
  uploaded_count: number;
  failed_count: number;
  skipped_count: number;
  documents: Document[];
  failed_files?: Array<{ filename: string; error: string }>;
}

export interface PreprocessTextRequest {
  document_ids?: number[] | null;
  remove_stopwords?: boolean;
  remove_punctuation?: boolean;
  remove_numbers?: boolean;
  apply_stemming?: boolean;
  min_word_length?: number;
  max_word_length?: number;
}

export interface TextStatistics {
  raw_text: {
    length: number;
    word_count: number;
    unique_words: number;
  };
  preprocessed_text: {
    length: number;
    token_count: number;
    vocabulary_size: number;
  };
  removed: {
    stopwords: number;
    punctuation: number;
    numbers: number;
  };
}

class DocumentsService {
  /**
   * List documents with pagination
   */
  async list(page: number = 1, pageSize: number = 50): Promise<DocumentListResponse> {
    const response = await apiClient.get('/documents/', {
      params: { page, page_size: pageSize },
    });
    return response.data;
  }

  /**
   * Get document by ID
   */
  async get(id: number): Promise<Document> {
    const response = await apiClient.get(`/documents/${id}/`);
    return response.data;
  }

  /**
   * Upload documents from Google Drive
   * Note: Uses extended timeout (5 minutes) as Drive operations can take time
   */
  async upload(data: UploadDocumentsRequest): Promise<UploadDocumentsResponse> {
    const response = await apiClient.post('/documents/upload/', data, {
      timeout: 300000, // 5 minutes for Drive operations
    });
    return response.data;
  }

  /**
   * Detect language for documents (batch)
   */
  async detectLanguageBatch(documentIds?: number[]): Promise<unknown> {
    const response = await apiClient.post('/documents/detect-language-batch/', {
      document_ids: documentIds,
    });
    return response.data;
  }

  /**
   * Convert PDFs to TXT (batch)
   */
  async convertBatch(documentIds?: number[], downloadFromDrive: boolean = true): Promise<unknown> {
    const response = await apiClient.post('/documents/convert-batch/', {
      document_ids: documentIds,
      download_from_drive: downloadFromDrive,
    });
    return response.data;
  }

  /**
   * Preprocess text (batch)
   */
  async preprocessBatch(data: PreprocessTextRequest): Promise<unknown> {
    const response = await apiClient.post('/documents/preprocess-batch/', data);
    return response.data;
  }

  /**
   * Get text statistics for a document
   */
  async getStatistics(id: number): Promise<{ success: boolean; statistics: TextStatistics }> {
    const response = await apiClient.get(`/documents/${id}/statistics/`);
    return response.data;
  }
}

const documentsService = new DocumentsService();
export default documentsService;
