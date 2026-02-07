/**
 * Filter Context - Cross-filtering global state
 *
 * Provides bidirectional cross-filtering between charts and filter sidebar.
 * When a user clicks on a chart segment (e.g., language in DonutChart),
 * the filters update and vice versa.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface FilterState {
  dateRange: DateRange;
  selectedDatasets: number[];
  selectedLanguages: string[];
  selectedAlgorithms: string[];
  searchTerm: string;
  activeChart: string | null;
  crossFilterValue: Record<string, any>;
}

export interface FilterContextType {
  filters: FilterState;
  // Individual filter setters
  setDateRange: (range: DateRange) => void;
  setSelectedDatasets: (datasets: number[]) => void;
  setSelectedLanguages: (languages: string[]) => void;
  setSelectedAlgorithms: (algorithms: string[]) => void;
  setSearchTerm: (term: string) => void;
  // Cross-filtering methods
  setActiveChart: (chartId: string | null) => void;
  setCrossFilter: (chartId: string, value: any) => void;
  clearCrossFilter: (chartId: string) => void;
  // Bulk operations
  resetFilters: () => void;
  applyFilters: (newFilters: Partial<FilterState>) => void;
  // Computed helpers
  hasActiveFilters: boolean;
  getFilterSummary: () => string[];
}

const initialFilterState: FilterState = {
  dateRange: { start: null, end: null },
  selectedDatasets: [],
  selectedLanguages: [],
  selectedAlgorithms: [],
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

  // Individual setters - trigger re-renders only when values change
  const setDateRange = useCallback((range: DateRange) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  }, []);

  const setSelectedDatasets = useCallback((datasets: number[]) => {
    setFilters(prev => ({ ...prev, selectedDatasets: datasets }));
  }, []);

  const setSelectedLanguages = useCallback((languages: string[]) => {
    setFilters(prev => ({ ...prev, selectedLanguages: languages }));
  }, []);

  const setSelectedAlgorithms = useCallback((algorithms: string[]) => {
    setFilters(prev => ({ ...prev, selectedAlgorithms: algorithms }));
  }, []);

  const setSearchTerm = useCallback((term: string) => {
    setFilters(prev => ({ ...prev, searchTerm: term }));
  }, []);

  // Cross-filtering: bidirectional sync between charts and sidebar
  const setActiveChart = useCallback((chartId: string | null) => {
    setFilters(prev => ({ ...prev, activeChart: chartId }));
  }, []);

  const setCrossFilter = useCallback((chartId: string, value: any) => {
    setFilters(prev => {
      const newCrossFilterValue = { ...prev.crossFilterValue, [chartId]: value };

      // Bidirectional sync: update corresponding filters based on chart type
      let updates: Partial<FilterState> = { crossFilterValue: newCrossFilterValue };

      if (chartId === 'languages-donut' && typeof value === 'string') {
        // When clicking on language donut, update selectedLanguages
        const currentLanguages = prev.selectedLanguages;
        if (currentLanguages.includes(value)) {
          updates.selectedLanguages = currentLanguages.filter(l => l !== value);
        } else {
          updates.selectedLanguages = [...currentLanguages, value];
        }
      } else if (chartId === 'datasets-chart' && typeof value === 'number') {
        // When clicking on dataset chart, update selectedDatasets
        const currentDatasets = prev.selectedDatasets;
        if (currentDatasets.includes(value)) {
          updates.selectedDatasets = currentDatasets.filter(d => d !== value);
        } else {
          updates.selectedDatasets = [...currentDatasets, value];
        }
      } else if (chartId === 'algorithms-chart' && typeof value === 'string') {
        // When clicking on algorithm chart, update selectedAlgorithms
        const currentAlgorithms = prev.selectedAlgorithms;
        if (currentAlgorithms.includes(value)) {
          updates.selectedAlgorithms = currentAlgorithms.filter(a => a !== value);
        } else {
          updates.selectedAlgorithms = [...currentAlgorithms, value];
        }
      } else if (chartId === 'timeline-bar' && value?.date) {
        // When clicking on timeline bar, filter by date
        const clickedDate = new Date(value.date);
        updates.dateRange = { start: clickedDate, end: clickedDate };
      }

      return { ...prev, ...updates, activeChart: chartId };
    });
  }, []);

  const clearCrossFilter = useCallback((chartId: string) => {
    setFilters(prev => {
      const newCrossFilterValue = { ...prev.crossFilterValue };
      delete newCrossFilterValue[chartId];
      return { ...prev, crossFilterValue: newCrossFilterValue, activeChart: null };
    });
  }, []);

  // Bulk operations
  const resetFilters = useCallback(() => {
    setFilters(initialFilterState);
  }, []);

  const applyFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Computed helpers
  const hasActiveFilters =
    filters.dateRange.start !== null ||
    filters.dateRange.end !== null ||
    filters.selectedDatasets.length > 0 ||
    filters.selectedLanguages.length > 0 ||
    filters.selectedAlgorithms.length > 0 ||
    filters.searchTerm !== '';

  const getFilterSummary = useCallback((): string[] => {
    const summary: string[] = [];

    if (filters.dateRange.start || filters.dateRange.end) {
      const start = filters.dateRange.start?.toLocaleDateString() || '...';
      const end = filters.dateRange.end?.toLocaleDateString() || '...';
      summary.push(`Fechas: ${start} - ${end}`);
    }

    if (filters.selectedDatasets.length > 0) {
      summary.push(`Datasets: ${filters.selectedDatasets.length} seleccionados`);
    }

    if (filters.selectedLanguages.length > 0) {
      summary.push(`Idiomas: ${filters.selectedLanguages.join(', ')}`);
    }

    if (filters.selectedAlgorithms.length > 0) {
      summary.push(`Algoritmos: ${filters.selectedAlgorithms.join(', ')}`);
    }

    if (filters.searchTerm) {
      summary.push(`Búsqueda: "${filters.searchTerm}"`);
    }

    return summary;
  }, [filters]);

  const value: FilterContextType = {
    filters,
    setDateRange,
    setSelectedDatasets,
    setSelectedLanguages,
    setSelectedAlgorithms,
    setSearchTerm,
    setActiveChart,
    setCrossFilter,
    clearCrossFilter,
    resetFilters,
    applyFilters,
    hasActiveFilters,
    getFilterSummary,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};
