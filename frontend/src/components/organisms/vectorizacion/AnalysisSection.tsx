/**
 * Pestana Analisis del dashboard de Vectorizacion.
 *
 * Es la seccion mas acoplada del dashboard: usa 38 identificadores del
 * componente padre. Pasarlos sueltos habria dado un componente con ~30 props,
 * que traslada el acoplamiento del cuerpo a la cabecera sin mejorar nada. En
 * su lugar, el estado se agrupo antes en tres hooks cohesivos
 * -useVocabularyView, useNgramConfigs y useTermSelection- y aqui llegan como
 * tres objetos. Son 11 props, y el JSX no cambio una linea.
 */

import React from 'react';
import type { VectorizationDashboardData } from '../../../services/dashboardService';
import { ChartCard } from '../../molecules';
import { DashboardGrid } from '../index';
import { SimpleWordCloud } from './SimpleWordCloud';
import { VocabularyTable } from './VocabularyTable';
import { HorizontalBarChart } from './HorizontalBarChart';
import { TfIdfScatter } from './TfIdfScatter';
import { CloudIcon, TableIcon } from './icons';
import type { ScatterPoint } from './types';
import type { VocabularyView } from '../../../hooks/useVocabularyView';
import type { NgramConfigs } from '../../../hooks/useNgramConfigs';
import type { TermSelection } from '../../../hooks/useTermSelection';

export interface AnalysisSectionProps {
  activeSection: string;
  data: VectorizationDashboardData | null;
  isLoading: boolean;
  refetch: () => void;
  filters: {
    selectedBowId?: number | null;
    selectedNgramId?: number | null;
    selectedTfidfId?: number | null;
  };
  filterSetters: {
    setSelectedBow: (id: number | null) => void;
    setSelectedNgram: (id: number | null) => void;
    setSelectedTfidf: (id: number | null) => void;
  };
  vocab: VocabularyView;
  ngram: NgramConfigs;
  terms: TermSelection;
  scatterData: ScatterPoint[];
  tfidfScoresMap: Record<string, number>;
}

