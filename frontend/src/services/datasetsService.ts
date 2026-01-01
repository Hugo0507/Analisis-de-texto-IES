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
  directory_path?: string;  // Full path: "Redalyc/subcarpeta"
  directory_name?: string;  // Immediate parent folder name
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

export interface DirectoryStatsRow {
  directory: string;
  extensions: { [key: string]: number };
  total: number;
}

export interface PieChartData {
  name: string;
  value: number;
  percentage: number;
}

export interface DirectoryStats {
  table_data: DirectoryStatsRow[];
  extension_totals: { [key: string]: number };
  directory_totals: { [key: string]: number };
  all_extensions: string[];
  grand_total: number;
  pie_chart_data: PieChartData[];
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

class DatasetsService {
  /**
   * Get all datasets
   */
  async getDatasets(): Promise<DatasetListItem[]> {
    const response = await apiClient.get<PaginatedResponse<DatasetListItem>>('/datasets/');
    return response.data.results || response.data as any;
  }

  /**
   * Get dataset by ID
   */
  async getDataset(id: number): Promise<Dataset> {
    const response = await apiClient.get(`/datasets/${id}/`);
    return response.data;
  }

  /**
   * Create dataset with file upload (optimized for large batches)
   */
  async createDatasetWithFiles(data: {
    name: string;
    description?: string;
    files: File[];
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void;
  }): Promise<Dataset> {
    const BATCH_SIZE = 10; // Send 10 files at a time (reduced to prevent server saturation)
    const BATCH_DELAY = 3000; // Wait 3 seconds between batches
    const totalFiles = data.files.length;

    // For small datasets, send all at once
    if (totalFiles <= BATCH_SIZE) {
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
        timeout: 600000, // 10 minutes for file uploads
      });
      return response.data;
    }

    // For large datasets, send in batches
    // First batch: Create dataset
    const firstBatch = data.files.slice(0, BATCH_SIZE);
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) {
      formData.append('description', data.description);
    }
    formData.append('source', 'upload');

    firstBatch.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post('/datasets/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000, // 10 minutes
    });
    const dataset = response.data;

    // Report progress
    if (data.onProgress) {
      data.onProgress({
        loaded: BATCH_SIZE,
        total: totalFiles,
        percentage: Math.round((BATCH_SIZE / totalFiles) * 100)
      });
    }

    // Remaining batches: Add files to existing dataset
    for (let i = BATCH_SIZE; i < totalFiles; i += BATCH_SIZE) {
      // Wait between batches to prevent server saturation
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));

      const batch = data.files.slice(i, i + BATCH_SIZE);
      const batchFormData = new FormData();

      batch.forEach((file) => {
        batchFormData.append('files', file);
      });

      await apiClient.post(`/datasets/${dataset.id}/add_files/`, batchFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 600000, // 10 minutes
      });

      // Report progress
      if (data.onProgress) {
        const loaded = Math.min(i + BATCH_SIZE, totalFiles);
        data.onProgress({
          loaded,
          total: totalFiles,
          percentage: Math.round((loaded / totalFiles) * 100)
        });
      }
    }

    return dataset;
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
    }, {
      timeout: 180000, // 3 minutes for Google Drive operations
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

  /**
   * Get directory distribution statistics for a dataset
   */
  async getDirectoryStats(datasetId: number): Promise<DirectoryStats> {
    const response = await apiClient.get(`/datasets/${datasetId}/directory_stats/`);
    return response.data;
  }

  /**
   * Add files to an existing dataset (incremental feeding)
   */
  async addFilesToDataset(datasetId: number, files: File[]): Promise<{
    message: string;
    dataset: Dataset;
    results: {
      success: boolean;
      processed: number;
      failed: number;
      errors: string[];
    };
  }> {
    const formData = new FormData();

    // Add all files
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post(`/datasets/${datasetId}/add_files/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export default new DatasetsService();
