/**
 * Donuts de distribucion por directorio, extension e idioma, con
 * cross-filtering entre ellos.
 */

import React from 'react';
import type { PreprocessingDashboardData } from '../../../services/dashboardService';
import { ChartCard } from '../../molecules';
import { DashboardGrid, DonutChartViz } from '../index';
import type { DonutChartData } from '../DonutChartViz';

/** Lo que devuelve getCenterProps: el numero grande del centro y su etiqueta. */
export interface DonutCenter {
  centerValue: string | number;
  centerLabel: string;
}

export interface DistributionChartsProps {
  data: PreprocessingDashboardData | null;
  isLoading: boolean;
  refetch: () => void;
  crossFilter: { chartId: string; segmentId: string } | null;
  clearFilter: () => void;
  handleSegmentClick: (chartId: string) => (datum: DonutChartData) => void;
  dirChartData: DonutChartData[];
  extChartData: DonutChartData[];
  langChartData: DonutChartData[];
  dirActiveSegments: string[] | undefined;
  extActiveSegments: string[] | undefined;
  langActiveSegments: string[] | undefined;
  dirCenter: DonutCenter;
  extCenter: DonutCenter;
  langCenter: DonutCenter;
  originalLangs: DonutChartData[];
}

export const DistributionCharts: React.FC<DistributionChartsProps> = ({
  data, isLoading, refetch, crossFilter, clearFilter, handleSegmentClick,
  dirChartData, extChartData, langChartData,
  dirActiveSegments, extActiveSegments, langActiveSegments,
  dirCenter, extCenter, langCenter, originalLangs,
}) => {
  return (
    <>
      <DashboardGrid columns={3} gap="lg">
        {/* Directory Donut */}
        <ChartCard
          title="Distribución por directorio"
          subtitle="Archivos por carpeta"
          accentColor="emerald"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
          isActive={crossFilter?.chartId === 'directory-donut'}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
        >
          <div className="h-[300px]">
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
              <div className="flex items-center justify-center h-full text-sm text-mist">No hay datos de directorios</div>
            )}
          </div>
        </ChartCard>

        {/* Extension Donut */}
        <ChartCard
          title="Distribución por extensión"
          subtitle="Tipos de archivo"
          accentColor="cyan"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
          isActive={crossFilter?.chartId === 'extension-donut'}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
        >
          <div className="h-[300px]">
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
              <div className="flex items-center justify-center h-full text-sm text-mist">No hay datos de extensiones</div>
            )}
          </div>
        </ChartCard>

        {/* Language Donut — shows ALL detected languages */}
        <ChartCard
          title="Distribución de idiomas"
          subtitle={`Idiomas detectados${originalLangs.length > 0 ? ` · ${originalLangs.length} idioma${originalLangs.length !== 1 ? 's' : ''}` : ''}`}
          accentColor="purple"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          }
          isActive={crossFilter?.chartId === 'languages-donut'}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
        >
          <div className="h-[300px]">
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
              <div className="flex items-center justify-center h-full text-mist text-sm text-center px-4">
                {data?.selectedPreparation ? 'No hay datos de idiomas detectados' : 'Ejecuta una preparación para detectar idiomas'}
              </div>
            )}
          </div>
        </ChartCard>
      </DashboardGrid>
    </>
  );
};
