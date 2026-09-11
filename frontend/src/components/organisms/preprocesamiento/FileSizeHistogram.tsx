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
            title="Distribución de Tamaños de Archivos"
            subtitle={`${totalWithSize} archivos · promedio ${formatFileSize(avgBytes)}`}
            accentColor="cyan"
            size="md"
            icon={<SizeIcon />}
          >
            <div className="px-2 pb-2">
              <div className="flex items-end gap-2 h-28 sm:h-36 pt-2">
                {BINS.map((bin, i) => {
                  const count = counts[i];
                  const heightPct = (count / maxCount) * 100;
                  const pct = totalWithSize > 0 ? ((count / totalWithSize) * 100).toFixed(1) : '0';
                  return (
                    <div key={bin.label} className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative">
                      <div
                        className="w-full bg-cyan-400 rounded-t-sm transition-all duration-500 group-hover:bg-cyan-500"
                        style={{ height: `${Math.max(heightPct, count > 0 ? 4 : 0)}%` }}
                      />
                      <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                        <div className="bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          {bin.label}: {count} doc{count !== 1 ? 's' : ''} ({pct}%)
                        </div>
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-start gap-2 mt-1">
                {BINS.map((bin, i) => (
                  <div key={bin.label} className="flex-1 min-w-0 text-center">
                    <span className="text-gray-400 block truncate" style={{ fontSize: '9px' }}>{bin.label}</span>
                    {counts[i] > 0 && (
                      <span className="text-cyan-500 font-semibold" style={{ fontSize: '9px' }}>{counts[i]}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 border-t border-gray-100 pt-3" style={{ fontSize: '11px' }}>
                <span className="text-gray-500">
                  Mín: <strong className="text-gray-700">{formatFileSize(Math.min(...data.dataset!.files.map(f => f.file_size_bytes || 0).filter(s => s > 0)))}</strong>
                </span>
                <span className="text-gray-500">
                  Máx: <strong className="text-gray-700">{formatFileSize(Math.max(...data.dataset!.files.map(f => f.file_size_bytes || 0)))}</strong>
                </span>
                <span className="text-gray-500">
                  Promedio: <strong className="text-gray-700">{formatFileSize(avgBytes)}</strong>
                </span>
              </div>
            </div>
          </ChartCard>
        );
      })()}
    </>
  );
};
