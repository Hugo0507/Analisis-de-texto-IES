/**
 * Dashboard Service
 *
 * Aggregates data from multiple public services for dashboard visualizations.
 * Uses public API endpoints - no authentication required.
 */

import publicDatasetsService from './publicDatasetsService';
import publicDataPreparationService from './publicDataPreparationService';
import publicBagOfWordsService from './publicBagOfWordsService';
import publicNgramAnalysisService from './publicNgramAnalysisService';
import publicTfIdfAnalysisService from './publicTfidfAnalysisService';
import publicNerAnalysisService from './publicNerAnalysisService';
import publicTopicModelingService from './publicTopicModelingService';
import publicBertopicService from './publicBertopicService';

import type { Dataset, DirectoryStats } from './datasetsService';
import type { DataPreparation, DataPreparationListItem } from './dataPreparationService';
import type { BagOfWords, BagOfWordsListItem, TopTerm } from './bagOfWordsService';
import type { NgramAnalysis, NgramAnalysisListItem } from './ngramAnalysisService';
import type { TfIdfAnalysis, TfIdfAnalysisListItem } from './tfidfAnalysisService';
import type { NerAnalysis, NerAnalysisListItem } from './nerAnalysisService';
import type { TopicModeling, TopicModelingListItem } from './topicModelingService';
import type { BERTopicAnalysis, BERTopicListItem } from './bertopicService';

// ============================================================
// PREPROCESSING DASHBOARD INTERFACES
// ============================================================

export interface PreprocessingDashboardData {
  // Dataset info
  dataset: Dataset | null;
  directoryStats: DirectoryStats | null;

  // Preparations for this dataset
  preparations: DataPreparationListItem[];
  selectedPreparation: DataPreparation | null;

  // Aggregated metrics
  metrics: {
    totalFiles: number;
    totalSizeMB: number;
    dominantExtension: string;
    filesProcessed: number;
    filesOmitted: number;
    duplicatesRemoved: number;
    predominantLanguage: string;
    predominantLanguagePercentage: number;
  };

  // Chart data
  directoryDistribution: Array<{ id: string; label: string; value: number; color?: string }>;
  extensionDistribution: Array<{ id: string; label: string; value: number; color?: string }>;
  languageDistribution: Array<{ id: string; label: string; value: number; color?: string }>;
}

// ============================================================
// VECTORIZATION DASHBOARD INTERFACES
// ============================================================

export interface VectorizationDashboardData {
  // Available analyses for dataset
  bowAnalyses: BagOfWordsListItem[];
  ngramAnalyses: NgramAnalysisListItem[];
  tfidfAnalyses: TfIdfAnalysisListItem[];

  // Selected analysis details
  selectedBow: BagOfWords | null;
  selectedNgram: NgramAnalysis | null;
  selectedTfidf: TfIdfAnalysis | null;

  // Word cloud data (from BoW top terms)
  wordCloudData: Array<{ text: string; value: number }>;

  // N-gram bar chart data
  ngramBarData: Array<{ id: string; label: string; value: number }>;

  // TF-IDF top terms
  tfidfTopTerms: TopTerm[];
}

// ============================================================
// MODELING DASHBOARD INTERFACES
// ============================================================

export interface ModelingDashboardData {
  // Available analyses
  nerAnalyses: NerAnalysisListItem[];
  topicModelingAnalyses: TopicModelingListItem[];
  bertopicAnalyses: BERTopicListItem[];

  // Selected analysis details
  selectedNer: NerAnalysis | null;
  selectedTopicModeling: TopicModeling | null;
  selectedBertopic: BERTopicAnalysis | null;

  // NER entity distribution
  entityDistribution: Array<{ id: string; label: string; value: number; color?: string }>;
  topEntitiesByType: Record<string, Array<{ text: string; frequency: number }>>;

  // Topic modeling data
  topics: Array<{ id: number; label: string; words: Array<{ word: string; weight: number }>; documentCount: number }>;
  topicDistribution: Array<{ id: string; label: string; value: number }>;

  // BERTopic clusters (for network visualization)
  bertopicClusters: Array<{
    topicId: number;
    label: string;
    words: Array<{ word: string; weight: number }>;
    numDocuments: number;
  }>;
}

// ============================================================
// COLOR PALETTES
// ============================================================

export const DIRECTORY_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899',
  '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#a855f7',
];

export const EXTENSION_COLORS: Record<string, string> = {
  pdf: '#ef4444',
  txt: '#3b82f6',
  docx: '#2563eb',
  xlsx: '#22c55e',
  csv: '#84cc16',
  json: '#f59e0b',
  xml: '#8b5cf6',
  html: '#ec4899',
  default: '#64748b',
};

const ENTITY_COLORS: Record<string, string> = {
  PERSON: '#3b82f6',
  ORG: '#10b981',
  GPE: '#f59e0b',
  LOC: '#8b5cf6',
  DATE: '#ec4899',
  MONEY: '#22c55e',
  EVENT: '#06b6d4',
  PRODUCT: '#f97316',
  default: '#64748b',
};

