/**
 * Public Topic Modeling Service
 *
 * Read-only access to Topic Modeling analyses for the public dashboard.
 */

import publicApiClient from './publicApi';
import type { TopicModelingListItem, TopicModeling } from './topicModelingService';

export interface CoherenceComparisonItem {
  id: number;
  name: string;
  num_topics: number;
  coherence_score: number | null;
  perplexity_score: number | null;
  algorithm: string;
}

class PublicTopicModelingService {
  async getTopicModelings(datasetId?: number): Promise<TopicModelingListItem[]> {
    const params = datasetId ? { dataset_id: datasetId } : {};
    const response = await publicApiClient.get('/topic-modeling/', { params });
    return response.data.results || response.data;
  }

  async getTopicModelingById(id: number): Promise<TopicModeling> {
    const response = await publicApiClient.get(`/topic-modeling/${id}/`);
    return response.data;
  }

  async getCoherenceComparison(datasetId?: number): Promise<CoherenceComparisonItem[]> {
    const params = datasetId ? { dataset_id: datasetId } : {};
    const response = await publicApiClient.get('/topic-modeling/coherence_comparison/', { params });
    return response.data;
  }
}

const publicTopicModelingService = new PublicTopicModelingService();
export default publicTopicModelingService;
