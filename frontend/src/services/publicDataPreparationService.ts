/**
 * Public Data Preparation Service
 *
 * Read-only access to data preparations for the public dashboard.
 */

import publicApiClient from './publicApi';
import type { DataPreparationListItem, DataPreparation } from './dataPreparationService';
import { LANGUAGE_NAMES } from './dataPreparationService';

class PublicDataPreparationService {
  async getPreparations(): Promise<DataPreparationListItem[]> {
    const response = await publicApiClient.get('/data-preparation/');
    return response.data.results || response.data;
  }

  async getPreparation(id: number): Promise<DataPreparation> {
    const response = await publicApiClient.get(`/data-preparation/${id}/`);
    return response.data;
  }

  getLanguageName(code: string): string {
    return LANGUAGE_NAMES[code]?.name || code.toUpperCase();
  }

  getLanguageFlag(code: string): string {
    return LANGUAGE_NAMES[code]?.flag || '🌐';
  }
}

const publicDataPreparationService = new PublicDataPreparationService();
export default publicDataPreparationService;
