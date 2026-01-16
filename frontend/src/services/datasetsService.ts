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
    return response.data.results || (response.data as unknown as DatasetListItem[]);
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
   *
   * Now implements "Ignorar y Notificar" strategy:
   * - Skips batches that fail all retries
   * - Continues with remaining batches
   * - Returns summary with failed files info
   */
  async createDatasetWithFiles(data: {
    name: string;
    description?: string;
    files: File[];
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void;
  }): Promise<UploadResult> {
    const BATCH_SIZE = 5; // Send 5 files at a time (lighter requests, less network failures)
    const BATCH_DELAY = 8000; // Wait 8 seconds between batches (reduced - now we skip failed batches)
    const LONG_REST_INTERVAL = 5; // Every 5 batches, take a long rest
    const LONG_REST_DELAY = 20000; // 20 seconds long rest (reduced - more tolerant to failures)
    const MAX_RETRIES = 5; // Retry failed batches up to 5 times (reduced - skip faster if problematic)
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

      // Return with summary (all successful for small datasets)
      return {
        dataset: response.data,
        summary: {
          totalFiles,
          successfulFiles: totalFiles,
          failedFiles: 0,
          failedBatches: []
        }
      };
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
    // Returns success status instead of throwing - implements "Ignorar y Notificar"
    const uploadBatchWithRetry = async (
      batchFiles: File[],
      batchNumber: number,
      retries: number = MAX_RETRIES
    ): Promise<{ success: boolean; error?: string }> => {
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
          return { success: true };

        } catch (error: unknown) {
          const errorObj = error as { response?: { status?: number }; message?: string };
          const isLastAttempt = attempt === retries - 1;
          const is401 = errorObj.response?.status === 401;
          const is429 = errorObj.response?.status === 429;

          if (isLastAttempt) {
            return {
              success: false,
              error: `Failed after ${retries} attempts: ${errorObj.message || 'Unknown error'}`
            };
          }

          let backoffDelay: number;
          const isNetworkError = errorObj.message?.includes('Network Error') || !errorObj.response;

          if (is401 || is429) {
            backoffDelay = (attempt + 1) * 15000;
          } else if (isNetworkError) {
            backoffDelay = (attempt + 1) * 10000;
          } else {
            backoffDelay = Math.pow(2, attempt + 1) * 2000;
          }

          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }

      // Shouldn't reach here, but return failure just in case
      return { success: false, error: 'Unknown error' };
    };

    // Track failed batches for final report
    const failedBatches: Array<{
      batchNumber: number;
      files: string[];
      error: string;
    }> = [];
    let successfulFiles = BATCH_SIZE; // First batch already uploaded

    // Remaining batches: Add files to existing dataset
    for (let i = BATCH_SIZE; i < totalFiles; i += BATCH_SIZE) {
      const batch = data.files.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      // Long rest every N batches to let HF "forget" the load
      if (batchNumber % LONG_REST_INTERVAL === 0) {
        await new Promise(resolve => setTimeout(resolve, LONG_REST_DELAY));
      } else {
        // Normal delay between batches
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }

      // Upload with retry logic - now returns success/failure instead of throwing
      const result = await uploadBatchWithRetry(batch, batchNumber);

      if (result.success) {
        // Batch succeeded
        successfulFiles += batch.length;
      } else {
        // Batch failed - record it and CONTINUE (don't stop)
        failedBatches.push({
          batchNumber,
          files: batch.map(f => f.webkitRelativePath || f.name),
          error: result.error || 'Unknown error'
        });
      }

      // Report progress (count all files, even failed ones, as "processed")
      if (data.onProgress) {
        const loaded = Math.min(i + BATCH_SIZE, totalFiles);
        data.onProgress({
          loaded,
          total: totalFiles,
          percentage: Math.round((loaded / totalFiles) * 100)
        });
      }

      // Small additional delay AFTER upload attempt to prevent burst
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2s cooldown
    }

    // Calculate final summary
    const failedFiles = failedBatches.reduce((sum, batch) => sum + batch.files.length, 0);

    // Return dataset with upload summary
    return {
      dataset,
      summary: {
        totalFiles,
        successfulFiles,
        failedFiles,
        failedBatches
      }
    };
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

export interface UploadResult {
  dataset: Dataset;
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    failedBatches: Array<{
      batchNumber: number;
      files: string[];  // File names
      error: string;
    }>;
  };
}

const datasetsService = new DatasetsService();
export default datasetsService;
