/**
 * Obtención de datos del dashboard de Vectorización.
 *
 * Extraído de VectorizacionDashboard, que mezclaba fetching, transformación y
 * render en un único componente de ~2.500 líneas. Mantener los hooks de datos
 * aquí evita que queden a cientos de líneas de los `return` tempranos del
 * componente, que es de donde salió el fallo de react-hooks/rules-of-hooks
 * que tumbó tres despliegues (commit 11bec48).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import dashboardService from '../services/dashboardService';
import type { VectorizationDashboardData } from '../services/dashboardService';
import { useFilter } from '../contexts/FilterContext';

export interface UseVectorizationDataResult {
  data: VectorizationDashboardData | null;
  isLoading: boolean;
  error: string | null;
  /** Vuelve a cargar con los filtros vigentes. Lo usan los botones "Actualizar". */
  refetch: () => void;
}

/**
 * Carga los datos de vectorización del dataset activo.
 *
 * Además de traerlos, preselecciona el primer análisis completado de cada
 * tipo cuando no hay ninguno elegido, y comunica los límites reales del IDF
 * a través de `onIdfBounds` para que el componente inicialice su slider.
 *
 * El callback se guarda en una ref a propósito: así no entra en las
 * dependencias y una identidad nueva en cada render no dispara una recarga.
 */
export function useVectorizationData(
  onIdfBounds?: (range: [number, number]) => void,
): UseVectorizationDataResult {
  const { filters, setSelectedBow, setSelectedNgram, setSelectedTfidf } = useFilter();

  const [data, setData] = useState<VectorizationDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onIdfBoundsRef = useRef(onIdfBounds);
  onIdfBoundsRef.current = onIdfBounds;

  const { selectedDatasetId, selectedBowId, selectedNgramId, selectedTfidfId } = filters;

  const fetchData = useCallback(async () => {
    if (!selectedDatasetId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await dashboardService.getVectorizationData(
        selectedDatasetId,
        selectedBowId,
        selectedNgramId,
        selectedTfidfId,
      );
      setData(result);

      // Preselecciona el primer análisis completado si no hay uno elegido
      if (!selectedBowId) {
        const first = result.bowAnalyses.find(a => a.status === 'completed');
        if (first) setSelectedBow(first.id);
      }
      if (!selectedNgramId) {
        const first = result.ngramAnalyses.find(a => a.status === 'completed');
        if (first) setSelectedNgram(first.id);
      }
      if (!selectedTfidfId) {
        const first = result.tfidfAnalyses.find(a => a.status === 'completed');
        if (first) setSelectedTfidf(first.id);
      }

      // Límites reales del IDF para inicializar el slider del componente
      const idfVals = Object.values(result.selectedTfidf?.idf_vector?.idf_values || {});
      if (idfVals.length > 0) {
        const mn = Math.floor(Math.min(...idfVals) * 100) / 100;
        const mx = Math.ceil(Math.max(...idfVals) * 100) / 100;
        onIdfBoundsRef.current?.([mn, mx]);
      }
    } catch (err) {
      setError('Error al cargar los datos de vectorización');
      console.error('Vectorization dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  // Las mismas dependencias que tenía el efecto original en el componente.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatasetId, selectedBowId, selectedNgramId, selectedTfidfId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
