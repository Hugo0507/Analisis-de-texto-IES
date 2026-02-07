/**
 * PreprocesamientoDashboard - Preprocessing visualization dashboard
 *
 * Displays metrics and charts for data preprocessing analysis.
 * Features:
 * - Metric cards for key KPIs (files, size, processed, duplicates)
 * - Donut chart for directory distribution
 * - Donut chart for extension distribution
 * - Donut chart for language distribution
 * - Preparation selector for switching between preparations
 */

import React, { useState, useEffect } from 'react';
import { DashboardGrid, MetricCardDark, DonutChartViz } from '../organisms';
import { ChartCard } from '../molecules';
import dashboardService from '../../services/dashboardService';
import type { PreprocessingDashboardData } from '../../services/dashboardService';
import { useFilter } from '../../contexts/FilterContext';

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

export const PreprocesamientoDashboard: React.FC = () => {
  const [data, setData] = useState<PreprocessingDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { filters, setSelectedPreparation } = useFilter();

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

  // Apply language filter
  const filteredLanguages = data?.languageDistribution.filter((lang) => {
    if (filters.selectedLanguages.length === 0) return true;
    return filters.selectedLanguages.includes(lang.id);
  }) || [];

  // Filter directory distribution based on selected directory
  const filteredDirectories = data?.directoryDistribution.filter((dir) => {
    if (!filters.selectedDirectory) return true;
    return dir.id === filters.selectedDirectory;
  }) || [];

  // No dataset selected state
  if (!filters.selectedDatasetId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
            <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Selecciona un Dataset</h3>
          <p className="text-slate-400 text-sm max-w-md">
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
          <p className="text-slate-400 text-sm">Cargando datos del dataset...</p>
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
          <p className="text-slate-300 mb-4">{error}</p>
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

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Preprocesamiento</h2>
          <p className="text-slate-400 text-sm mt-1">
            {dataset ? `Dataset: ${dataset.name}` : 'Métricas y análisis de la fase de preparación de datos'}
          </p>
        </div>

        {/* Preparation Selector */}
        {data?.preparations && data.preparations.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Preparación:</span>
            <select
              value={filters.selectedPreparationId || ''}
              onChange={(e) => setSelectedPreparation(e.target.value ? Number(e.target.value) : null)}
              className="bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
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

      {/* KPI Metrics Row */}
      <DashboardGrid columns={4} gap="md">
        <MetricCardDark
          title="Archivos Totales"
          value={metrics?.totalFiles || 0}
          subtitle="En el dataset"
          icon={<FileIcon />}
          accentColor="cyan"
        />

        <MetricCardDark
          title="Tamaño Total"
          value={`${metrics?.totalSizeMB?.toFixed(1) || 0} MB`}
          subtitle="Volumen de datos"
          icon={<SizeIcon />}
          accentColor="purple"
        />

        <MetricCardDark
          title="Procesados"
          value={metrics?.filesProcessed || 0}
          subtitle="Archivos preparados"
          icon={<CheckIcon />}
          accentColor="emerald"
        />

        <MetricCardDark
          title="Extensión Principal"
          value={metrics?.dominantExtension || 'N/A'}
          subtitle="Tipo más común"
          icon={<ExtensionIcon />}
          accentColor="amber"
        />
      </DashboardGrid>

      {/* Secondary Metrics Row */}
      <DashboardGrid columns={2} gap="md">
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
          isActive={filters.activeChart === 'directory-donut'}
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="h-[260px]">
            {(data?.directoryDistribution?.length || 0) > 0 ? (
              <DonutChartViz
                data={filteredDirectories.length > 0 ? filteredDirectories : data?.directoryDistribution || []}
                chartId="directory-donut"
                centerValue={data?.directoryDistribution?.reduce((sum, d) => sum + d.value, 0) || 0}
                centerLabel="archivos"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
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
          isActive={filters.activeChart === 'extension-donut'}
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="h-[260px]">
            {(data?.extensionDistribution?.length || 0) > 0 ? (
              <DonutChartViz
                data={data?.extensionDistribution || []}
                chartId="extension-donut"
                centerValue={data?.extensionDistribution?.reduce((sum, e) => sum + e.value, 0) || 0}
                centerLabel="archivos"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
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
          isActive={filters.activeChart === 'languages-donut'}
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="h-[260px]">
            {filteredLanguages.length > 0 ? (
              <DonutChartViz
                data={filteredLanguages}
                chartId="languages-donut"
                centerValue={filteredLanguages.reduce((sum, l) => sum + l.value, 0)}
                centerLabel="docs"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm text-center px-4">
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
            <div className="text-center p-3 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-emerald-400">{data.selectedPreparation.files_processed}</p>
              <p className="text-xs text-slate-400">Archivos Procesados</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-rose-400">{data.selectedPreparation.files_omitted}</p>
              <p className="text-xs text-slate-400">Omitidos</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-amber-400">{data.selectedPreparation.duplicates_removed}</p>
              <p className="text-xs text-slate-400">Duplicados</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-cyan-400">
                {data.selectedPreparation.status === 'completed' ? '100%' :
                 data.selectedPreparation.status === 'processing' ? '...' : '0%'}
              </p>
              <p className="text-xs text-slate-400">Progreso</p>
            </div>
          </div>
        </ChartCard>
      )}

      {/* No Preparations Warning */}
      {data && data.preparations.length === 0 && (
        <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-amber-400">Sin Preparaciones</h3>
              <p className="text-sm text-slate-300 mt-1">
                Este dataset no tiene preparaciones de datos. Ve a la sección de{' '}
                <a href="/admin/preparacion" className="text-amber-400 hover:underline">
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
