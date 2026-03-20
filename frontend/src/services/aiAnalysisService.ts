/**
 * AI Analysis Service
 *
 * API service for LLM analysis endpoints (Claude, Gemini, ChatGPT).
 * Authenticated admin endpoints use apiClient; public endpoints use publicApiClient.
 */

import apiClient from './api';
import publicApiClient from './publicApi';

// ── Types ────────────────────────────────────────────────────────────────────

export type AIProvider = 'claude' | 'gemini' | 'chatgpt';
export type AIAnalysisStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface AIAnalysisConfig {
  id: number;
  provider: AIProvider;
  dataset_id: number;
  dataset_name: string;
  prompt: string;
  status: AIAnalysisStatus;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface AISuccessCase {
  id: number;
  institution: string;
  transformation_type: string;
  factors: string[];
  results: string;
  source_document: string;
  confidence: number;
}

export interface AIAnalysisResult {
  config_id: number;
  provider: AIProvider;
  status: AIAnalysisStatus;
  success_cases: AISuccessCase[];
  factors_found: string[];
  summary: string;
  processing_time_seconds: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface AIFactorComparison {
  factor_name: string;
  claude: boolean;
  gemini: boolean;
  chatgpt: boolean;
  nlp_traditional: boolean;
  claude_frequency: number;
  gemini_frequency: number;
  chatgpt_frequency: number;
  nlp_frequency: number;
}

export interface AIComparisonSummary {
  consensus_factors: string[];
  divergent_factors: string[];
  agreement_with_nlp: {
    claude: number;
    gemini: number;
    chatgpt: number;
  };
  factor_comparison: AIFactorComparison[];
  total_success_cases: {
    claude: number;
    gemini: number;
    chatgpt: number;
    consensus: number;
  };
}

export interface AIComparisonSummaryPublic {
  has_results: boolean;
  factor_comparison: AIFactorComparison[];
  consensus_factors: string[];
  success_cases_consensus: AISuccessCase[];
  agreement_with_nlp: {
    claude: number;
    gemini: number;
    chatgpt: number;
  };
}

// ── Admin Service ─────────────────────────────────────────────────────────────

class AIAnalysisService {
  /** Lista todos los análisis IA creados */
  async getAIConfigs(): Promise<{ success: boolean; configs: AIAnalysisConfig[]; total: number }> {
    const response = await apiClient.get('/ai-analysis/');
    return response.data;
  }

  /** Lista análisis de un provider específico */
  async getAIConfigsByProvider(
    provider: AIProvider
  ): Promise<{ success: boolean; configs: AIAnalysisConfig[]; total: number }> {
    const response = await apiClient.get('/ai-analysis/', { params: { provider } });
    return response.data;
  }

  /** Crea y ejecuta un nuevo análisis IA */
  async runAIAnalysis(data: {
    provider: AIProvider;
    dataset_id: number;
    prompt: string;
  }): Promise<{ success: boolean; config: AIAnalysisConfig }> {
    const response = await apiClient.post('/ai-analysis/', data);
    return response.data;
  }

  /** Obtiene resultados de un análisis específico */
  async getAIResults(configId: number): Promise<{ success: boolean; result: AIAnalysisResult }> {
    const response = await apiClient.get(`/ai-analysis/${configId}/results/`);
    return response.data;
  }

  /** Ejecuta comparación entre todos los LLMs + NLP tradicional */
  async compareAIResults(configId: number): Promise<{ success: boolean; summary: AIComparisonSummary }> {
    const response = await apiClient.post(`/ai-analysis/${configId}/compare/`);
    return response.data;
  }

  /** Resumen comparativo global de todos los análisis ejecutados */
  async getComparisonSummary(): Promise<{ success: boolean; summary: AIComparisonSummary }> {
    const response = await apiClient.get('/ai-analysis/comparison/');
    return response.data;
  }

  /** Elimina un análisis */
  async deleteAIConfig(configId: number): Promise<{ success: boolean }> {
    const response = await apiClient.delete(`/ai-analysis/${configId}/`);
    return response.data;
  }
}

// ── Public Service ────────────────────────────────────────────────────────────

class PublicAIAnalysisService {
  /** Datos públicos del dashboard IA: resumen comparativo sin autenticación */
  async getPublicSummary(): Promise<AIComparisonSummaryPublic> {
    const response = await publicApiClient.get('/ai-analysis/');
    return response.data;
  }
}

const aiAnalysisService = new AIAnalysisService();
export const publicAIAnalysisService = new PublicAIAnalysisService();
export default aiAnalysisService;
