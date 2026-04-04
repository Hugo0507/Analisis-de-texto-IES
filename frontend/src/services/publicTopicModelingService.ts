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

export interface TopicClassification {
  topic_id: number;
  primary_category: string;
  primary_category_label: string;
  secondary_category: string | null;
  confidence_score: number;
  matched_keywords: string[];
}

export interface ExecutiveSummary {
  model_name: string;
  algorithm: string;
  n_topics: number;
  n_docs: number;
  coherence_score: number | null;
  perplexity_score: number | null;
  oe3_coverage: number;
  category_distribution: Array<{ id: string; label: string; count: number }>;
  summary_paragraphs: string[];
  summary_markdown: string;
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

  async getExecutiveSummary(topicModelingId: number): Promise<ExecutiveSummary> {
    const response = await publicApiClient.get(`/topic-modeling/${topicModelingId}/executive-summary/`);
    return response.data;
  }
}

const publicTopicModelingService = new PublicTopicModelingService();
export default publicTopicModelingService;
