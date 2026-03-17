/**
 * FilterSidebar - Dashboard filter panel
 *
 * Dataset selector is the MASTER filter - changing it refreshes all data.
 * Secondary filters include directory and preparation selection.
 */

import React, { useState } from 'react';
import { useFilter } from '../../contexts/FilterContext';

export interface FilterSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  className = '',
}) => {
  const {
    filters,
    datasets,
    isLoadingDatasets,
    setSelectedDataset,
    setSelectedDirectory,
    resetFilters,
    hasActiveFilters,
  } = useFilter();

  const [isDatasetDropdownOpen, setIsDatasetDropdownOpen] = useState(false);
  const [datasetSearchTerm, setDatasetSearchTerm] = useState('');

  // Filter datasets by search term
  const filteredDatasets = datasets.filter(d =>
    d.name.toLowerCase().includes(datasetSearchTerm.toLowerCase()) ||
    (d.created_by_email && d.created_by_email.toLowerCase().includes(datasetSearchTerm.toLowerCase())) ||
    (d.description && d.description.toLowerCase().includes(datasetSearchTerm.toLowerCase()))
  );

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isCollapsed) {
    return (
      <div
        className={`w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 ${className}`}
      >
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors mb-6"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        <div className="space-y-4">
          <div className="p-2 rounded-lg bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
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
      className={`w-72 bg-white border-r border-gray-200 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <span className="text-gray-900 font-semibold">Filtros</span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Filters content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Dataset Selector - MASTER FILTER */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
            Dataset
            <span className="text-xs text-emerald-600 font-normal">(Principal)</span>
          </label>

          <div className="relative">
            <button
              onClick={() => setIsDatasetDropdownOpen(!isDatasetDropdownOpen)}
              disabled={isLoadingDatasets}
              className={`
                w-full flex items-center justify-between p-3
                bg-white border border-gray-300 rounded-lg
                text-left transition-all duration-200
                ${isDatasetDropdownOpen ? 'ring-2 ring-emerald-400/50 border-emerald-400' : ''}
                ${isLoadingDatasets ? 'opacity-50 cursor-wait' : 'hover:border-gray-400'}
              `}
            >
              <div className="flex-1 min-w-0">
                {isLoadingDatasets ? (
                  <span className="text-gray-500 text-sm">Cargando...</span>
                ) : filters.selectedDataset ? (
                  <>
                    <p className="text-gray-900 text-sm font-medium truncate">
                      {filters.selectedDataset.name}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {filters.selectedDataset.total_files} archivos · {formatSize(filters.selectedDataset.total_size_bytes)}
                    </p>
                  </>
                ) : (
                  <span className="text-gray-500 text-sm">Seleccionar dataset...</span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${isDatasetDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dataset Dropdown */}
            {isDatasetDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {/* Search input */}
                {datasets.length > 3 && (
                  <div className="p-2 border-b border-gray-100">
                    <input
                      type="text"
                      value={datasetSearchTerm}
                      onChange={(e) => setDatasetSearchTerm(e.target.value)}
                      placeholder="Buscar dataset..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400"
                      autoFocus
                    />
                  </div>
                )}
                <div className="max-h-64 overflow-y-auto">
                  {filteredDatasets.length === 0 ? (
                    <div className="px-3 py-4 text-center">
                      <p className="text-gray-500 text-sm">
                        {datasets.length === 0 ? 'No hay datasets disponibles' : 'Sin resultados'}
                      </p>
                      {datasets.length === 0 && (
                        <p className="text-gray-400 text-xs mt-1">Crea uno en Admin primero</p>
                      )}
                    </div>
                  ) : (
                    filteredDatasets.map((dataset) => {
                      const isSelected = filters.selectedDatasetId === dataset.id;
                      const isCompleted = dataset.status === 'completed';
                      return (
                        <button
                          key={dataset.id}
                          onClick={() => {
                            setSelectedDataset(dataset.id);
                            setIsDatasetDropdownOpen(false);
                            setDatasetSearchTerm('');
                          }}
                          className={`
                            w-full flex items-center gap-3 px-3 py-3 text-left transition-colors
                            ${isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'}
                          `}
                        >
                          {/* Status indicator */}
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-500'
                                : dataset.status === 'processing'
                                ? 'bg-amber-500 animate-pulse'
                                : 'bg-slate-500'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                              {dataset.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {dataset.total_files} archivos · {formatSize(dataset.total_size_bytes)}
                              {dataset.created_by_email && ` · ${dataset.created_by_email}`}
                            </p>
                          </div>
                          {isSelected && (
                            <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                {/* Result count */}
                {datasets.length > 3 && (
                  <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-400">
                    {filteredDatasets.length} de {datasets.length} datasets
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Directory Filter */}
        {filters.selectedDirectory && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Directorio Activo
            </label>
            <div className="flex items-center gap-2 p-2 bg-cyan-50 border border-cyan-200 rounded-lg">
              <span className="text-cyan-700 text-sm flex-1 truncate">{filters.selectedDirectory}</span>
              <button
                onClick={() => setSelectedDirectory(null)}
                className="p-1 hover:bg-cyan-100 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Info Card */}
        {filters.selectedDataset && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Dataset Seleccionado
            </h4>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Archivos</span>
                <span className="text-gray-900 font-medium">{filters.selectedDataset.total_files}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tamaño</span>
                <span className="text-gray-900 font-medium">{formatSize(filters.selectedDataset.total_size_bytes)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estado</span>
                <span className={`font-medium ${
                  filters.selectedDataset.status === 'completed' ? 'text-emerald-600' :
                  filters.selectedDataset.status === 'processing' ? 'text-amber-600' :
                  'text-gray-500'
                }`}>
                  {filters.selectedDataset.status === 'completed' ? 'Completado' :
                   filters.selectedDataset.status === 'processing' ? 'Procesando' :
                   filters.selectedDataset.status}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Filtros activos
          </div>
        )}
        <button
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          className={`
            w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors
            ${hasActiveFilters
              ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              : 'text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed'
            }
          `}
        >
          Limpiar Filtros
        </button>
      </div>
    </div>
  );
};
