/**
 * Public Topic Modeling Service
 *
 * Read-only access to Topic Modeling analyses for the public dashboard.
 */

import publicApiClient from './publicApi';
import type { TopicModelingListItem, TopicModeling } from './topicModelingService';

class PublicTopicModelingService {
  async getTopicModelings(): Promise<TopicModelingListItem[]> {
    const response = await publicApiClient.get('/topic-modeling/');
    return response.data.results || response.data;
  }

  async getTopicModelingById(id: number): Promise<TopicModeling> {
    const response = await publicApiClient.get(`/topic-modeling/${id}/`);
    return response.data;
  }
}

const publicTopicModelingService = new PublicTopicModelingService();
export default publicTopicModelingService;
