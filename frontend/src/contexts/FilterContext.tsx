/**
 * Filter Context - Cross-filtering global state
 *
 * Provides bidirectional cross-filtering between charts and filter sidebar.
 * Dataset is the MASTER filter - when changed, all data refreshes.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import publicDatasetsService from '../services/publicDatasetsService';
import type { DatasetListItem } from '../services/datasetsService';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface FilterState {
  // Master filter
  selectedDatasetId: number | null;
  selectedDataset: DatasetListItem | null;

  // Secondary filters
  selectedPreparationId: number | null;
  selectedDirectory: string | null;

  // Analysis filters
  selectedBowId: number | null;
  selectedNgramId: number | null;
  selectedTfidfId: number | null;
  selectedNerId: number | null;
  selectedTopicModelId: number | null;
  selectedBertopicId: number | null;

  // General filters
  dateRange: DateRange;
  selectedLanguages: string[];
  searchTerm: string;
  activeChart: string | null;
  crossFilterValue: Record<string, any>;
}

export interface FilterContextType {
  filters: FilterState;
  datasets: DatasetListItem[];
  isLoadingDatasets: boolean;
  backendUnavailable: boolean;

  // Master filter setter
  setSelectedDataset: (datasetId: number | null) => void;

  // Secondary filter setters
  setSelectedPreparation: (prepId: number | null) => void;
  setSelectedDirectory: (directory: string | null) => void;

  // Analysis filter setters
  setSelectedBow: (bowId: number | null) => void;
  setSelectedNgram: (ngramId: number | null) => void;
  setSelectedTfidf: (tfidfId: number | null) => void;
  setSelectedNer: (nerId: number | null) => void;
  setSelectedTopicModel: (topicId: number | null) => void;
  setSelectedBertopic: (bertopicId: number | null) => void;

  // General filter setters
  setDateRange: (range: DateRange) => void;
  setSelectedLanguages: (languages: string[]) => void;
  setSearchTerm: (term: string) => void;

  // Cross-filtering methods
  setActiveChart: (chartId: string | null) => void;
  setCrossFilter: (chartId: string, value: any) => void;
  clearCrossFilter: (chartId: string) => void;

  // Bulk operations
  resetFilters: () => void;
  refreshDatasets: () => Promise<void>;

  // Computed helpers
  hasActiveFilters: boolean;
  getFilterSummary: () => string[];
}

const initialFilterState: FilterState = {
  selectedDatasetId: null,
  selectedDataset: null,
  selectedPreparationId: null,
  selectedDirectory: null,
  selectedBowId: null,
  selectedNgramId: null,
  selectedTfidfId: null,
  selectedNerId: null,
  selectedTopicModelId: null,
  selectedBertopicId: null,
  dateRange: { start: null, end: null },
  selectedLanguages: [],
  searchTerm: '',
  activeChart: null,
  crossFilterValue: {},
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};

interface FilterProviderProps {
  children: ReactNode;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);
  const [backendUnavailable, setBackendUnavailable] = useState(false);

  // Load datasets on mount
  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setIsLoadingDatasets(true);
      setBackendUnavailable(false);
      const data = await publicDatasetsService.getDatasets();
      setDatasets(data);

      // Auto-select first completed dataset if none selected
      if (!filters.selectedDatasetId && data.length > 0) {
        const completedDataset = data.find(d => d.status === 'completed') || data[0];
        setFilters(prev => ({
          ...prev,
          selectedDatasetId: completedDataset.id,
          selectedDataset: completedDataset,
        }));
      }
    } catch (error) {
      console.error('Error loading datasets:', error);
      setBackendUnavailable(true);
    } finally {
      setIsLoadingDatasets(false);
    }
  };

  const refreshDatasets = useCallback(async () => {
    await loadDatasets();
  }, []);

  // Master filter setter - resets all secondary filters when dataset changes
  const setSelectedDataset = useCallback((datasetId: number | null) => {
    const dataset = datasets.find(d => d.id === datasetId) || null;
    setFilters(prev => ({
      ...prev,
      selectedDatasetId: datasetId,
      selectedDataset: dataset,
      // Reset all secondary filters when dataset changes
      selectedPreparationId: null,
      selectedDirectory: null,
      selectedBowId: null,
      selectedNgramId: null,
      selectedTfidfId: null,
      selectedNerId: null,
      selectedTopicModelId: null,
      selectedBertopicId: null,
    }));
  }, [datasets]);

  // Secondary filter setters
  const setSelectedPreparation = useCallback((prepId: number | null) => {
    setFilters(prev => ({ ...prev, selectedPreparationId: prepId }));
  }, []);

  const setSelectedDirectory = useCallback((directory: string | null) => {
    setFilters(prev => ({ ...prev, selectedDirectory: directory }));
  }, []);

  // Analysis filter setters
  const setSelectedBow = useCallback((bowId: number | null) => {
    setFilters(prev => ({ ...prev, selectedBowId: bowId }));
  }, []);

  const setSelectedNgram = useCallback((ngramId: number | null) => {
    setFilters(prev => ({ ...prev, selectedNgramId: ngramId }));
  }, []);

  const setSelectedTfidf = useCallback((tfidfId: number | null) => {
    setFilters(prev => ({ ...prev, selectedTfidfId: tfidfId }));
  }, []);

  const setSelectedNer = useCallback((nerId: number | null) => {
    setFilters(prev => ({ ...prev, selectedNerId: nerId }));
  }, []);

  const setSelectedTopicModel = useCallback((topicId: number | null) => {
    setFilters(prev => ({ ...prev, selectedTopicModelId: topicId }));
  }, []);

  const setSelectedBertopic = useCallback((bertopicId: number | null) => {
    setFilters(prev => ({ ...prev, selectedBertopicId: bertopicId }));
  }, []);

  // General filter setters
  const setDateRange = useCallback((range: DateRange) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  }, []);

  const setSelectedLanguages = useCallback((languages: string[]) => {
    setFilters(prev => ({ ...prev, selectedLanguages: languages }));
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setFilters(prev => ({ ...prev, searchTerm: term }));
  }, []);

  // Cross-filtering methods
  const setActiveChart = useCallback((chartId: string | null) => {
    setFilters(prev => ({ ...prev, activeChart: chartId }));
  }, []);

  const setCrossFilter = useCallback((chartId: string, value: any) => {
    setFilters(prev => {
      const newCrossFilterValue = { ...prev.crossFilterValue, [chartId]: value };
      let updates: Partial<FilterState> = { crossFilterValue: newCrossFilterValue };

      // Handle directory click from donut chart
      if (chartId === 'directory-donut' && typeof value === 'string') {
        updates.selectedDirectory = prev.selectedDirectory === value ? null : value;
      }

      // Handle language click
      if (chartId === 'languages-donut' && typeof value === 'string') {
        const currentLanguages = prev.selectedLanguages;
        if (currentLanguages.includes(value)) {
          updates.selectedLanguages = currentLanguages.filter(l => l !== value);
        } else {
          updates.selectedLanguages = [...currentLanguages, value];
        }
      }

      return { ...prev, ...updates, activeChart: chartId };
    });
  }, []);

  const clearCrossFilter = useCallback((chartId: string) => {
    setFilters(prev => {
      const newCrossFilterValue = { ...prev.crossFilterValue };
      delete newCrossFilterValue[chartId];

      let updates: Partial<FilterState> = { crossFilterValue: newCrossFilterValue, activeChart: null };

      // Clear corresponding filter
      if (chartId === 'directory-donut') {
        updates.selectedDirectory = null;
      }

      return { ...prev, ...updates };
    });
  }, []);

  // Bulk operations
  const resetFilters = useCallback(() => {
    setFilters(prev => ({
      ...initialFilterState,
      selectedDatasetId: prev.selectedDatasetId,
      selectedDataset: prev.selectedDataset,
    }));
  }, []);

  // Computed helpers
  const hasActiveFilters =
    filters.selectedPreparationId !== null ||
    filters.selectedDirectory !== null ||
    filters.dateRange.start !== null ||
    filters.dateRange.end !== null ||
    filters.selectedLanguages.length > 0 ||
    filters.searchTerm !== '';

  const getFilterSummary = useCallback((): string[] => {
    const summary: string[] = [];

    if (filters.selectedDataset) {
      summary.push(`Dataset: ${filters.selectedDataset.name}`);
    }

    if (filters.selectedDirectory) {
      summary.push(`Directorio: ${filters.selectedDirectory}`);
    }

    if (filters.selectedLanguages.length > 0) {
      summary.push(`Idiomas: ${filters.selectedLanguages.join(', ')}`);
    }

    if (filters.searchTerm) {
      summary.push(`Búsqueda: "${filters.searchTerm}"`);
    }

    return summary;
  }, [filters]);

  const value: FilterContextType = {
    filters,
    datasets,
    isLoadingDatasets,
    backendUnavailable,
    setSelectedDataset,
    setSelectedPreparation,
    setSelectedDirectory,
    setSelectedBow,
    setSelectedNgram,
    setSelectedTfidf,
    setSelectedNer,
    setSelectedTopicModel,
    setSelectedBertopic,
    setDateRange,
    setSelectedLanguages,
    setSearchTerm,
    setActiveChart,
    setCrossFilter,
    clearCrossFilter,
    resetFilters,
    refreshDatasets,
    hasActiveFilters,
    getFilterSummary,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};
