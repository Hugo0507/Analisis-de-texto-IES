/**
 * VectorizacionDashboard - Vectorization visualization dashboard
 *
 * Displays vectorization analysis results:
 * - Word Cloud from Bag of Words
 * - N-gram bar chart
 * - TF-IDF top terms
 */

import React, { useState, useEffect } from 'react';
import { DashboardGrid, MetricCardDark } from '../organisms';
import { ChartCard } from '../molecules';
import dashboardService from '../../services/dashboardService';
import type { VectorizationDashboardData } from '../../services/dashboardService';
import { useFilter } from '../../contexts/FilterContext';

// Simple Word Cloud Component (inline)
interface WordCloudProps {
  data: Array<{ text: string; value: number }>;
  maxWords?: number;
}

const SimpleWordCloud: React.FC<WordCloudProps> = ({ data, maxWords = 50 }) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const getFontSize = (value: number) => {
    const normalized = (value - minValue) / range;
    return 12 + normalized * 24; // 12px to 36px
  };

  const getOpacity = (value: number) => {
    const normalized = (value - minValue) / range;
    return 0.5 + normalized * 0.5; // 0.5 to 1
  };

  const colors = ['text-emerald-400', 'text-cyan-400', 'text-purple-400', 'text-blue-400', 'text-amber-400'];

  return (
    <div className="flex flex-wrap justify-center items-center gap-2 p-4">
      {data.slice(0, maxWords).map((word, i) => (
        <span
          key={word.text}
          className={`${colors[i % colors.length]} hover:scale-110 transition-transform cursor-default`}
          style={{
            fontSize: `${getFontSize(word.value)}px`,
            opacity: getOpacity(word.value),
          }}
          title={`${word.text}: ${word.value}`}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
};

// Horizontal Bar Chart (inline, dark-themed)
interface HorizontalBarChartProps {
  data: Array<{ id: string; label: string; value: number }>;
  maxBars?: number;
  colorClass?: string;
}

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ data, maxBars = 15, colorClass = 'bg-cyan-500' }) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const displayData = data.slice(0, maxBars);

  return (
    <div className="space-y-2">
      {displayData.map((item) => (
        <div key={item.id} className="flex items-center gap-3">
          <div className="w-32 text-right">
            <span className="text-xs text-slate-300 truncate block" title={item.label}>
              {item.label}
            </span>
          </div>
          <div className="flex-1 h-6 bg-slate-800/50 rounded-full overflow-hidden">
            <div
              className={`h-full ${colorClass} rounded-full transition-all duration-500`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
          <div className="w-16 text-right">
            <span className="text-xs text-slate-400">{item.value.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export const VectorizacionDashboard: React.FC = () => {
  const [data, setData] = useState<VectorizationDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { filters, setSelectedBow, setSelectedNgram, setSelectedTfidf } = useFilter();

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
      const result = await dashboardService.getVectorizationData(datasetId);
      setData(result);
    } catch (err) {
      setError('Error al cargar los datos de vectorización');
      console.error('Vectorization dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
            Usa el selector de Dataset en el panel lateral izquierdo para visualizar los análisis de vectorización.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Cargando análisis de vectorización...</p>
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
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const hasAnyData =
    (data?.bowAnalyses?.length || 0) > 0 ||
    (data?.ngramAnalyses?.length || 0) > 0 ||
    (data?.tfidfAnalyses?.length || 0) > 0;

  // No analyses available
  if (!hasAnyData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Vectorización</h2>
          <p className="text-slate-400 text-sm mt-1">
            Análisis de Bag of Words, N-gramas y TF-IDF
          </p>
        </div>

        <div className="p-8 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Sin Análisis de Vectorización</h3>
            <p className="text-slate-400 max-w-md mx-auto mb-6">
              No se han encontrado análisis de vectorización para este dataset.
              Crea un análisis de Bag of Words, N-gramas o TF-IDF desde la sección de Administración.
            </p>
            <a
              href="/admin/bow"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Análisis
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Vectorización</h2>
          <p className="text-slate-400 text-sm mt-1">
            Análisis de Bag of Words, N-gramas y TF-IDF
          </p>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <DashboardGrid columns={4} gap="md">
        <MetricCardDark
          title="Análisis BoW"
          value={data?.bowAnalyses?.length || 0}
          subtitle="Bag of Words"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          accentColor="cyan"
        />

        <MetricCardDark
          title="Análisis N-gramas"
          value={data?.ngramAnalyses?.length || 0}
          subtitle="Secuencias de tokens"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          }
          accentColor="purple"
        />

        <MetricCardDark
          title="Análisis TF-IDF"
          value={data?.tfidfAnalyses?.length || 0}
          subtitle="Ponderación de términos"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          accentColor="blue"
        />

        <MetricCardDark
          title="Vocabulario"
          value={data?.selectedBow?.vocabulary_size?.toLocaleString() || '—'}
          subtitle="Términos únicos"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          }
          accentColor="emerald"
        />
      </DashboardGrid>

      {/* Word Cloud from BoW */}
      {data?.wordCloudData && data.wordCloudData.length > 0 && (
        <ChartCard
          title="Nube de Palabras"
          subtitle={`Top términos de Bag of Words${data.selectedBow ? ` - ${data.selectedBow.name}` : ''}`}
          accentColor="cyan"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          }
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="h-[280px] overflow-hidden">
            <SimpleWordCloud data={data.wordCloudData} maxWords={50} />
          </div>
        </ChartCard>
      )}

      {/* Two-column layout for N-grams and TF-IDF */}
      <DashboardGrid columns={2} gap="lg">
        {/* N-gram Analysis */}
        <ChartCard
          title="Top N-gramas"
          subtitle={data?.selectedNgram ? `${data.selectedNgram.name}` : 'Secuencias más frecuentes'}
          accentColor="purple"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          }
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="h-[300px] overflow-y-auto">
            {data?.ngramBarData && data.ngramBarData.length > 0 ? (
              <HorizontalBarChart
                data={data.ngramBarData}
                maxBars={12}
                colorClass="bg-gradient-to-r from-purple-500 to-violet-500"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                {data?.ngramAnalyses?.length === 0
                  ? 'No hay análisis de N-gramas disponibles'
                  : 'Sin datos de N-gramas para mostrar'}
              </div>
            )}
          </div>
        </ChartCard>

        {/* TF-IDF Top Terms */}
        <ChartCard
          title="Top TF-IDF"
          subtitle={data?.selectedTfidf ? `${data.selectedTfidf.name}` : 'Términos con mayor peso'}
          accentColor="blue"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
          isLoading={isLoading}
        >
          <div className="h-[300px] overflow-y-auto">
            {data?.tfidfTopTerms && data.tfidfTopTerms.length > 0 ? (
              <HorizontalBarChart
                data={data.tfidfTopTerms.slice(0, 12).map(t => ({
                  id: t.term,
                  label: t.term,
                  value: Math.round(t.score * 1000) / 1000,
                }))}
                maxBars={12}
                colorClass="bg-gradient-to-r from-blue-500 to-cyan-500"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                {data?.tfidfAnalyses?.length === 0
                  ? 'No hay análisis TF-IDF disponibles'
                  : 'Sin datos TF-IDF para mostrar'}
              </div>
            )}
          </div>
        </ChartCard>
      </DashboardGrid>

      {/* Analysis Selector Section */}
      {(data?.bowAnalyses?.length || 0) > 1 || (data?.ngramAnalyses?.length || 0) > 1 || (data?.tfidfAnalyses?.length || 0) > 1 ? (
        <ChartCard
          title="Selección de Análisis"
          subtitle="Elige qué análisis visualizar"
          accentColor="emerald"
          size="sm"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          }
        >
          <div className="grid grid-cols-3 gap-4 p-2">
            {/* BoW Selector */}
            {data?.bowAnalyses && data.bowAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Bag of Words</label>
                <select
                  value={filters.selectedBowId || ''}
                  onChange={(e) => setSelectedBow(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  <option value="">Más reciente</option>
                  {data.bowAnalyses.map((bow) => (
                    <option key={bow.id} value={bow.id}>
                      {bow.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* N-gram Selector */}
            {data?.ngramAnalyses && data.ngramAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">N-gramas</label>
                <select
                  value={filters.selectedNgramId || ''}
                  onChange={(e) => setSelectedNgram(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  <option value="">Más reciente</option>
                  {data.ngramAnalyses.map((ngram) => (
                    <option key={ngram.id} value={ngram.id}>
                      {ngram.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* TF-IDF Selector */}
            {data?.tfidfAnalyses && data.tfidfAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">TF-IDF</label>
                <select
                  value={filters.selectedTfidfId || ''}
                  onChange={(e) => setSelectedTfidf(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  <option value="">Más reciente</option>
                  {data.tfidfAnalyses.map((tfidf) => (
                    <option key={tfidf.id} value={tfidf.id}>
                      {tfidf.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </ChartCard>
      ) : null}

      {/* Analysis Details */}
      {data?.selectedBow && (
        <ChartCard
          title="Detalles de Bag of Words"
          subtitle={data.selectedBow.name}
          accentColor="cyan"
          size="md"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2">
            <div className="text-center p-3 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-cyan-400">{data.selectedBow.vocabulary_size?.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Vocabulario</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-emerald-400">{data.selectedBow.document_count?.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Documentos</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-purple-400">{data.selectedBow.min_df || 1}</p>
              <p className="text-xs text-slate-400">Min DF</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-amber-400">{data.selectedBow.max_features || '∞'}</p>
              <p className="text-xs text-slate-400">Max Features</p>
            </div>
          </div>
        </ChartCard>
      )}
    </div>
  );
};
