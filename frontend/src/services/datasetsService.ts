/**
 * Datasets Service
 *
 * Handles dataset management API calls.
 */

import apiClient from './api';

export interface DatasetFile {
  id: number;
  filename: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error_message?: string;
  language_code?: string;
  language_confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface Dataset {
  id: number;
  name: string;
  description: string;
  source: 'upload' | 'drive';
  source_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  total_files: number;
  total_size_bytes: number;
  created_by: number;
  created_by_email: string;
  files: DatasetFile[];
  created_at: string;
  updated_at: string;
}

export interface DatasetListItem {
  id: number;
  name: string;
  description: string;
  source: 'upload' | 'drive';
  status: 'pending' | 'processing' | 'completed' | 'error';
  total_files: number;
  total_size_bytes: number;
  created_by_email: string;
  file_count: number;
  created_at: string;
  updated_at: string;
}

export interface DatasetStats {
  total_datasets: number;
  total_files: number;
  total_size_bytes: number;
  total_size_mb: number;
}

class DatasetsService {
  /**
   * Get all datasets
   */
  async getDatasets(): Promise<DatasetListItem[]> {
    const response = await apiClient.get('/datasets/');
    return response.data;
  }

  /**
   * Get dataset by ID
   */
  async getDataset(id: number): Promise<Dataset> {
    const response = await apiClient.get(`/datasets/${id}/`);
    return response.data;
  }

  /**
   * Create dataset with file upload
   */
  async createDatasetWithFiles(data: {
    name: string;
    description?: string;
    files: File[];
  }): Promise<Dataset> {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) {
      formData.append('description', data.description);
    }
    formData.append('source', 'upload');

    // Add all files
    data.files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post('/datasets/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Create dataset with Google Drive URL
   */
  async createDatasetWithDrive(data: {
    name: string;
    description?: string;
    source_url: string;
  }): Promise<Dataset> {
    const response = await apiClient.post('/datasets/', {
      name: data.name,
      description: data.description,
      source: 'drive',
      source_url: data.source_url,
    });
    return response.data;
  }

  /**
   * Delete dataset
   */
  async deleteDataset(id: number): Promise<void> {
    await apiClient.delete(`/datasets/${id}/`);
  }

  /**
   * Get files for a dataset
   */
  async getDatasetFiles(datasetId: number): Promise<DatasetFile[]> {
    const response = await apiClient.get(`/datasets/${datasetId}/files/`);
    return response.data;
  }

  /**
   * Get dataset statistics
   */
  async getStats(): Promise<DatasetStats> {
    const response = await apiClient.get('/datasets/stats/');
    return response.data;
  }
}

export default new DatasetsService();
