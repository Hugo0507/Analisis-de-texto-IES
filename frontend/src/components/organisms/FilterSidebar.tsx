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
        className={`w-16 h-full bg-ink-950/60 border-r border-ink-700 flex flex-col items-center py-4 ${className}`}
      >
        <button
          onClick={onToggleCollapse}
          aria-label="Mostrar filtros"
          className="p-2 rounded-lg border border-ink-700 bg-ink-900 hover:bg-ink-800 text-mist hover:text-paper transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        <div className="space-y-4">
          <div className="p-2 rounded-lg text-fog" title={filters.selectedDataset?.name}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-auto">
            <div className="w-2 h-2 rounded-full bg-stage-sum" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`w-72 h-full bg-ink-950/60 border-r border-ink-700 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-ink-700">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-mist">Filtros</span>
        <button
          onClick={onToggleCollapse}
          aria-label="Ocultar filtros"
          className="p-1.5 rounded-lg text-fog hover:text-paper hover:bg-ink-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Filters content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* Dataset Selector - MASTER FILTER */}
        <div>
          <label className="flex items-baseline justify-between text-xs font-medium text-mist mb-2">
            Dataset
            <span className="text-[11px] font-normal text-fog">filtra todo el dashboard</span>
          </label>

          <div className="relative">
            <button
              onClick={() => setIsDatasetDropdownOpen(!isDatasetDropdownOpen)}
              disabled={isLoadingDatasets}
              className={`
                w-full flex items-center justify-between gap-2 px-3.5 py-3
                bg-ink-900 border border-ink-600 rounded-xl
                text-left transition-colors duration-200
                ${isDatasetDropdownOpen ? 'border-stage-sum/60 ring-1 ring-stage-sum/30' : ''}
                ${isLoadingDatasets ? 'opacity-60 cursor-wait' : 'hover:border-fog/50'}
              `}
            >
              <div className="flex-1 min-w-0">
                {isLoadingDatasets ? (
                  <span className="text-mist text-sm">Cargando…</span>
                ) : filters.selectedDataset ? (
                  <>
                    <p className="font-display text-[15px] font-semibold text-paper truncate">
                      {filters.selectedDataset.name}
                    </p>
                    <p className="num font-mono text-[11px] text-mist mt-1">
                      {filters.selectedDataset.total_files} archivos · {formatSize(filters.selectedDataset.total_size_bytes)}
                    </p>
                  </>
                ) : (
                  <span className="text-mist text-sm">Selecciona un dataset</span>
                )}
              </div>
              <svg
                className={`w-4 h-4 shrink-0 text-fog transition-transform ${isDatasetDropdownOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dataset Dropdown */}
            {isDatasetDropdownOpen && (
              <div className="absolute z-50 mt-2 w-full bg-ink-850 border border-ink-600 rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
                {/* Search input */}
                {datasets.length > 3 && (
                  <div className="p-2 border-b border-ink-700">
                    <input
                      type="text"
                      value={datasetSearchTerm}
                      onChange={(e) => setDatasetSearchTerm(e.target.value)}
                      placeholder="Buscar dataset"
                      className="w-full px-3 py-2 bg-ink-900 border border-ink-600 rounded-lg text-sm text-paper placeholder-fog focus:outline-none focus:border-stage-sum/60"
                      autoFocus
                    />
                  </div>
                )}
                <div className="max-h-64 overflow-y-auto">
                  {filteredDatasets.length === 0 ? (
                    <div className="px-3 py-4 text-center">
                      <p className="text-mist text-sm">
                        {datasets.length === 0 ? 'No hay datasets disponibles' : 'Sin resultados'}
                      </p>
                      {datasets.length === 0 && (
                        <p className="text-fog text-xs mt-1">Crea uno desde Administración.</p>
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
                            ${isSelected ? 'bg-stage-sum/10' : 'hover:bg-ink-800'}
                          `}
                        >
                          {/* Status indicator */}
                          <div
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              isCompleted
                                ? 'bg-stage-sum'
                                : dataset.status === 'processing'
                                ? 'bg-stage-mod animate-pulse'
                                : 'bg-fog'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${isSelected ? 'text-paper font-medium' : 'text-paper/90'}`}>
                              {dataset.name}
                            </p>
                            <p className="num text-xs text-mist truncate">
                              {dataset.total_files} archivos · {formatSize(dataset.total_size_bytes)}
                              {dataset.created_by_email && ` · ${dataset.created_by_email}`}
                            </p>
                          </div>
                          {isSelected && (
                            <svg className="w-4 h-4 text-stage-sum flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div className="num px-3 py-2 border-t border-ink-700 text-xs text-fog">
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
            <label className="flex items-center gap-2 text-xs font-medium text-mist mb-2">
              <svg className="w-3.5 h-3.5 text-stage-prep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Directorio Activo
            </label>
            <div className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-stage-prep/10 border border-stage-prep/25 rounded-lg">
              <span className="text-paper text-sm flex-1 truncate">{filters.selectedDirectory}</span>
              <button
                onClick={() => setSelectedDirectory(null)}
                aria-label="Quitar filtro de directorio"
                className="p-1 hover:bg-stage-prep/15 rounded-md transition-colors"
              >
                <svg className="w-4 h-4 text-stage-prep" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Info Card */}
        {filters.selectedDataset && (
          <div className="pt-5 border-t border-ink-700">
            <h4 className="font-mono text-[11px] font-medium text-fog uppercase tracking-[0.14em] mb-3">
              Dataset seleccionado
            </h4>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-mist">Archivos</span>
                <span className="num text-paper font-medium">{filters.selectedDataset.total_files}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-mist">Tamaño</span>
                <span className="num text-paper font-medium">{formatSize(filters.selectedDataset.total_size_bytes)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-mist">Estado</span>
                <span className={`font-medium ${
                  filters.selectedDataset.status === 'completed' ? 'text-stage-sum' :
                  filters.selectedDataset.status === 'processing' ? 'text-stage-mod' :
                  'text-mist'
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
      <div className="px-5 py-4 border-t border-ink-700 space-y-2">
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-xs text-mist mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-stage-sum" />
            Filtros activos
          </div>
        )}
        <button
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          className={`
            w-full px-3 py-2 text-sm font-medium rounded-xl transition-colors
            ${hasActiveFilters
              ? 'text-paper bg-ink-900 border border-ink-600 hover:bg-ink-800'
              : 'text-fog/70 border border-ink-700 cursor-not-allowed'
            }
          `}
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
};
