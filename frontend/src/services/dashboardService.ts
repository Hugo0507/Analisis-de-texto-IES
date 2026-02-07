/**
 * Dashboard Service
 *
 * Aggregates data from multiple services for dashboard visualizations.
 * Provides unified data access for the Command Center dashboard.
 */

import dataPreparationService from './dataPreparationService';
import type { DataPreparation } from './dataPreparationService';

// Dashboard-specific interfaces

export interface PreprocessingMetrics {
  totalFilesAnalyzed: number;
  filesProcessed: number;
  filesOmitted: number;
  duplicatesRemoved: number;
  preparationsCount: number;
  completedPreparations: number;
  processingPreparations: number;
  failedPreparations: number;
}

export interface LanguageDistribution {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface TimelineData {
  date: string;
  count: number;
  label?: string;
}

export interface DashboardPreprocessingData {
  metrics: PreprocessingMetrics;
  languages: LanguageDistribution[];
  timeline: TimelineData[];
  recentPreparations: DataPreparation[];
}

export interface VectorizationMetrics {
  totalBowAnalyses: number;
  totalTfidfAnalyses: number;
  totalNgramAnalyses: number;
  averageVocabularySize: number;
  totalUniqueTerms: number;
}

export interface ModelingMetrics {
  totalNerAnalyses: number;
  totalTopicModels: number;
  totalBertopicModels: number;
  averageTopics: number;
  entityTypes: Record<string, number>;
}

export interface IAMetrics {
  modelsProcessed: number;
  averageConfidence: number;
  entitiesExtracted: number;
  topicsDiscovered: number;
}

export interface GeneralSummary {
  preprocessing: PreprocessingMetrics;
  vectorization: VectorizationMetrics;
  modeling: ModelingMetrics;
  ia: IAMetrics;
}

// Language color mapping for consistent visualization
const LANGUAGE_COLORS: Record<string, string> = {
  es: '#10b981', // emerald
  en: '#3b82f6', // blue
  pt: '#f59e0b', // amber
  fr: '#8b5cf6', // violet
  de: '#ec4899', // pink
  it: '#14b8a6', // teal
  unknown: '#64748b', // slate
};

class DashboardService {
  /**
   * Get preprocessing dashboard data
   */
  async getPreprocessingData(): Promise<DashboardPreprocessingData> {
    try {
      // Fetch data from data preparation service
      const [preparations, stats] = await Promise.all([
        dataPreparationService.getPreparations(),
        dataPreparationService.getStats(),
      ]);

      // Calculate aggregated metrics
      let totalFilesAnalyzed = 0;
      let filesProcessed = 0;
      let filesOmitted = 0;
      let duplicatesRemoved = 0;
      const languageCounts: Record<string, number> = {};
      const dateActivity: Record<string, number> = {};

      // Get detailed info for completed preparations
      const completedPreps = preparations.filter((p) => p.status === 'completed');

      for (const prep of completedPreps.slice(0, 10)) {
        try {
          const detail = await dataPreparationService.getPreparation(prep.id);

          totalFilesAnalyzed += detail.total_files_analyzed || 0;
          filesProcessed += detail.files_processed || 0;
          filesOmitted += detail.files_omitted || 0;
          duplicatesRemoved += detail.duplicates_removed || 0;

          // Aggregate language distribution
          if (detail.detected_languages) {
            Object.entries(detail.detected_languages).forEach(([lang, count]) => {
              languageCounts[lang] = (languageCounts[lang] || 0) + count;
            });
          }

          // Build timeline from processing dates
          if (detail.processing_completed_at) {
            const date = detail.processing_completed_at.split('T')[0];
            dateActivity[date] = (dateActivity[date] || 0) + detail.files_processed;
          }
        } catch (error) {
          console.warn(`Error fetching preparation ${prep.id}:`, error);
        }
      }

      // Transform language counts to chart data
      const languages: LanguageDistribution[] = Object.entries(languageCounts)
        .map(([id, value]) => ({
          id,
          label: dataPreparationService.getLanguageName(id),
          value,
          color: LANGUAGE_COLORS[id] || LANGUAGE_COLORS.unknown,
        }))
        .sort((a, b) => b.value - a.value);

      // Transform date activity to timeline data
      const timeline: TimelineData[] = Object.entries(dateActivity)
        .map(([date, count]) => ({
          date,
          count,
          label: new Date(date).toLocaleDateString('es-ES', {
            month: 'short',
            day: 'numeric',
          }),
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 days

      // Get recent preparations with details
      const recentPreparations: DataPreparation[] = [];
      for (const prep of preparations.slice(0, 5)) {
        try {
          const detail = await dataPreparationService.getPreparation(prep.id);
          recentPreparations.push(detail);
        } catch (error) {
          console.warn(`Error fetching preparation ${prep.id}:`, error);
        }
      }

      return {
        metrics: {
          totalFilesAnalyzed,
          filesProcessed,
          filesOmitted,
          duplicatesRemoved,
          preparationsCount: stats.total_preparations,
          completedPreparations: stats.completed,
          processingPreparations: stats.processing,
          failedPreparations: stats.failed,
        },
        languages,
        timeline,
        recentPreparations,
      };
    } catch (error) {
      console.error('Error fetching preprocessing data:', error);

      // Return empty data on error
      return {
        metrics: {
          totalFilesAnalyzed: 0,
          filesProcessed: 0,
          filesOmitted: 0,
          duplicatesRemoved: 0,
          preparationsCount: 0,
          completedPreparations: 0,
          processingPreparations: 0,
          failedPreparations: 0,
        },
        languages: [],
        timeline: [],
        recentPreparations: [],
      };
    }
  }

  /**
   * Get vectorization dashboard data (placeholder for future implementation)
   */
  async getVectorizationData(): Promise<VectorizationMetrics> {
    // TODO: Implement when vectorization endpoints are available
    return {
      totalBowAnalyses: 0,
      totalTfidfAnalyses: 0,
      totalNgramAnalyses: 0,
      averageVocabularySize: 0,
      totalUniqueTerms: 0,
    };
  }

  /**
   * Get modeling dashboard data (placeholder for future implementation)
   */
  async getModelingData(): Promise<ModelingMetrics> {
    // TODO: Implement when modeling endpoints are available
    return {
      totalNerAnalyses: 0,
      totalTopicModels: 0,
      totalBertopicModels: 0,
      averageTopics: 0,
      entityTypes: {},
    };
  }

  /**
   * Get IA dashboard data (placeholder for future implementation)
   */
  async getIAData(): Promise<IAMetrics> {
    // TODO: Implement when IA endpoints are available
    return {
      modelsProcessed: 0,
      averageConfidence: 0,
      entitiesExtracted: 0,
      topicsDiscovered: 0,
    };
  }

  /**
   * Get general summary for all dashboards
   */
  async getGeneralSummary(): Promise<GeneralSummary> {
    const [prepData, vecData, modelData, iaData] = await Promise.all([
      this.getPreprocessingData(),
      this.getVectorizationData(),
      this.getModelingData(),
      this.getIAData(),
    ]);

    return {
      preprocessing: prepData.metrics,
      vectorization: vecData,
      modeling: modelData,
      ia: iaData,
    };
  }
}

const dashboardService = new DashboardService();
export default dashboardService;
