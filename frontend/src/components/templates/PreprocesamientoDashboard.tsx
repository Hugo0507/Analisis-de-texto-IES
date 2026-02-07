/**
 * PreprocesamientoDashboard - Preprocessing visualization dashboard
 *
 * Displays metrics and charts for data preprocessing analysis.
 * Features:
 * - Metric cards for key KPIs
 * - Donut chart for language distribution
 * - Bar chart for timeline/ingestion volume
 * - Recent preparations list
 */

import React, { useState, useEffect } from 'react';
import { DashboardGrid, MetricCardDark, DonutChartViz } from '../organisms';
import { BarChartViz } from '../organisms';
import { ChartCard } from '../molecules';
import dashboardService from '../../services/dashboardService';
import type { DashboardPreprocessingData } from '../../services/dashboardService';
import { useFilter } from '../../contexts/FilterContext';

// Icons for metric cards
const FileIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

const WarningIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

export const PreprocesamientoDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardPreprocessingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { filters } = useFilter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await dashboardService.getPreprocessingData();
      setData(result);
    } catch (err) {
      setError('Error al cargar los datos del dashboard');
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters to data
  const filteredLanguages = data?.languages.filter((lang) => {
    if (filters.selectedLanguages.length === 0) return true;
    return filters.selectedLanguages.includes(lang.id);
  }) || [];

  const filteredTimeline = data?.timeline.filter((item) => {
    if (!filters.dateRange.start && !filters.dateRange.end) return true;
    const itemDate = new Date(item.date);
    if (filters.dateRange.start && itemDate < filters.dateRange.start) return false;
    if (filters.dateRange.end && itemDate > filters.dateRange.end) return false;
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Cargando dashboard...</p>
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
            onClick={fetchData}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-white">Preprocesamiento</h2>
        <p className="text-slate-400 text-sm mt-1">
          Métricas y análisis de la fase de preparación de datos
        </p>
      </div>

      {/* KPI Metrics Row */}
      <DashboardGrid columns={4} gap="md">
        <MetricCardDark
          title="Archivos Analizados"
          value={metrics?.totalFilesAnalyzed || 0}
          subtitle="Total de documentos procesados"
          icon={<FileIcon />}
          accentColor="cyan"
          trend={metrics?.totalFilesAnalyzed ? { value: 12, isPositive: true } : undefined}
        />

        <MetricCardDark
          title="Procesados OK"
          value={metrics?.filesProcessed || 0}
          subtitle="Archivos completados"
          icon={<CheckIcon />}
          accentColor="emerald"
          trend={metrics?.filesProcessed ? { value: 8, isPositive: true } : undefined}
        />

        <MetricCardDark
          title="Duplicados"
          value={metrics?.duplicatesRemoved || 0}
          subtitle="Duplicados eliminados"
          icon={<DuplicateIcon />}
          accentColor="purple"
        />

        <MetricCardDark
          title="Omitidos"
          value={metrics?.filesOmitted || 0}
          subtitle="Archivos con errores"
          icon={<WarningIcon />}
          accentColor="amber"
        />
      </DashboardGrid>

      {/* Charts Row */}
      <DashboardGrid columns={2} gap="lg">
        {/* Language Distribution Donut */}
        <ChartCard
          title="Distribución de Idiomas"
          subtitle="Idiomas detectados en los documentos"
          accentColor="purple"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          }
          isActive={filters.activeChart === 'languages-donut'}
          onRefreshClick={fetchData}
          isLoading={isLoading}
        >
          <div className="h-[280px]">
            {filteredLanguages.length > 0 ? (
              <DonutChartViz
                data={filteredLanguages}
                chartId="languages-donut"
                centerValue={filteredLanguages.reduce((sum, l) => sum + l.value, 0)}
                centerLabel="documentos"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                No hay datos de idiomas disponibles
              </div>
            )}
          </div>
        </ChartCard>

        {/* Timeline Bar Chart */}
        <ChartCard
          title="Volumen de Ingesta"
          subtitle="Actividad de procesamiento por fecha"
          accentColor="cyan"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          isActive={filters.activeChart === 'timeline-bar'}
          onRefreshClick={fetchData}
          isLoading={isLoading}
        >
          <div className="h-[280px]">
            {filteredTimeline.length > 0 ? (
              <BarChartViz
                data={filteredTimeline.map((t) => ({
                  id: t.date,
                  label: t.label || t.date,
                  value: t.count,
                }))}
                indexBy="label"
                keys={['value']}
                colorScheme="blues"
                height={260}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                No hay datos de timeline disponibles
              </div>
            )}
          </div>
        </ChartCard>
      </DashboardGrid>

      {/* Status Summary Row */}
      <DashboardGrid columns={3} gap="md">
        <ChartCard
          title="Preparaciones Completadas"
          subtitle="Procesos finalizados exitosamente"
          accentColor="emerald"
          size="sm"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        >
          <div className="flex items-center justify-center h-20">
            <span className="text-4xl font-bold text-emerald-400">
              {metrics?.completedPreparations || 0}
            </span>
          </div>
        </ChartCard>

        <ChartCard
          title="En Proceso"
          subtitle="Preparaciones activas"
          accentColor="amber"
          size="sm"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          <div className="flex items-center justify-center h-20">
            <span className="text-4xl font-bold text-amber-400">
              {metrics?.processingPreparations || 0}
            </span>
          </div>
        </ChartCard>

        <ChartCard
          title="Con Errores"
          subtitle="Preparaciones fallidas"
          accentColor="rose"
          size="sm"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          }
        >
          <div className="flex items-center justify-center h-20">
            <span className="text-4xl font-bold text-rose-400">
              {metrics?.failedPreparations || 0}
            </span>
          </div>
        </ChartCard>
      </DashboardGrid>

      {/* Recent Preparations List */}
      {data?.recentPreparations && data.recentPreparations.length > 0 && (
        <ChartCard
          title="Preparaciones Recientes"
          subtitle="Últimos procesos de preparación de datos"
          accentColor="blue"
          size="md"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          <div className="space-y-2">
            {data.recentPreparations.map((prep) => (
              <div
                key={prep.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      prep.status === 'completed'
                        ? 'bg-emerald-500'
                        : prep.status === 'processing'
                        ? 'bg-amber-500 animate-pulse'
                        : prep.status === 'error'
                        ? 'bg-rose-500'
                        : 'bg-slate-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{prep.name}</p>
                    <p className="text-xs text-slate-400">
                      {prep.dataset?.name} - {prep.files_processed || 0} archivos
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">
                    {prep.predominant_language
                      ? `${prep.predominant_language.toUpperCase()} (${prep.predominant_language_percentage}%)`
                      : 'Sin idioma'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(prep.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
};
