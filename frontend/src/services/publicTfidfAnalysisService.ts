/**
 * Public TF-IDF Analysis Service
 *
 * Read-only access to TF-IDF analyses for the public dashboard.
 */

import publicApiClient from './publicApi';
import type { TfIdfAnalysisListItem, TfIdfAnalysis } from './tfidfAnalysisService';

export interface DocTermMatrixRow {
  id: string;
  data: Array<{ x: string; y: number }>;
}

export interface DocTermMatrix {
  top_terms: string[];
  top_docs: string[];
  matrix: DocTermMatrixRow[];
}

class PublicTfIdfAnalysisService {
  async getTfIdfAnalyses(datasetId?: number): Promise<TfIdfAnalysisListItem[]> {
    const params = datasetId ? { dataset_id: datasetId } : {};
    const response = await publicApiClient.get('/tfidf-analysis/', { params });
    return response.data.results || response.data;
  }

  async getTfIdfAnalysis(id: number): Promise<TfIdfAnalysis> {
    const response = await publicApiClient.get(`/tfidf-analysis/${id}/`);
    return response.data;
  }

  async getDocTermMatrix(id: number, topTerms = 15, topDocs = 15): Promise<DocTermMatrix> {
    const response = await publicApiClient.get(`/tfidf-analysis/${id}/doc-term-matrix/`, {
      params: { top_terms: topTerms, top_docs: topDocs },
    });
    return response.data;
  }
}

const publicTfIdfAnalysisService = new PublicTfIdfAnalysisService();
export default publicTfIdfAnalysisService;
