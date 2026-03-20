/**
 * Public BERTopic Service
 *
 * Read-only access to BERTopic analyses for the public dashboard.
 */

import publicApiClient from './publicApi';
import type { BERTopicListItem, BERTopicAnalysis } from './bertopicService';

class PublicBertopicService {
  async getBERTopicAnalyses(datasetId?: number): Promise<BERTopicListItem[]> {
    const params = datasetId ? { dataset_id: datasetId } : {};
    const response = await publicApiClient.get('/bertopic/', { params });
    return response.data.results || response.data;
  }

  async getBERTopicById(id: number): Promise<BERTopicAnalysis> {
    const response = await publicApiClient.get(`/bertopic/${id}/`);
    return response.data;
  }
}

const publicBertopicService = new PublicBertopicService();
export default publicBertopicService;
