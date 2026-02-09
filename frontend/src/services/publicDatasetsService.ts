/**
 * Public Datasets Service
 *
 * Read-only access to datasets for the public dashboard.
 */

import publicApiClient from './publicApi';
import type { DatasetListItem, Dataset, DirectoryStats } from './datasetsService';

class PublicDatasetsService {
  async getDatasets(): Promise<DatasetListItem[]> {
    const response = await publicApiClient.get('/datasets/');
    return response.data.results || response.data;
  }

  async getDataset(id: number): Promise<Dataset> {
    const response = await publicApiClient.get(`/datasets/${id}/`);
    return response.data;
  }

  async getDirectoryStats(datasetId: number): Promise<DirectoryStats> {
    const response = await publicApiClient.get(`/datasets/${datasetId}/directory_stats/`);
    return response.data;
  }
}

const publicDatasetsService = new PublicDatasetsService();
export default publicDatasetsService;
