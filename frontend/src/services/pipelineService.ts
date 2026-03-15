/**
 * Pipeline Service
 *
 * API service for pipeline execution and monitoring endpoints.
 */

import apiClient from './api';

export interface ExecutePipelineRequest {
  document_ids?: number[] | null;
  use_cache?: boolean;
  skip_stages?: string[];
}

export interface PipelineStageResult {
  success: boolean;
  duration_seconds?: number;
  cached?: boolean;
  error?: string | null;
}

export interface ExecutePipelineResponse {
  success: boolean;
  execution_id: string;
  started_at: string;
  completed_at: string;
  total_stages: number;
  completed_stages: number;
  failed_stages: number;
  skipped_stages: number;
  stages: Record<string, PipelineStageResult>;
  results: Record<string, unknown>;
}

export interface PipelineStatusResponse {
  success: boolean;
  execution_id: string;
  total_stages: number;
  completed: number;
  failed: number;
  running: number;
  skipped: number;
  progress_percentage: number;
  is_completed: boolean;
  is_running: boolean;
  has_errors: boolean;
  stages: Array<{
    stage_name: string;
    status: string;
    started_at?: string;
    completed_at?: string;
    duration_seconds?: number;
    cache_hit?: boolean;
    error_message?: string;
  }>;
}

export interface PipelineHistoryResponse {
  success: boolean;
  count: number;
  executions: PipelineStatusResponse[];
}

class PipelineService {
  /**
   * Execute complete pipeline
   */
  async execute(data: ExecutePipelineRequest): Promise<ExecutePipelineResponse> {
    const response = await apiClient.post('/pipeline/execute/', data, { timeout: 36000000 });
    return response.data;
  }

  /**
   * Get pipeline execution status
   */
  async getStatus(executionId: string): Promise<PipelineStatusResponse> {
    const response = await apiClient.get(`/pipeline/status/${executionId}/`);
    return response.data;
  }

  /**
   * Get pipeline execution history
   */
  async getHistory(limit: number = 10): Promise<PipelineHistoryResponse> {
    const response = await apiClient.get(`/pipeline/history/`, {
      params: { limit },
    });
    return response.data;
  }

  /**
   * Get WebSocket URL for pipeline monitoring
   */
  getWebSocketUrl(executionId: string): string {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.REACT_APP_WS_HOST || 'localhost:8000';
    return `${wsProtocol}//${wsHost}/ws/pipeline/${executionId}/`;
  }
}

const pipelineService = new PipelineService();
export default pipelineService;
