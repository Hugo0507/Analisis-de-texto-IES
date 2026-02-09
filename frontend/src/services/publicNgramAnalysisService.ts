/**
 * Public N-gram Analysis Service
 *
 * Read-only access to N-gram analyses for the public dashboard.
 */

import publicApiClient from './publicApi';
import type { NgramAnalysisListItem, NgramAnalysis } from './ngramAnalysisService';

class PublicNgramAnalysisService {
  async getNgramAnalyses(): Promise<NgramAnalysisListItem[]> {
    const response = await publicApiClient.get('/ngram-analysis/');
    return response.data.results || response.data;
  }

  async getNgramAnalysisById(id: number): Promise<NgramAnalysis> {
    const response = await publicApiClient.get(`/ngram-analysis/${id}/`);
    return response.data;
  }
}

const publicNgramAnalysisService = new PublicNgramAnalysisService();
export default publicNgramAnalysisService;
