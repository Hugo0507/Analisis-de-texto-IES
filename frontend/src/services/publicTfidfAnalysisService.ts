/**
 * Public TF-IDF Analysis Service
 *
 * Read-only access to TF-IDF analyses for the public dashboard.
 */

import publicApiClient from './publicApi';
import type { TfIdfAnalysisListItem, TfIdfAnalysis } from './tfidfAnalysisService';

class PublicTfIdfAnalysisService {
  async getTfIdfAnalyses(): Promise<TfIdfAnalysisListItem[]> {
    const response = await publicApiClient.get('/tfidf-analysis/');
    return response.data.results || response.data;
  }

  async getTfIdfAnalysis(id: number): Promise<TfIdfAnalysis> {
    const response = await publicApiClient.get(`/tfidf-analysis/${id}/`);
    return response.data;
  }
}

const publicTfIdfAnalysisService = new PublicTfIdfAnalysisService();
export default publicTfIdfAnalysisService;
