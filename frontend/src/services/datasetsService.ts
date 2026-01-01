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
    const BATCH_DELAY = 8000; // Wait 8 seconds between batches (prevent server restart)
    const MAX_RETRIES = 5; // Retry failed batches up to 5 times (server might restart)
    const totalFiles = data.files.length;

    // For small datasets, send all at once
    if (totalFiles <= BATCH_SIZE) {
      const formData = new FormData();
      formData.append('name', data.name);
      if (data.description) {
        formData.append('description', data.description);
      }
      formData.append('source', 'upload');

      // Add all files with their paths
      data.files.forEach((file) => {
        formData.append('files', file);
        // @ts-ignore - webkitRelativePath exists on File objects from directory inputs
        const relativePath = file.webkitRelativePath || file.name;
        formData.append('file_paths', relativePath);
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
      // @ts-ignore - webkitRelativePath exists on File objects from directory inputs
      const relativePath = file.webkitRelativePath || file.name;
      formData.append('file_paths', relativePath);
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

    // Helper function to upload batch with retry logic
    const uploadBatchWithRetry = async (
      batchFiles: File[],
      batchNumber: number,
      retries: number = MAX_RETRIES
    ): Promise<void> => {
      const batchFormData = new FormData();

      batchFiles.forEach((file) => {
        batchFormData.append('files', file);
        // @ts-ignore - webkitRelativePath exists on File objects from directory inputs
        const relativePath = file.webkitRelativePath || file.name;
        batchFormData.append('file_paths', relativePath);
      });

      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          await apiClient.post(`/datasets/${dataset.id}/add_files/`, batchFormData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 600000, // 10 minutes
          });

          // Success - exit retry loop
          return;

        } catch (error: any) {
          const isLastAttempt = attempt === retries - 1;
          const is401 = error.response?.status === 401;
          const is429 = error.response?.status === 429; // Rate limit

          console.warn(`Batch ${batchNumber} attempt ${attempt + 1} failed:`, error.message);

          if (isLastAttempt) {
            // Last attempt failed - throw error
            throw new Error(
              `Batch ${batchNumber} failed after ${retries} attempts: ${error.message}`
            );
          }

          // Exponential backoff with longer delays for 401 (server restart)
          // Normal: 3s, 6s, 12s, 24s, 48s
          // For 401: 10s, 20s, 30s, 40s, 50s (give server time to restart)
          let backoffDelay;
          if (is401 || is429) {
            // Server restart or rate limit - wait longer
            backoffDelay = (attempt + 1) * 10000; // 10s, 20s, 30s, 40s, 50s
          } else {
            // Network error - exponential backoff
            backoffDelay = Math.pow(2, attempt + 1) * 1500; // 3s, 6s, 12s, 24s, 48s
          }

          console.log(
            `Batch ${batchNumber} attempt ${attempt + 1} failed. ` +
            `Retrying in ${backoffDelay / 1000}s... ` +
            `(${is401 ? 'Server restart' : is429 ? 'Rate limit' : 'Network error'})`
          );

          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    };

    // Remaining batches: Add files to existing dataset
    for (let i = BATCH_SIZE; i < totalFiles; i += BATCH_SIZE) {
      // Wait between batches to prevent server saturation and rate limiting
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));

      const batch = data.files.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      // Upload with retry logic
      await uploadBatchWithRetry(batch, batchNumber);

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
