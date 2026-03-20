/**
 * Public NER Analysis Service
 *
 * Read-only access to NER analyses for the public dashboard.
 */

import publicApiClient from './publicApi';
import type { NerAnalysisListItem, NerAnalysis } from './nerAnalysisService';

class PublicNerAnalysisService {
  async getNerAnalyses(datasetId?: number): Promise<NerAnalysisListItem[]> {
    const params = datasetId ? { dataset_id: datasetId } : {};
    const response = await publicApiClient.get('/ner-analysis/', { params });
    return response.data.results || response.data;
  }

  async getNerAnalysisById(id: number): Promise<NerAnalysis> {
    const response = await publicApiClient.get(`/ner-analysis/${id}/`);
    return response.data;
  }
}

const publicNerAnalysisService = new PublicNerAnalysisService();
export default publicNerAnalysisService;
