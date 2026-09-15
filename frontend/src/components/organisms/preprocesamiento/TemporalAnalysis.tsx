/**
 * Analisis temporal de incorporacion de archivos al dataset.
 */

import React from 'react';
import type { PreprocessingDashboardData } from '../../../services/dashboardService';
import { ChartCard } from '../../molecules';

export interface TemporalAnalysisProps {
  data: PreprocessingDashboardData | null;
}

export const TemporalAnalysis: React.FC<TemporalAnalysisProps> = ({ data }) => {
  return (
    <>
      {data?.dataset?.files && data.dataset.files.some(f => f.bib_year) && (() => {
        // Compute year distribution from bib_year field
        const yearCounts: Record<number, number> = {};
        data.dataset!.files.forEach(f => {
          if (f.bib_year) yearCounts[f.bib_year] = (yearCounts[f.bib_year] ?? 0) + 1;
        });
        const sortedYears = Object.keys(yearCounts).map(Number).sort((a, b) => a - b);
        const maxCount = Math.max(...Object.values(yearCounts), 1);

        return (
          <ChartCard
            title="Distribución Temporal"
            subtitle="Publicaciones por año (bib_year)"
            accentColor="amber"
            size="md"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          >
            <div className="px-2 pb-2">
              {/* Bar chart */}
              <div className="flex items-end gap-1 h-28 sm:h-36 pt-2">
                {sortedYears.map(year => {
                  const count = yearCounts[year];
                  const heightPct = (count / maxCount) * 100;
                  return (
                    <div key={year} className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative">
                      <div
                        className="w-full bg-stage-prep/70 rounded-t-sm transition-all duration-500 group-hover:bg-stage-prep"
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                        <div className="bg-ink-850 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          {year}: {count} doc{count !== 1 ? 's' : ''}
                        </div>
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* X-axis labels */}
              <div className="flex items-start gap-1 mt-1">
                {sortedYears.map(year => (
                  <div key={year} className="flex-1 min-w-0 text-center">
                    <span className="text-xs text-fog block truncate" style={{ fontSize: sortedYears.length > 15 ? '9px' : '10px' }}>
                      {year}
                    </span>
                  </div>
                ))}
              </div>
              {/* Summary */}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-mist border-t border-ink-700 pt-3">
                <span>
                  <strong className="text-paper">{sortedYears.length}</strong> años con publicaciones
                </span>
                <span>
                  <strong className="text-paper">{sortedYears[0]}</strong> – <strong className="text-paper">{sortedYears[sortedYears.length - 1]}</strong> rango
                </span>
                <span>
                  Pico: <strong className="text-paper">{sortedYears.find(y => yearCounts[y] === maxCount)}</strong> ({maxCount} docs)
                </span>
              </div>
            </div>
          </ChartCard>
        );
      })()}
    </>
  );
};
