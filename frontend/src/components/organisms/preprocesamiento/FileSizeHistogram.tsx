/**
 * Histograma de distribucion de tamanos de archivo (VIZ-1).
 */

import React from 'react';
import type { PreprocessingDashboardData } from '../../../services/dashboardService';
import { ChartCard } from '../../molecules';
import { SizeIcon } from './icons';
import { formatFileSize } from './helpers';

export interface FileSizeHistogramProps {
  data: PreprocessingDashboardData | null;
}

export const FileSizeHistogram: React.FC<FileSizeHistogramProps> = ({ data }) => {
  return (
    <>
      {data?.dataset?.files && data.dataset.files.length > 0 && (() => {
        const BINS = [
          { label: '0–10 KB',    min: 0,          max: 10 * 1024 },
          { label: '10–50 KB',   min: 10 * 1024,  max: 50 * 1024 },
          { label: '50–100 KB',  min: 50 * 1024,  max: 100 * 1024 },
          { label: '100–500 KB', min: 100 * 1024, max: 500 * 1024 },
          { label: '500 KB–1 MB', min: 500 * 1024, max: 1024 * 1024 },
          { label: '1 MB+',      min: 1024 * 1024, max: Infinity },
        ];
        const counts = BINS.map(b =>
          data.dataset!.files.filter(f => f.file_size_bytes >= b.min && f.file_size_bytes < b.max).length
        );
        const maxCount = Math.max(...counts, 1);
        const totalWithSize = data.dataset!.files.filter(f => f.file_size_bytes > 0).length;
        const avgBytes = totalWithSize > 0
          ? data.dataset!.files.reduce((s, f) => s + (f.file_size_bytes || 0), 0) / totalWithSize
          : 0;

        return (
          <ChartCard
            title="Distribución de tamaños de archivo"
            subtitle={`${totalWithSize} archivos · promedio ${formatFileSize(avgBytes)}`}
            accentColor="cyan"
            size="md"
            icon={<SizeIcon />}
          >
            <div className="px-2 pb-2">
              <div className="flex items-stretch gap-2 h-32 sm:h-40 pt-6 border-b border-ink-700">
                {BINS.map((bin, i) => {
                  const count = counts[i];
                  const heightPct = (count / maxCount) * 100;
                  const pct = totalWithSize > 0 ? ((count / totalWithSize) * 100).toFixed(1) : '0';
                  return (
                    <div key={bin.label} className="flex-1 flex flex-col items-center justify-end h-full min-w-0 group relative">
                      <div
                        className="w-full bg-stage-prep/70 rounded-t transition-colors duration-200 group-hover:bg-stage-prep"
                        style={{ height: `${Math.max(heightPct, count > 0 ? 4 : 0)}%` }}
                      />
                      <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                        <div className="num bg-ink-800 border border-ink-600 text-paper text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg shadow-black/40">
                          {bin.label}: {count} doc{count !== 1 ? 's' : ''} ({pct}%)
                        </div>
                        
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-start gap-2 mt-2">
                {BINS.map((bin, i) => (
                  <div key={bin.label} className="flex-1 min-w-0 text-center">
                    <span className="num text-[11px] text-mist block truncate">{bin.label}</span>
                    {counts[i] > 0 && (
                      <span className="num text-[11px] font-medium text-paper">{counts[i]}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="num mt-3 flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
                <span className="text-mist">
                  Mín: <strong className="text-paper">{formatFileSize(Math.min(...data.dataset!.files.map(f => f.file_size_bytes || 0).filter(s => s > 0)))}</strong>
                </span>
                <span className="text-mist">
                  Máx: <strong className="text-paper">{formatFileSize(Math.max(...data.dataset!.files.map(f => f.file_size_bytes || 0)))}</strong>
                </span>
                <span className="text-mist">
                  Promedio: <strong className="text-paper">{formatFileSize(avgBytes)}</strong>
                </span>
              </div>
            </div>
          </ChartCard>
        );
      })()}
    </>
  );
};
