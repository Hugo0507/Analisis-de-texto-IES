/**
 * Public BERTopic Service
 *
 * Read-only access to BERTopic analyses for the public dashboard.
 */

import publicApiClient from './publicApi';
import type { BERTopicListItem, BERTopicAnalysis } from './bertopicService';

class PublicBertopicService {
  async getBERTopicAnalyses(): Promise<BERTopicListItem[]> {
    const response = await publicApiClient.get('/bertopic/');
    return response.data.results || response.data;
  }

  async getBERTopicById(id: number): Promise<BERTopicAnalysis> {
    const response = await publicApiClient.get(`/bertopic/${id}/`);
    return response.data;
  }
}

const publicBertopicService = new PublicBertopicService();
export default publicBertopicService;
