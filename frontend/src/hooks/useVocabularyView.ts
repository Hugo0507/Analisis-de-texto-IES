/**
 * Estado y derivados de la vista de vocabulario del dashboard de
 * Vectorizacion.
 *
 * Existe para hacer extraible la pestana Analisis. Esa seccion necesitaba 30
 * props sueltas, y un componente con esa firma no mejora nada: traslada el
 * acoplamiento del cuerpo a la cabecera. Agrupando el estado en objetos
 * cohesivos, la seccion pasa a recibir unos pocos.
 *
 * Aqui viven juntas las tres cosas que siempre cambian a la vez: como se
 * muestra el vocabulario (nube o tabla), el filtro por rango de IDF y los
 * terminos marcados para comparar.
 */

import { useState, useMemo } from 'react';
import type { VectorizationDashboardData } from '../services/dashboardService';

export type VocabView = 'cloud' | 'table';

export interface IdfBounds {
  min: number;
  max: number;
  step: number;
}

export interface VocabularyView {
  /** Vocabulario completo del BoW seleccionado: termino -> frecuencia. */
  fullVocabulary: Record<string, number>;
  /** Pesos IDF del TF-IDF seleccionado: termino -> idf. */
  idfValues: Record<string, number>;
  /** Limites reales del IDF, para el slider. */
  idfBounds: IdfBounds;
  /** Vocabulario filtrado por el rango de IDF activo. */
  idfFilteredVocab: Record<string, number>;
  vocabView: VocabView;
  setVocabView: React.Dispatch<React.SetStateAction<VocabView>>;
  idfRange: [number, number];
  setIdfRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  compareTerms: string[];
  setCompareTerms: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useVocabularyView(
  data: VectorizationDashboardData | null,
): VocabularyView {
  const [vocabView, setVocabView] = useState<VocabView>('cloud');
  const [idfRange, setIdfRange] = useState<[number, number]>([0, 1]);
  const [compareTerms, setCompareTerms] = useState<string[]>([]);

  const fullVocabulary = data?.selectedBow?.vocabulary || {};
  const idfValues = data?.selectedTfidf?.idf_vector?.idf_values || {};

  // TRANS-5: limites del IDF para el slider de rango
  const idfBounds = useMemo<IdfBounds>(() => {
    const vals = Object.values(idfValues);
    if (vals.length === 0) return { min: 0, max: 1, step: 0.01 };
    const mn = Math.floor(Math.min(...vals) * 100) / 100;
    const mx = Math.ceil(Math.max(...vals) * 100) / 100;
    return { min: mn, max: mx, step: Math.round(((mx - mn) / 100) * 100) / 100 || 0.01 };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idfValues]);

  // TRANS-5: vocabulario filtrado por el rango de IDF
  const idfFilteredVocab = useMemo(() => {
    if (Object.keys(idfValues).length === 0) return fullVocabulary;
    const [lo, hi] = idfRange;
    const filtered: Record<string, number> = {};
    Object.entries(fullVocabulary).forEach(([term, freq]) => {
      const idf = idfValues[term];
      if (idf === undefined || (idf >= lo && idf <= hi)) filtered[term] = freq;
    });
    return filtered;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullVocabulary, idfValues, idfRange]);

  return {
    fullVocabulary,
    idfValues,
    idfBounds,
    idfFilteredVocab,
    vocabView,
    setVocabView,
    idfRange,
    setIdfRange,
    compareTerms,
    setCompareTerms,
  };
}
