/**
 * Curva de perdida de entrenamiento por epoca.
 */

import React, { useMemo } from 'react';
import { ResponsiveLine } from '@nivo/line';
import { ChartCard } from '../../molecules';

export interface LossCurveChartProps {
  lossHistory: number[];
}

export const LossCurveChart: React.FC<LossCurveChartProps> = ({ lossHistory }) => {
  const lineData = useMemo(() => {
    if (lossHistory.length === 0) return [];
    return [{
      id: 'loss',
      data: lossHistory.map((v, i) => ({ x: i + 1, y: v })),
    }];
  }, [lossHistory]);

  if (lineData.length === 0) {
    return (
      <ChartCard title="Curva de pérdida" subtitle="Entrenamiento por época" accentColor="cyan" size="md">
        <div className="flex h-full items-center justify-center text-sm text-mist">Sin historial de pérdida disponible.</div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Curva de pérdida"
      subtitle="CrossEntropyLoss por época durante el entrenamiento"
      accentColor="cyan"
      size="md"
      icon={
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      }
    >
      <div style={{ height: '260px' }}>
        <ResponsiveLine
          data={lineData}
          margin={{ top: 16, right: 20, bottom: 44, left: 50 }}
          xScale={{ type: 'linear', min: 1, max: lossHistory.length }}
          yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false }}
          curve="monotoneX"
          colors={['#A6D854']}
          lineWidth={2}
          pointSize={lossHistory.length <= 30 ? 5 : 0}
          pointColor="#0D1424"
          pointBorderWidth={2}
          pointBorderColor="#A6D854"
          enableArea
          areaOpacity={0.12}
          enableGridX={false}
          axisBottom={{
            legend: 'Época',
            legendOffset: 34,
            legendPosition: 'middle',
            tickSize: 4,
          }}
          axisLeft={{
            legend: 'Pérdida',
            legendOffset: -42,
            legendPosition: 'middle',
            tickSize: 4,
          }}
          theme={{
            text: { fill: '#97A6BE', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
            axis: {
              ticks: { text: { fill: '#7A89A3', fontSize: 10 } },
              legend: { text: { fill: '#97A6BE', fontSize: 11 } },
            },
            grid: { line: { stroke: '#1F2A44' } },
          }}
          tooltip={({ point }) => (
            <div className="rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-xs text-paper shadow-xl">
              {`Época ${point.data.x} · Pérdida: ${(point.data.y as number).toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`}
            </div>
          )}
        />
      </div>
    </ChartCard>
  );
};
