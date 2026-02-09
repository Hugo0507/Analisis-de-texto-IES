/**
 * Public NER Analysis Service
 *
 * Read-only access to NER analyses for the public dashboard.
 */

import publicApiClient from './publicApi';
import type { NerAnalysisListItem, NerAnalysis } from './nerAnalysisService';

class PublicNerAnalysisService {
  async getNerAnalyses(): Promise<NerAnalysisListItem[]> {
    const response = await publicApiClient.get('/ner-analysis/');
    return response.data.results || response.data;
  }

  async getNerAnalysisById(id: number): Promise<NerAnalysis> {
    const response = await publicApiClient.get(`/ner-analysis/${id}/`);
    return response.data;
  }
}

const publicNerAnalysisService = new PublicNerAnalysisService();
export default publicNerAnalysisService;
