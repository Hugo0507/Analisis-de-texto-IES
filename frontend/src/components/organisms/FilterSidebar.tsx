/**
 * FilterSidebar - Dashboard filter panel
 *
 * Collapsible sidebar with filters for cross-filtering dashboard charts.
 * Syncs bidirectionally with chart selections via FilterContext.
 */

import React, { useState } from 'react';
import { useFilter } from '../../contexts/FilterContext';
import { RangeSlider, MultiSelect, Autocomplete } from '../atoms';
import type { MultiSelectOption, AutocompleteOption } from '../atoms';

export interface FilterSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  datasets?: MultiSelectOption[];
  languages?: { code: string; name: string; count: number }[];
  algorithms?: string[];
  dateRange?: { min: Date; max: Date };
  searchSuggestions?: AutocompleteOption[];
  className?: string;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  datasets = [],
  languages = [],
  algorithms = [],
  dateRange,
  searchSuggestions = [],
  className = '',
}) => {
  const {
    filters,
    setDateRange,
    setSelectedDatasets,
    setSelectedLanguages,
    setSelectedAlgorithms,
    setSearchTerm,
    resetFilters,
    hasActiveFilters,
  } = useFilter();

  const [dateSliderValue, setDateSliderValue] = useState<[number, number]>([0, 100]);

  // Convert date range to slider values
  const handleDateSliderChange = (value: [number, number]) => {
    setDateSliderValue(value);
    if (dateRange) {
      const minTime = dateRange.min.getTime();
      const maxTime = dateRange.max.getTime();
      const range = maxTime - minTime;
      const start = new Date(minTime + (value[0] / 100) * range);
      const end = new Date(minTime + (value[1] / 100) * range);
      setDateRange({ start, end });
    }
  };

  const formatDateLabel = (percentage: number) => {
    if (!dateRange) return `${percentage}%`;
    const minTime = dateRange.min.getTime();
    const maxTime = dateRange.max.getTime();
    const date = new Date(minTime + (percentage / 100) * (maxTime - minTime));
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  };

  // Toggle language selection
  const toggleLanguage = (code: string) => {
    const current = filters.selectedLanguages;
    if (current.includes(code)) {
      setSelectedLanguages(current.filter((l) => l !== code));
    } else {
      setSelectedLanguages([...current, code]);
    }
  };

  // Toggle algorithm selection
  const toggleAlgorithm = (algo: string) => {
    const current = filters.selectedAlgorithms;
    if (current.includes(algo)) {
      setSelectedAlgorithms(current.filter((a) => a !== algo));
    } else {
      setSelectedAlgorithms([...current, algo]);
    }
  };

  if (isCollapsed) {
    return (
      <div
        className={`w-16 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 flex flex-col items-center py-4 ${className}`}
      >
        {/* Collapsed state - just icons */}
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors mb-6"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        {/* Filter icons */}
        <div className="space-y-4">
          <div className="p-2 rounded-lg bg-slate-800/30 text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/30 text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/30 text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-auto">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`w-72 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <span className="text-white font-semibold">Filtros</span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Filters content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Date Range */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Rango de Fechas
          </label>
          <RangeSlider
            min={0}
            max={100}
            value={dateSliderValue}
            onChange={handleDateSliderChange}
            formatLabel={formatDateLabel}
          />
        </div>

        {/* Datasets */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            Datasets
          </label>
          <MultiSelect
            options={datasets}
            value={filters.selectedDatasets}
            onChange={(val) => setSelectedDatasets(val as number[])}
            placeholder="Seleccionar datasets..."
          />
        </div>

        {/* Languages */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            Idiomas
          </label>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => {
              const isSelected = filters.selectedLanguages.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  onClick={() => toggleLanguage(lang.code)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200
                    ${isSelected
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50 shadow-lg shadow-purple-500/20'
                      : 'bg-slate-800/50 text-slate-400 border border-slate-600/50 hover:bg-slate-700/50'
                    }
                  `}
                >
                  {lang.name}
                  <span className="ml-1 text-xs opacity-60">({lang.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Algorithms */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Algoritmos
          </label>
          <div className="space-y-2">
            {algorithms.map((algo) => {
              const isSelected = filters.selectedAlgorithms.includes(algo);
              return (
                <label
                  key={algo}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200
                      ${isSelected
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-slate-600 group-hover:border-slate-500'
                      }
                    `}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-sm transition-colors ${isSelected ? 'text-white' : 'text-slate-400'}`}
                    onClick={() => toggleAlgorithm(algo)}
                  >
                    {algo}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
            <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Búsqueda
          </label>
          <Autocomplete
            value={filters.searchTerm}
            onChange={setSearchTerm}
            options={searchSuggestions}
            placeholder="Buscar términos, tópicos..."
          />
        </div>
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-slate-700/50 space-y-2">
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Filtros activos
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={resetFilters}
            className="flex-1 px-3 py-2 text-sm font-medium text-slate-400 bg-slate-800/50 border border-slate-600/50 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            Reset
          </button>
          <button
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/25"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