// ============================================================
// SERVICE CLASS
// ============================================================

class DashboardService {
  // ==========================================================
  // PREPROCESSING DATA
  // ==========================================================

  async getPreprocessingData(datasetId: number): Promise<PreprocessingDashboardData> {
    try {
      // Fetch dataset and directory stats in parallel
      const [dataset, directoryStats] = await Promise.all([
        publicDatasetsService.getDataset(datasetId),
        publicDatasetsService.getDirectoryStats(datasetId).catch(() => null),
      ]);

      // Fetch preparations for this dataset
      const preparations = await publicDataPreparationService.getPreparations(datasetId);

      // Get the first completed preparation details if available
      let selectedPreparation: DataPreparation | null = null;
      const completedPrep = preparations.find(p => p.status === 'completed');
      if (completedPrep) {
        selectedPreparation = await publicDataPreparationService.getPreparation(completedPrep.id);
      }

      // Calculate metrics
      const totalFiles = dataset.total_files;
      const totalSizeMB = dataset.total_size_bytes / (1024 * 1024);

      // Find dominant extension from files
      const extensionCounts: Record<string, number> = {};
      dataset.files.forEach(file => {
        const ext = file.original_filename.split('.').pop()?.toLowerCase() || 'unknown';
        extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
      });
      const dominantExtension = Object.entries(extensionCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0]?.toUpperCase() || 'N/A';

      // Build directory distribution from directoryStats
      const directoryDistribution = directoryStats?.pie_chart_data.map((d, i) => ({
        id: d.name,
        label: d.name,
        value: d.value,
        color: DIRECTORY_COLORS[i % DIRECTORY_COLORS.length],
      })) || [];

      // Build extension distribution
      const extensionDistribution = Object.entries(extensionCounts)
        .map(([ext, count]) => ({
          id: ext,
          label: `.${ext}`,
          value: count,
          color: EXTENSION_COLORS[ext] || EXTENSION_COLORS.default,
        }))
        .sort((a, b) => b.value - a.value);

      // Build language distribution from preparation
      const languageDistribution = selectedPreparation?.detected_languages
        ? Object.entries(selectedPreparation.detected_languages).map(([lang, count]) => ({
            id: lang,
            label: publicDataPreparationService.getLanguageName(lang),
            value: count,
          }))
        : [];

      return {
        dataset,
        directoryStats,
        preparations,
        selectedPreparation,
        metrics: {
          totalFiles,
          totalSizeMB: Math.round(totalSizeMB * 100) / 100,
          dominantExtension,
          filesProcessed: selectedPreparation?.files_processed || 0,
          filesOmitted: selectedPreparation?.files_omitted || 0,
          duplicatesRemoved: selectedPreparation?.duplicates_removed || 0,
          predominantLanguage: selectedPreparation?.predominant_language || 'N/A',
          predominantLanguagePercentage: selectedPreparation?.predominant_language_percentage || 0,
        },
        directoryDistribution,
        extensionDistribution,
        languageDistribution,
      };
    } catch (error) {
      console.error('Error fetching preprocessing data:', error);
      throw error;
    }
  }

  async getPreparationDetail(preparationId: number): Promise<DataPreparation> {
    return publicDataPreparationService.getPreparation(preparationId);
  }

  // ==========================================================
  // VECTORIZATION DATA
  // ==========================================================

  async getVectorizationData(datasetId: number): Promise<VectorizationDashboardData> {
    try {
      // Fetch analyses filtered by dataset
      const [allBow, allNgram, allTfidf] = await Promise.all([
        publicBagOfWordsService.getBagOfWords(datasetId),
        publicNgramAnalysisService.getNgramAnalyses(datasetId),
        publicTfIdfAnalysisService.getTfIdfAnalyses(datasetId),
      ]);

      // Return all analyses (public API already filters to completed only)
      const bowAnalyses = allBow;
      const ngramAnalyses = allNgram;
      const tfidfAnalyses = allTfidf;

      // Get first completed analysis of each type
      let selectedBow: BagOfWords | null = null;
      let selectedNgram: NgramAnalysis | null = null;
      let selectedTfidf: TfIdfAnalysis | null = null;

      const completedBow = bowAnalyses.find(b => b.status === 'completed');
      if (completedBow) {
        selectedBow = await publicBagOfWordsService.getBagOfWordsById(completedBow.id);
      }

      const completedNgram = ngramAnalyses.find(n => n.status === 'completed');
      if (completedNgram) {
        selectedNgram = await publicNgramAnalysisService.getNgramAnalysisById(completedNgram.id);
      }

      const completedTfidf = tfidfAnalyses.find(t => t.status === 'completed');
      if (completedTfidf) {
        selectedTfidf = await publicTfIdfAnalysisService.getTfIdfAnalysis(completedTfidf.id);
      }

      // Build word cloud data from BoW top terms
      const wordCloudData = selectedBow?.top_terms?.map(t => ({
        text: t.term,
        value: t.score,
      })) || [];

      // Build n-gram bar data
      let ngramBarData: Array<{ id: string; label: string; value: number }> = [];
      if (selectedNgram?.results) {
        // Get the first configuration's top terms
        const firstConfig = Object.values(selectedNgram.results)[0];
        if (firstConfig?.top_terms) {
          ngramBarData = firstConfig.top_terms.slice(0, 20).map(t => ({
            id: t.term,
            label: t.term,
            value: t.score,
          }));
        }
      }

      // TF-IDF top terms
      const tfidfTopTerms = selectedTfidf?.tfidf_matrix?.top_terms || [];

      return {
        bowAnalyses,
        ngramAnalyses,
        tfidfAnalyses,
        selectedBow,
        selectedNgram,
        selectedTfidf,
        wordCloudData,
        ngramBarData,
        tfidfTopTerms,
      };
    } catch (error) {
      console.error('Error fetching vectorization data:', error);
      throw error;
    }
  }

