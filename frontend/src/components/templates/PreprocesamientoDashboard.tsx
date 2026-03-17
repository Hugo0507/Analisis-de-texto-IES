/**
 * PreprocesamientoDashboard - Preprocessing visualization dashboard
 *
 * Displays metrics and charts for data preprocessing analysis.
 * Cross-filtering is highlight-based (Power BI style):
 * - ALL charts ALWAYS show the original backend distributions
 * - Clicking a segment highlights matching segments in other charts (dims the rest)
 * - No data is ever removed; context is always preserved
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardGrid, MetricCardDark, DonutChartViz } from '../organisms';
import type { DonutChartData } from '../organisms/DonutChartViz';
import { ChartCard } from '../molecules';
import dashboardService from '../../services/dashboardService';
import type { PreprocessingDashboardData } from '../../services/dashboardService';
import { useFilter } from '../../contexts/FilterContext';
import { LANGUAGE_NAMES } from '../../services/dataPreparationService';

// Helper
const getLanguageName = (code: string): string => {
  return LANGUAGE_NAMES[code]?.name || code.toUpperCase();
};

// Icons for metric cards
const FileIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SizeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DuplicateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ExtensionIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);

const LanguageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
  </svg>
);

// File-level entry for cross-referencing
interface FileEntry {
  directory: string;
  extension: string;
  language: string | null;
  size: number;
}

export const PreprocesamientoDashboard: React.FC = () => {
  const [data, setData] = useState<PreprocessingDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crossFilter, setCrossFilterState] = useState<{ chartId: string; segmentId: string } | null>(null);
  const { filters, setSelectedPreparation } = useFilter();

  // Reset cross-filter when dataset changes
  useEffect(() => {
    setCrossFilterState(null);
  }, [filters.selectedDatasetId]);

  // Fetch data when selected dataset changes
  useEffect(() => {
    if (filters.selectedDatasetId) {
      fetchData(filters.selectedDatasetId);
    } else {
      setData(null);
      setIsLoading(false);
    }
  }, [filters.selectedDatasetId]);

  const fetchData = async (datasetId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await dashboardService.getPreprocessingData(datasetId);
      setData(result);
    } catch (err) {
      setError('Error al cargar los datos del dataset');
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // ORIGINAL DISTRIBUTIONS (always from backend, never recomputed)
  // ============================================================

  const originalDirs = data?.directoryDistribution || [];
  const originalExts = data?.extensionDistribution || [];
  const originalLangs = data?.languageDistribution || [];

  // ============================================================
  // FILE-LEVEL DATA (for computing highlight sets when cross-filtering)
  // ============================================================

  const fileData: FileEntry[] = useMemo(() => {
    if (!data?.dataset?.files) return [];
    return data.dataset.files.map(f => ({
      // Use root-level directory (first segment of path) to match directoryStats.pie_chart_data keys
      directory: f.directory_path?.split('/')[0] || f.directory_name || 'root',
      extension: f.original_filename.split('.').pop()?.toLowerCase() || 'unknown',
      language: f.language_code || null,
      size: f.file_size_bytes,
    }));
  }, [data]);

  // ============================================================
  // CROSS-FILTER: Compute highlight sets and filtered metrics
  // ============================================================

  const crossFilterState = useMemo(() => {
    if (!crossFilter) return null;

    // Filter files matching the active cross-filter
    let matchingFiles = fileData;
    if (crossFilter.chartId === 'directory-donut') {
      matchingFiles = fileData.filter(f => f.directory === crossFilter.segmentId);
    } else if (crossFilter.chartId === 'extension-donut') {
      matchingFiles = fileData.filter(f => f.extension === crossFilter.segmentId);
    } else if (crossFilter.chartId === 'languages-donut') {
      matchingFiles = fileData.filter(f => f.language === crossFilter.segmentId);
    }

    // Count occurrences per dimension in matching files
    const dirCounts: Record<string, number> = {};
    const extCounts: Record<string, number> = {};
    const langCounts: Record<string, number> = {};
    matchingFiles.forEach(f => {
      dirCounts[f.directory] = (dirCounts[f.directory] || 0) + 1;
      extCounts[f.extension] = (extCounts[f.extension] || 0) + 1;
      if (f.language) langCounts[f.language] = (langCounts[f.language] || 0) + 1;
    });

    // Filtered distributions for non-owning charts (preserving original colors and labels)
    const filteredDirDist = originalDirs
      .filter(d => (dirCounts[d.id] || 0) > 0)
      .map(d => ({ ...d, value: dirCounts[d.id] }));

    const filteredExtDist = originalExts
      .filter(d => (extCounts[d.id] || 0) > 0)
      .map(d => ({ ...d, value: extCounts[d.id] }));

    const filteredLangDist = originalLangs
      .filter(d => (langCounts[d.id] || 0) > 0)
      .map(d => ({ ...d, value: langCounts[d.id] }));

    // Dominant extension/language in the filtered set
    const sortedExts = Object.entries(extCounts).sort((a, b) => b[1] - a[1]);
    const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
    const langTotal = sortedLangs.reduce((s, [, v]) => s + v, 0);

    return {
      filteredDirDist,
      filteredExtDist,
      filteredLangDist,
      fileCount: matchingFiles.length,
      sizeMB: matchingFiles.reduce((s, f) => s + f.size, 0) / (1024 * 1024),
      dominantExtension: sortedExts.length > 0 ? sortedExts[0][0].toUpperCase() : 'N/A',
      dominantLanguage: sortedLangs.length > 0 ? getLanguageName(sortedLangs[0][0]) : 'N/A',
      dominantLanguagePercentage: langTotal > 0 && sortedLangs.length > 0
        ? Math.round((sortedLangs[0][1] / langTotal) * 100)
        : 0,
    };
  }, [crossFilter, fileData, originalDirs, originalExts, originalLangs]);

  // ============================================================
  // CROSS-FILTER HANDLERS
  // ============================================================

  const handleSegmentClick = useCallback((chartId: string) => (datum: DonutChartData) => {
    setCrossFilterState(prev =>
      prev?.chartId === chartId && prev?.segmentId === datum.id
        ? null // Toggle off
        : { chartId, segmentId: datum.id }
    );
  }, []);

  const clearFilter = useCallback(() => setCrossFilterState(null), []);

  // ============================================================
  // DYNAMIC CENTER VALUES
  // ============================================================

  const getCenterProps = (chartId: string, chartData: DonutChartData[]): { centerValue: number; centerLabel: string } => {
    const total = chartData.reduce((s, d) => s + d.value, 0);
    const defaultLabel = chartId === 'languages-donut' ? 'docs' : 'archivos';

    if (!crossFilter || !crossFilterState) {
      return { centerValue: total, centerLabel: defaultLabel };
    }

    if (crossFilter.chartId === chartId) {
      // Owning chart: show the clicked segment's original value and label
      const originalDist = chartId === 'directory-donut' ? originalDirs
        : chartId === 'extension-donut' ? originalExts
        : originalLangs;
      const seg = originalDist.find(d => d.id === crossFilter.segmentId);
      return {
        centerValue: seg?.value || 0,
        centerLabel: seg?.label || crossFilter.segmentId,
      };
    }

    // Non-owning chart: show total matching files count
    return { centerValue: crossFilterState.fileCount, centerLabel: 'filtrados' };
  };

  // ============================================================
  // SYNCED METRICS
  // ============================================================

  const syncedMetrics = useMemo(() => {
    const predominantLang = data?.metrics?.predominantLanguage || 'N/A';
    const defaultMetrics = {
      fileCount: data?.metrics?.totalFiles || 0,
      sizeMB: data?.metrics?.totalSizeMB || 0,
      dominantExtension: data?.metrics?.dominantExtension || 'N/A',
      predominantLanguage: predominantLang === 'N/A' ? 'N/A' : getLanguageName(predominantLang),
      predominantLanguagePercentage: data?.metrics?.predominantLanguagePercentage || 0,
    };

    if (!crossFilterState) return defaultMetrics;

    return {
      fileCount: crossFilterState.fileCount,
      sizeMB: Math.round(crossFilterState.sizeMB * 100) / 100,
      dominantExtension: crossFilterState.dominantExtension,
      predominantLanguage: crossFilterState.dominantLanguage,
      predominantLanguagePercentage: crossFilterState.dominantLanguagePercentage,
    };
  }, [crossFilterState, data?.metrics]);

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const crossFilterLabel = useMemo(() => {
    if (!crossFilter) return '';
    if (crossFilter.chartId === 'directory-donut') return `Directorio: ${crossFilter.segmentId}`;
    if (crossFilter.chartId === 'extension-donut') return `Extensión: .${crossFilter.segmentId}`;
    if (crossFilter.chartId === 'languages-donut') return `Idioma: ${getLanguageName(crossFilter.segmentId)}`;
    return crossFilter.segmentId;
  }, [crossFilter]);

  // ============================================================
  // EARLY RETURNS
  // ============================================================

  if (!filters.selectedDatasetId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona un Dataset</h3>
          <p className="text-gray-500 text-sm max-w-md">
            Usa el selector de Dataset en el panel lateral izquierdo para visualizar los datos de preprocesamiento.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Cargando datos del dataset...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics;
  const dataset = data?.dataset;

  // Determine chart data and active segments:
  // - Owning chart: original data + activeSegments=[clickedId] → unselected segments muted
  // - Non-owning chart with matches: filtered distribution (recalculated), all at full color
  // - Non-owning chart with NO matches: original data + activeSegments=[] → all segments muted (gray)
  //   This avoids "No hay datos" when the filter dimension has no overlap
  const dirIsOwner = crossFilter?.chartId === 'directory-donut';
  const extIsOwner = crossFilter?.chartId === 'extension-donut';
  const langIsOwner = crossFilter?.chartId === 'languages-donut';

  const dirHasFiltered = (crossFilterState?.filteredDirDist.length ?? 0) > 0;
  const extHasFiltered = (crossFilterState?.filteredExtDist.length ?? 0) > 0;
  const langHasFiltered = (crossFilterState?.filteredLangDist.length ?? 0) > 0;

  const dirChartData = dirIsOwner || !crossFilter
    ? originalDirs
    : (dirHasFiltered ? crossFilterState!.filteredDirDist : originalDirs);

  const extChartData = extIsOwner || !crossFilter
    ? originalExts
    : (extHasFiltered ? crossFilterState!.filteredExtDist : originalExts);

  const langChartData = langIsOwner || !crossFilter
    ? originalLangs
    : (langHasFiltered ? crossFilterState!.filteredLangDist : originalLangs);

  // activeSegments:
  // - owning chart: [clickedId] → mutes everything else
  // - non-owning with matches: undefined → all segments at full color
  // - non-owning with NO matches: [] → all segments muted (signals "nothing matches here")
  const dirActiveSegments = dirIsOwner
    ? [crossFilter!.segmentId]
    : (crossFilter && !dirHasFiltered ? [] : undefined);

  const extActiveSegments = extIsOwner
    ? [crossFilter!.segmentId]
    : (crossFilter && !extHasFiltered ? [] : undefined);

  const langActiveSegments = langIsOwner
    ? [crossFilter!.segmentId]
    : (crossFilter && !langHasFiltered ? [] : undefined);

  // Center props for each chart
  const dirCenter = getCenterProps('directory-donut', dirChartData);
  const extCenter = getCenterProps('extension-donut', extChartData);
  const langCenter = getCenterProps('languages-donut', langChartData);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Preprocesamiento</h2>
          <p className="text-gray-500 text-sm mt-1">
            {dataset ? `Dataset: ${dataset.name}` : 'Métricas y análisis de la fase de preparación de datos'}
          </p>
        </div>

        {/* Preparation Selector */}
        {data?.preparations && data.preparations.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Preparación:</span>
            <select
              value={filters.selectedPreparationId || ''}
              onChange={(e) => setSelectedPreparation(e.target.value ? Number(e.target.value) : null)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400"
            >
              <option value="">Más reciente</option>
              {data.preparations.map((prep) => (
                <option key={prep.id} value={prep.id}>
                  {prep.name} ({prep.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Cross-filter active indicator */}
      {crossFilter && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm text-amber-700">
              Filtrado activo: <span className="font-medium text-amber-800">{crossFilterLabel}</span>
            </span>
          </div>
          <button
            onClick={clearFilter}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar
          </button>
        </div>
      )}

      {/* KPI Metrics Row */}
      <DashboardGrid columns={4} gap="md">
        <MetricCardDark
          title="Archivos Totales"
          value={syncedMetrics.fileCount}
          subtitle={crossFilter ? 'Archivos filtrados' : 'En el dataset'}
          icon={<FileIcon />}
          accentColor="cyan"
        />

        <MetricCardDark
          title="Tamaño Total"
          value={`${syncedMetrics.sizeMB.toFixed(1)} MB`}
          subtitle={crossFilter ? 'Volumen filtrado' : 'Volumen de datos'}
          icon={<SizeIcon />}
          accentColor="purple"
        />

        <MetricCardDark
          title="Extensión Principal"
          value={syncedMetrics.dominantExtension}
          subtitle={crossFilter ? 'Más común (filtrado)' : 'Tipo más común'}
          icon={<ExtensionIcon />}
          accentColor="amber"
        />

        <MetricCardDark
          title="Idioma Predominante"
          value={syncedMetrics.predominantLanguage}
          subtitle={
            syncedMetrics.predominantLanguage !== 'N/A'
              ? `${syncedMetrics.predominantLanguagePercentage}% de los documentos`
              : 'Ejecuta una preparación'
          }
          icon={<LanguageIcon />}
          accentColor="purple"
        />
      </DashboardGrid>

      {/* Secondary Metrics Row */}
      <DashboardGrid columns={3} gap="md">
        <MetricCardDark
          title="Procesados"
          value={metrics?.filesProcessed || 0}
          subtitle="Archivos preparados"
          icon={<CheckIcon />}
          accentColor="emerald"
        />

        <MetricCardDark
          title="Duplicados Eliminados"
          value={metrics?.duplicatesRemoved || 0}
          subtitle="Archivos duplicados removidos"
          icon={<DuplicateIcon />}
          accentColor="rose"
        />

        <MetricCardDark
          title="Archivos Omitidos"
          value={metrics?.filesOmitted || 0}
          subtitle="No procesados (errores o incompatibles)"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
          accentColor="blue"
        />
      </DashboardGrid>

      {/* Distribution Charts Row */}
      <DashboardGrid columns={3} gap="lg">
        {/* Directory Distribution Donut */}
        <ChartCard
          title="Distribución por Directorio"
          subtitle="Archivos por carpeta"
          accentColor="emerald"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
          isActive={crossFilter?.chartId === 'directory-donut'}
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="h-[260px]">
            {dirChartData.length > 0 ? (
              <DonutChartViz
                data={dirChartData}
                chartId="directory-donut"
                centerValue={dirCenter.centerValue}
                centerLabel={dirCenter.centerLabel}
                activeSegments={dirActiveSegments}
                skipCrossFilter
                onSegmentClick={handleSegmentClick('directory-donut')}
                onClearFilter={clearFilter}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No hay datos de directorios
              </div>
            )}
          </div>
        </ChartCard>

        {/* Extension Distribution Donut */}
        <ChartCard
          title="Distribución por Extensión"
          subtitle="Tipos de archivo"
          accentColor="cyan"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
          isActive={crossFilter?.chartId === 'extension-donut'}
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="h-[260px]">
            {extChartData.length > 0 ? (
              <DonutChartViz
                data={extChartData}
                chartId="extension-donut"
                centerValue={extCenter.centerValue}
                centerLabel={extCenter.centerLabel}
                activeSegments={extActiveSegments}
                skipCrossFilter
                onSegmentClick={handleSegmentClick('extension-donut')}
                onClearFilter={clearFilter}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No hay datos de extensiones
              </div>
            )}
          </div>
        </ChartCard>

        {/* Language Distribution Donut */}
        <ChartCard
          title="Distribución de Idiomas"
          subtitle="Idiomas detectados"
          accentColor="purple"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          }
          isActive={crossFilter?.chartId === 'languages-donut'}
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="h-[260px]">
            {langChartData.length > 0 ? (
              <DonutChartViz
                data={langChartData}
                chartId="languages-donut"
                centerValue={langCenter.centerValue}
                centerLabel={langCenter.centerLabel}
                activeSegments={langActiveSegments}
                skipCrossFilter
                onSegmentClick={handleSegmentClick('languages-donut')}
                onClearFilter={clearFilter}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm text-center px-4">
                {data?.selectedPreparation
                  ? 'No hay datos de idiomas detectados'
                  : 'Ejecuta una preparación para detectar idiomas'}
              </div>
            )}
          </div>
        </ChartCard>
      </DashboardGrid>

      {/* Preparation Details Card */}
      {data?.selectedPreparation && (
        <ChartCard
          title="Detalles de Preparación"
          subtitle={`${data.selectedPreparation.name} - ${data.selectedPreparation.status}`}
          accentColor="blue"
          size="md"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2">
            <div className="text-center p-3 rounded-lg bg-emerald-50">
              <p className="text-2xl font-bold text-emerald-700">{data.selectedPreparation.files_processed}</p>
              <p className="text-xs text-gray-500">Archivos Procesados</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-rose-50">
              <p className="text-2xl font-bold text-rose-700">{data.selectedPreparation.files_omitted}</p>
              <p className="text-xs text-gray-500">Omitidos</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-50">
              <p className="text-2xl font-bold text-amber-700">{data.selectedPreparation.duplicates_removed}</p>
              <p className="text-xs text-gray-500">Duplicados</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-cyan-50">
              <p className="text-2xl font-bold text-cyan-700">
                {data.selectedPreparation.status === 'completed' ? '100%' :
                 data.selectedPreparation.status === 'processing' ? '...' : '0%'}
              </p>
              <p className="text-xs text-gray-500">Progreso</p>
            </div>
          </div>
        </ChartCard>
      )}

      {/* No Preparations Warning */}
      {data && data.preparations.length === 0 && (
        <div className="p-6 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-amber-700">Sin Preparaciones</h3>
              <p className="text-sm text-gray-600 mt-1">
                Este dataset no tiene preparaciones de datos. Ve a la sección de{' '}
                <a href="/admin/preparacion" className="text-amber-700 hover:underline font-medium">
                  Administración &gt; Preparación de Datos
                </a>{' '}
                para crear una preparación y poder visualizar idiomas detectados.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
