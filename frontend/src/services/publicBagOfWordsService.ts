/**
 * Public Bag of Words Service
 *
 * Read-only access to BoW analyses for the public dashboard.
 */

import publicApiClient from './publicApi';
import type {
  BagOfWordsListItem,
  BagOfWords,
  VocabularyResponse,
  TopTermsResponse,
} from './bagOfWordsService';

class PublicBagOfWordsService {
  async getBagOfWords(): Promise<BagOfWordsListItem[]> {
    const response = await publicApiClient.get('/bag-of-words/');
    return response.data.results || response.data;
  }

  async getBagOfWordsById(id: number): Promise<BagOfWords> {
    const response = await publicApiClient.get(`/bag-of-words/${id}/`);
    return response.data;
  }

  async getVocabulary(id: number, page: number = 1, pageSize: number = 100): Promise<VocabularyResponse> {
    const response = await publicApiClient.get(`/bag-of-words/${id}/vocabulary/`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  }

  async getTopTerms(id: number, limit: number = 50): Promise<TopTermsResponse> {
    const response = await publicApiClient.get(`/bag-of-words/${id}/top_terms/`, {
      params: { limit },
    });
    return response.data;
  }
}

const publicBagOfWordsService = new PublicBagOfWordsService();
export default publicBagOfWordsService;