  async getBowDetail(bowId: number): Promise<BagOfWords> {
    return publicBagOfWordsService.getBagOfWordsById(bowId);
  }

  async getNgramDetail(ngramId: number): Promise<NgramAnalysis> {
    return publicNgramAnalysisService.getNgramAnalysisById(ngramId);
  }

  async getTfidfDetail(tfidfId: number): Promise<TfIdfAnalysis> {
    return publicTfIdfAnalysisService.getTfIdfAnalysis(tfidfId);
  }

  // ==========================================================
  // MODELING DATA
  // ==========================================================

  async getModelingData(datasetId: number): Promise<ModelingDashboardData> {
    try {
      // Fetch analyses filtered by dataset
      const [allNer, allTopicModeling, allBertopic] = await Promise.all([
        publicNerAnalysisService.getNerAnalyses(datasetId),
        publicTopicModelingService.getTopicModelings(datasetId),
        publicBertopicService.getBERTopicAnalyses(datasetId),
      ]);

      // Get first completed analysis of each type
      let selectedNer: NerAnalysis | null = null;
      let selectedTopicModeling: TopicModeling | null = null;
      let selectedBertopic: BERTopicAnalysis | null = null;

      const completedNer = allNer.find(n => n.status === 'completed');
      if (completedNer) {
        selectedNer = await publicNerAnalysisService.getNerAnalysisById(completedNer.id);
      }

      const completedTopic = allTopicModeling.find(t => t.status === 'completed');
      if (completedTopic) {
        selectedTopicModeling = await publicTopicModelingService.getTopicModelingById(completedTopic.id);
      }

      const completedBertopic = allBertopic.find(b => b.status === 'completed');
      if (completedBertopic) {
        selectedBertopic = await publicBertopicService.getBERTopicById(completedBertopic.id);
      }

      // Build entity distribution from NER
      const entityDistribution = selectedNer?.entity_distribution?.map(e => ({
        id: e.label,
        label: e.label,
        value: e.value,
        color: ENTITY_COLORS[e.label] || ENTITY_COLORS.default,
      })) || [];

      // Top entities by type
      const topEntitiesByType = selectedNer?.top_entities_by_type || {};

      // Topics from topic modeling
      const topics = selectedTopicModeling?.topics?.map(t => ({
        id: t.topic_id,
        label: t.topic_label,
        words: t.words,
        documentCount: selectedTopicModeling?.topic_distribution?.find(
          d => d.topic_id === t.topic_id
        )?.document_count || 0,
      })) || [];

      // Topic distribution
      const topicDistribution = selectedTopicModeling?.topic_distribution?.map(t => ({
        id: `topic-${t.topic_id}`,
        label: t.topic_label,
        value: t.document_count,
      })) || [];

      // BERTopic clusters
      const bertopicClusters = selectedBertopic?.topics?.map(t => ({
        topicId: t.topic_id,
        label: t.topic_label,
        words: t.words,
        numDocuments: t.num_documents,
      })) || [];

      return {
        nerAnalyses: allNer,
        topicModelingAnalyses: allTopicModeling,
        bertopicAnalyses: allBertopic,
        selectedNer,
        selectedTopicModeling,
        selectedBertopic,
        entityDistribution,
        topEntitiesByType,
        topics,
        topicDistribution,
        bertopicClusters,
      };
    } catch (error) {
      console.error('Error fetching modeling data:', error);
      throw error;
    }
  }

  async getNerDetail(nerId: number): Promise<NerAnalysis> {
    return publicNerAnalysisService.getNerAnalysisById(nerId);
  }

  async getTopicModelingDetail(topicId: number): Promise<TopicModeling> {
    return publicTopicModelingService.getTopicModelingById(topicId);
  }

  async getBertopicDetail(bertopicId: number): Promise<BERTopicAnalysis> {
    return publicBertopicService.getBERTopicById(bertopicId);
  }
}

const dashboardService = new DashboardService();
export default dashboardService;
