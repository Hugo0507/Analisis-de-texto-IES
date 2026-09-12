/**
 * Seleccion de terminos del dashboard de Vectorizacion.
 *
 * Todas las visualizaciones -nube, tabla, barras de TF-IDF y n-gramas,
 * scatter- seleccionan el mismo termino y abren el mismo panel de detalle.
 * Tener aqui el estado y los cuatro manejadores evita pasarlos sueltos a cada
 * seccion y mantiene en un solo sitio la regla de que volver a pulsar el
 * termino activo lo deselecciona.
 */

import { useState, useCallback } from 'react';
import type { VectorizationDashboardData } from '../services/dashboardService';
import type { SelectedTerm } from '../components/organisms/vectorizacion';

export interface TermSelection {
  selectedTerm: SelectedTerm | null;
  setSelectedTerm: React.Dispatch<React.SetStateAction<SelectedTerm | null>>;
  /** Compone un SelectedTerm cruzando BoW, TF-IDF, IDF y n-gramas. */
  buildTerm: (
    text: string,
    source: SelectedTerm['source'],
    bowScore?: number,
    bowRank?: number,
  ) => SelectedTerm;
  handleWordClick: (word: { text: string; value: number }) => void;
  handleVocabTableClick: (termText: string, freq: number) => void;
  handleBarClick: (
    source: 'tfidf' | 'ngram',
  ) => (item: { id: string; label: string; value: number }) => void;
  handleScatterClick: (termText: string) => void;
}

export function useTermSelection(
  data: VectorizationDashboardData | null,
): TermSelection {
  const [selectedTerm, setSelectedTerm] = useState<SelectedTerm | null>(null);

  const buildTerm = useCallback((
    text: string,
    source: SelectedTerm['source'],
    bowScore?: number,
    bowRank?: number,
  ): SelectedTerm => {
    const tfidfEntry = data?.tfidfTopTerms?.find(t => t.term === text);
    const idfScore = data?.selectedTfidf?.idf_vector?.idf_values?.[text] ?? null;
    const relatedNgrams = (data?.ngramBarData || [])
      .filter(ng => ng.label.toLowerCase().includes(text.toLowerCase()));
    return {
      text,
      bowScore: bowScore ?? null,
      bowRank: bowRank ?? null,
      tfidfScore: tfidfEntry?.score ?? null,
      tfidfRank: tfidfEntry?.rank ?? null,
      idfScore,
      relatedNgrams,
      source,
    };
  }, [data]);

  const handleWordClick = useCallback((word: { text: string; value: number }) => {
    const bowEntry = data?.selectedBow?.top_terms?.find(t => t.term === word.text);
    const term = buildTerm(word.text, 'bow', word.value, bowEntry?.rank);
    setSelectedTerm(prev => prev?.text === word.text ? null : term);
  }, [data, buildTerm]);

  const handleVocabTableClick = useCallback((termText: string, freq: number) => {
    const bowEntry = data?.selectedBow?.top_terms?.find(t => t.term === termText);
    const term = buildTerm(termText, 'bow', freq, bowEntry?.rank);
    setSelectedTerm(prev => prev?.text === termText ? null : term);
  }, [data, buildTerm]);

  const handleBarClick = useCallback((source: 'tfidf' | 'ngram') =>
    (item: { id: string; label: string; value: number }) => {
      if (source === 'tfidf') {
        const bowEntry = data?.selectedBow?.top_terms?.find(t => t.term === item.id);
        const term = buildTerm(item.id, 'tfidf', bowEntry?.score, bowEntry?.rank);
        setSelectedTerm(prev => prev?.text === item.id ? null : { ...term, tfidfScore: item.value });
      } else {
        const term = buildTerm(item.label, 'ngram');
        setSelectedTerm(prev => prev?.text === item.label ? null : term);
      }
    }, [data, buildTerm]);

  const handleScatterClick = useCallback((termText: string) => {
    const bowEntry = data?.selectedBow?.top_terms?.find(t => t.term === termText);
    const tfidfEntry = data?.tfidfTopTerms?.find(t => t.term === termText);
    const term = buildTerm(termText, 'tfidf', bowEntry?.score, bowEntry?.rank);
    if (tfidfEntry) term.tfidfScore = tfidfEntry.score;
    setSelectedTerm(prev => prev?.text === termText ? null : term);
  }, [data, buildTerm]);

  return {
    selectedTerm,
    setSelectedTerm,
    buildTerm,
    handleWordClick,
    handleVocabTableClick,
    handleBarClick,
    handleScatterClick,
  };
}
