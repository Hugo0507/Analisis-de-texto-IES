/**
 * Configuraciones de n-gramas del dashboard de Vectorizacion.
 *
 * Un analisis de n-gramas puede tener varias configuraciones (unigramas,
 * bigramas, trigramas...). Este hook las normaliza, recuerda cual esta activa
 * y expone sus terminos ya listos para las barras.
 */

import { useState, useMemo } from 'react';
import type { VectorizationDashboardData } from '../services/dashboardService';
import { getNgramLabel } from '../components/organisms/vectorizacion';

export interface NgramConfig {
  key: string;
  label: string;
  terms: Array<{ id: string; label: string; value: number }>;
  vocabSize: number;
}

export interface NgramConfigs {
  ngramConfigs: NgramConfig[];
  activeNgramConfig: string | null;
  setActiveNgramConfig: React.Dispatch<React.SetStateAction<string | null>>;
  /** La configuracion activa, o la primera si no hay ninguna elegida. */
  activeConfig: NgramConfig | undefined;
  /** Terminos de la configuracion activa, con el corpus como respaldo. */
  activeNgramTerms: Array<{ id: string; label: string; value: number }>;
}

export function useNgramConfigs(
  data: VectorizationDashboardData | null,
): NgramConfigs {
  const [activeNgramConfig, setActiveNgramConfig] = useState<string | null>(null);

  const ngramConfigs = useMemo<NgramConfig[]>(() => {
    if (!data?.selectedNgram?.results) return [];
    return Object.entries(data.selectedNgram.results).map(([key, result]) => ({
      key,
      label: getNgramLabel(result.ngram_range || [1, 1]),
      terms: (result.top_terms || []).map(t => ({ id: t.term, label: t.term, value: t.score })),
      vocabSize: result.vocabulary_size,
    }));
  }, [data?.selectedNgram]);

  const activeConfig = ngramConfigs.find(c => c.key === activeNgramConfig) || ngramConfigs[0];
  const activeNgramTerms = activeConfig?.terms || data?.ngramBarData || [];

  return {
    ngramConfigs,
    activeNgramConfig,
    setActiveNgramConfig,
    activeConfig,
    activeNgramTerms,
  };
}
