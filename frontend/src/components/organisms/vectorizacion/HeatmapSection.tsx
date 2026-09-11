/**
 * Pestana Heatmap: metricas por termino y matriz documento-termino.
 */

import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import type { VectorizationDashboardData } from '../../../services/dashboardService';
import { ChartCard } from '../../molecules';
import type { SelectedTerm } from './types';
import { TermHeatmap } from './TermHeatmap';
import type { HeatmapDataRow } from './types';
import type { DocTermMatrix } from '../../../services/publicTfidfAnalysisService';

export interface HeatmapSectionProps {
  activeSection: string;
  data: VectorizationDashboardData | null;
  isLoading: boolean;
  refetch: () => void;
  filters: { selectedTfidfId?: number | null };
  heatmapData: HeatmapDataRow[];
  heatmapMode: 'metrics' | 'docterm';
  setHeatmapMode: React.Dispatch<React.SetStateAction<'metrics' | 'docterm'>>;
  docTermMatrix: DocTermMatrix | null;
  setDocTermMatrix: React.Dispatch<React.SetStateAction<DocTermMatrix | null>>;
  docTermLoading: boolean;
  setSelectedTerm: React.Dispatch<React.SetStateAction<SelectedTerm | null>>;
  buildTerm: (text: string, source: SelectedTerm['source'], bowScore?: number, bowRank?: number) => SelectedTerm;
}

export const HeatmapSection: React.FC<HeatmapSectionProps> = ({
  activeSection, data, isLoading, refetch, filters, heatmapData,
  heatmapMode, setHeatmapMode, docTermMatrix, setDocTermMatrix,
  docTermLoading, setSelectedTerm, buildTerm,
}) => {
  return (
    <>
      {activeSection === 'heatmap' && (
        <ChartCard
          title={heatmapMode === 'metrics' ? 'Heatmap Métricas × Término' : 'Heatmap Documento × Término'}
          subtitle={
            heatmapMode === 'metrics'
              ? `Top ${heatmapData[0]?.data.length || 0} términos × métricas normalizadas (0–100) — haz clic en una celda para analizar el término`
              : `Top ${docTermMatrix?.top_docs.length || 0} documentos × ${docTermMatrix?.top_terms.length || 0} términos — scores TF-IDF`
          }
          accentColor="blue"
          size="xl"
          downloadable
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>}
          onRefreshClick={() => {
            if (heatmapMode === 'docterm') setDocTermMatrix(null);
            else refetch();
          }}
          isLoading={isLoading || docTermLoading}
        >
          {/* Mode toggle */}
          <div className="flex gap-1.5 mb-4">
            {(['metrics', 'docterm'] as const).map(m => (
              <button
                key={m}
                onClick={() => setHeatmapMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  heatmapMode === m
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {m === 'metrics' ? 'Métricas × Términos' : 'Documentos × Términos'}
              </button>
            ))}
          </div>

          {heatmapMode === 'metrics' && (
            <>
              <TermHeatmap
                data={heatmapData}
                onTermClick={termText => {
                  const bow = data?.selectedBow?.top_terms?.find(t => t.term === termText);
                  const term = buildTerm(termText, 'tfidf', bow?.score, bow?.rank);
                  setSelectedTerm(prev => prev?.text === termText ? null : term);
                }}
              />
              <div className="mt-3 pt-3 border-t border-slate-700/40 grid grid-cols-3 gap-4 text-xs text-slate-400">
                <div><span className="font-medium text-slate-300">BoW Freq</span><p className="mt-0.5">Frecuencia total del término en el corpus, normalizada.</p></div>
                <div><span className="font-medium text-slate-300">IDF</span><p className="mt-0.5">Especificidad del término. Alto = aparece en pocos documentos.</p></div>
                <div><span className="font-medium text-slate-300">TF-IDF</span><p className="mt-0.5">Score combinado. Alto = frecuente y específico a la vez.</p></div>
              </div>
            </>
          )}

          {heatmapMode === 'docterm' && (() => {
            if (docTermLoading) return (
              <div className="flex items-center justify-center h-[300px] gap-3 text-slate-400">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Calculando submatriz doc-término...
              </div>
            );
            if (!docTermMatrix) return (
              <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
                {filters.selectedTfidfId || data?.selectedTfidf?.id
                  ? 'No se pudo cargar la submatriz. Verifica que el análisis TF-IDF tenga artefacto serializado.'
                  : 'Selecciona un análisis TF-IDF para ver la submatriz documento × término.'}
              </div>
            );
            const h = Math.max(280, docTermMatrix.matrix.length * 38 + 100);
            return (
              <div style={{ height: `${h}px` }}>
                <ResponsiveHeatMap
                  data={docTermMatrix.matrix as any}
                  margin={{ top: 40, right: 30, bottom: 80, left: 200 }}
                  valueFormat=">-.3f"
                  axisTop={{
                    tickSize: 5, tickPadding: 5, tickRotation: -45,
                    legend: `Top ${docTermMatrix.top_terms.length} términos (por TF-IDF promedio)`, legendOffset: -36,
                  } as any}
                  axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0 } as any}
                  colors={{ type: 'sequential', scheme: 'purples' } as any}
                  emptyColor="#1e293b"
                  borderRadius={3}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.5]] } as any}
                  enableLabels={false}
                  legends={[{
                    anchor: 'bottom', translateX: 0, translateY: 72,
                    length: 240, thickness: 8, direction: 'row',
                    tickPosition: 'after', tickSize: 3, tickSpacing: 4, tickOverlap: false,
                    title: 'Score TF-IDF →', titleAlign: 'start', titleOffset: 4,
                  }] as any}
                  theme={{
                    text: { fill: '#94a3b8', fontSize: 11 },
                    axis: { ticks: { text: { fill: '#64748b' } } },
                    tooltip: { container: { background: '#1e293b', color: '#f8fafc', fontSize: 12, borderRadius: '8px', border: '1px solid #334155' } },
                  }}
                />
              </div>
            );
          })()}
        </ChartCard>
      )}
    </>
  );
};