export const AnalysisSection: React.FC<AnalysisSectionProps> = ({
  activeSection,
  data,
  isLoading,
  refetch,
  filters,
  filterSetters,
  vocab,
  ngram,
  terms,
  scatterData,
  tfidfScoresMap,
}) => {
  // Se desestructuran aqui para que el JSX siga identico al que vivia en el
  // dashboard: ni una referencia tuvo que reescribirse.
  const {
    fullVocabulary, idfValues, idfBounds, idfFilteredVocab,
    vocabView, setVocabView, idfRange, setIdfRange,
    compareTerms, setCompareTerms,
  } = vocab;
  const {
    ngramConfigs, activeNgramConfig, setActiveNgramConfig,
    activeConfig, activeNgramTerms,
  } = ngram;
  const {
    selectedTerm, handleWordClick, handleVocabTableClick,
    handleBarClick, handleScatterClick,
  } = terms;
  const { setSelectedBow, setSelectedNgram, setSelectedTfidf } = filterSetters;

  return (
    <>
      {activeSection === 'analysis' && <>

      {/* ── BoW: Nube de Palabras ↔ Tabla de Vocabulario ── */}
      {(data?.wordCloudData?.length || 0) > 0 || Object.keys(fullVocabulary).length > 0 ? (
        <ChartCard
          title={vocabView === 'cloud' ? 'Nube de palabras' : 'Vocabulario completo'}
          subtitle={vocabView === 'cloud'
            ? `Haz clic en una palabra para ver su análisis${data?.selectedBow ? ` · ${data.selectedBow.name}` : ''}`
            : `${Object.keys(fullVocabulary).length > 0 ? Object.keys(fullVocabulary).length.toLocaleString() : data?.selectedBow?.vocabulary_size?.toLocaleString() || 0} términos — haz clic para analizar`}
          accentColor="cyan"
          size="lg"
          icon={vocabView === 'cloud' ? <CloudIcon /> : <TableIcon />}
          downloadable={vocabView === 'cloud'}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
          headerExtra={
            <button
              onClick={() => setVocabView(v => v === 'cloud' ? 'table' : 'cloud')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-ink-600/50 text-haze hover:bg-ink-800/40 hover:text-white transition-colors"
            >
              {vocabView === 'cloud' ? <><TableIcon /><span>Ver tabla</span></> : <><CloudIcon /><span>Ver nube</span></>}
            </button>
          }
        >
          {vocabView === 'cloud' ? (
            <div className="min-h-[280px] overflow-hidden">
              <SimpleWordCloud
                data={data?.wordCloudData || []}
                maxWords={60}
                onWordClick={handleWordClick}
                selectedWord={selectedTerm?.source === 'bow' ? selectedTerm.text : null}
              />
            </div>
          ) : (
            <div className="p-1">
              {/* TRANS-5: IDF range filter */}
              {Object.keys(idfValues).length > 0 && (
                <div className="flex items-center gap-3 mb-3 px-1 py-2 rounded-lg bg-ink-850/40 border border-ink-700/40">
                  <span className="text-xs text-mist whitespace-nowrap font-medium shrink-0">Filtrar IDF:</span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-fog w-10 text-right shrink-0">{idfRange[0].toFixed(2)}</span>
                    <input
                      type="range" min={idfBounds.min} max={idfBounds.max} step={idfBounds.step}
                      value={idfRange[0]}
                      onChange={e => setIdfRange([Math.min(Number(e.target.value), idfRange[1] - idfBounds.step), idfRange[1]])}
                      className="flex-1 h-1.5 accent-blue-500"
                    />
                    <input
                      type="range" min={idfBounds.min} max={idfBounds.max} step={idfBounds.step}
                      value={idfRange[1]}
                      onChange={e => setIdfRange([idfRange[0], Math.max(Number(e.target.value), idfRange[0] + idfBounds.step)])}
                      className="flex-1 h-1.5 accent-blue-500"
                    />
                    <span className="text-xs text-fog w-10 shrink-0">{idfRange[1].toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => setIdfRange([idfBounds.min, idfBounds.max])}
                    className="text-xs text-mist hover:text-white px-2 py-1 rounded hover:bg-ink-800/50 transition-colors shrink-0"
                  >Reset</button>
                  <span className="text-xs text-blue-400 shrink-0">{Object.keys(idfFilteredVocab).length} términos</span>
                </div>
              )}
              <VocabularyTable
                vocabulary={Object.keys(idfFilteredVocab).length > 0 ? idfFilteredVocab : Object.fromEntries((data?.selectedBow?.top_terms || []).map(t => [t.term, t.score]))}
                idfValues={idfValues}
                tfidfScores={tfidfScoresMap}
                onTermClick={handleVocabTableClick}
                selectedTerm={selectedTerm?.text ?? null}
                compareTerms={compareTerms}
                onCompareToggle={term => {
                  setCompareTerms(prev => prev.includes(term) ? prev.filter(t => t !== term) : prev.length < 3 ? [...prev, term] : prev);
                }}
              />
            </div>
          )}
        </ChartCard>
      ) : null}

      {/* ── N-gramas con Tabs + TF-IDF side by side ── */}
      <DashboardGrid columns={2} gap="lg">
        {/* N-gramas con tabs por tamaño */}
        <ChartCard
          title="N-gramas"
          subtitle={activeConfig
            ? `${activeConfig.label} · ${activeConfig.vocabSize?.toLocaleString() || activeConfig.terms.length} términos`
            : data?.selectedNgram ? data.selectedNgram.name : 'Secuencias más frecuentes'}
          accentColor="purple"
          size="lg"
          downloadable
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
        >
          {/* Tabs por configuración */}
          {ngramConfigs.length > 1 && (
            <div className="flex gap-1 mb-3 flex-wrap border-b border-ink-700/40 pb-2">
              {ngramConfigs.map(cfg => (
                <button key={cfg.key}
                  onClick={() => setActiveNgramConfig(cfg.key)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    (activeNgramConfig === cfg.key || (!activeNgramConfig && cfg === ngramConfigs[0]))
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'text-mist hover:text-paper hover:bg-ink-800/30'
                  }`}
                >
                  {cfg.label}
                  <span className="ml-1.5 text-fog text-xs">({cfg.vocabSize?.toLocaleString() || cfg.terms.length})</span>
                </button>
              ))}
            </div>
          )}
          <div className="h-[280px] overflow-y-auto pr-1">
            {activeNgramTerms.length > 0 ? (
              <HorizontalBarChart
                data={activeNgramTerms}
                maxBars={15}
                colorClass="bg-gradient-to-r from-purple-500 to-violet-500"
                onItemClick={handleBarClick('ngram')}
                selectedId={selectedTerm?.source === 'ngram' ? selectedTerm.text : null}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-fog text-sm">
                {data?.ngramAnalyses?.length === 0 ? 'No hay análisis de N-gramas disponibles' : 'Sin datos de N-gramas'}
              </div>
            )}
          </div>
        </ChartCard>

        {/* TF-IDF Top Terms */}
        <ChartCard
          title="Top TF-IDF"
          subtitle={`Haz clic para analizar · ${data?.selectedTfidf ? data.selectedTfidf.name : 'Términos con mayor peso'}`}
          accentColor="blue"
          size="lg"
          downloadable
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
        >
          <div className="h-[300px] overflow-y-auto pr-1">
            {data?.tfidfTopTerms && data.tfidfTopTerms.length > 0 ? (
              <HorizontalBarChart
                data={data.tfidfTopTerms.slice(0, 15).map(t => ({ id: t.term, label: t.term, value: Math.round(t.score * 10000) / 10000 }))}
                maxBars={15}
                colorClass="bg-gradient-to-r from-blue-500 to-cyan-500"
                onItemClick={handleBarClick('tfidf')}
                selectedId={selectedTerm?.source === 'tfidf' ? selectedTerm.text : null}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-fog text-sm">
                {data?.tfidfAnalyses?.length === 0 ? 'No hay análisis TF-IDF disponibles' : 'Sin datos TF-IDF'}
              </div>
            )}
          </div>
        </ChartCard>
      </DashboardGrid>

      {/* ── Scatter Plot TF vs IDF ── */}
      {data?.selectedTfidf && (
        <ChartCard
          title="Scatter: TF vs IDF"
          subtitle={`Cada punto es un término — posición: frecuencia (X) vs especificidad (Y) — tamaño: score TF-IDF · ${scatterData.length} términos`}
          accentColor="blue"
          size="lg"
          downloadable
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
        >
          <div className="pt-2 pl-4">
            <TfIdfScatter
              data={scatterData}
              onPointClick={handleScatterClick}
              selectedTerm={selectedTerm?.text ?? null}
            />
          </div>
          {/* Interpretation guide */}
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-mist border-t border-ink-700/40 pt-3">
            <div className="space-y-1">
              <p className="font-medium text-haze">↗ Arriba-izquierda</p>
              <p>IDF alto + TF bajo → Términos raros y específicos (muy descriptivos)</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-haze">↘ Abajo-derecha</p>
              <p>IDF bajo + TF alto → Términos comunes (stopwords residuales o ruido)</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-haze">↗ Arriba-derecha</p>
              <p>IDF alto + TF alto → Términos clave del corpus (ideal para análisis)</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-haze">↙ Abajo-izquierda</p>
              <p>IDF bajo + TF bajo → Términos poco significativos en general</p>
            </div>
          </div>
        </ChartCard>
      )}

      {/* ── Analysis Selector (when multiple) ── */}
      {((data?.bowAnalyses?.length || 0) > 1 || (data?.ngramAnalyses?.length || 0) > 1 || (data?.tfidfAnalyses?.length || 0) > 1) && (
        <ChartCard
          title="Selección de análisis"
          subtitle="Elige qué análisis visualizar"
          accentColor="emerald"
          size="sm"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
        >
          <div className="grid grid-cols-3 gap-4 p-2">
            {data?.bowAnalyses && data.bowAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-mist block mb-1">Bag of Words</label>
                <select value={filters.selectedBowId || ''} onChange={e => setSelectedBow(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-ink-850/50 border border-ink-600/50 rounded-lg px-3 py-1.5 text-sm text-white">
                  <option value="">Más reciente</option>
                  {data.bowAnalyses.map(bow => <option key={bow.id} value={bow.id}>{bow.name}</option>)}
                </select>
              </div>
            )}
            {data?.ngramAnalyses && data.ngramAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-mist block mb-1">N-gramas</label>
                <select value={filters.selectedNgramId || ''} onChange={e => setSelectedNgram(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-ink-850/50 border border-ink-600/50 rounded-lg px-3 py-1.5 text-sm text-white">
                  <option value="">Más reciente</option>
                  {data.ngramAnalyses.map(ng => <option key={ng.id} value={ng.id}>{ng.name}</option>)}
                </select>
              </div>
            )}
            {data?.tfidfAnalyses && data.tfidfAnalyses.length > 1 && (
              <div>
                <label className="text-xs text-mist block mb-1">TF-IDF</label>
                <select value={filters.selectedTfidfId || ''} onChange={e => setSelectedTfidf(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-ink-850/50 border border-ink-600/50 rounded-lg px-3 py-1.5 text-sm text-white">
                  <option value="">Más reciente</option>
                  {data.tfidfAnalyses.map(tf => <option key={tf.id} value={tf.id}>{tf.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </ChartCard>
      )}

      {/* ── BoW Details ── */}
      {data?.selectedBow && (
        <ChartCard
          title="Detalles del análisis BoW"
          subtitle={data.selectedBow.name}
          accentColor="cyan"
          size="md"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2">
            {[
              { label: 'Vocabulario', value: data.selectedBow.vocabulary_size?.toLocaleString(), color: 'text-cyan-400' },
              { label: 'Documentos',  value: data.selectedBow.document_count?.toLocaleString(),  color: 'text-emerald-400' },
              { label: 'Min DF',      value: data.selectedBow.min_df || 1,                        color: 'text-purple-400' },
              { label: 'Max Features',value: data.selectedBow.max_features || '∞',               color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-lg bg-ink-850/30">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-mist">{s.label}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      </> /* end analysis section */}
    </>
  );
};
