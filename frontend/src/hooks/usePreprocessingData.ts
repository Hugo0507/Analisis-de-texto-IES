/**
 * Obtención de datos del dashboard de Preprocesamiento.
 *
 * Saca del componente el estado data/isLoading/error y su efecto de carga,
 * por la misma razón que en useVectorizationData: cuantos menos hooks queden
 * en un componente de más de mil líneas, menor es el riesgo de romper su
 * orden respecto a los `return` tempranos.
 */

import { useState, useEffect, useCallback } from 'react';
import dashboardService from '../services/dashboardService';
import type { PreprocessingDashboardData } from '../services/dashboardService';
import { useFilter } from '../contexts/FilterContext';

export interface UsePreprocessingDataResult {
  data: PreprocessingDashboardData | null;
  isLoading: boolean;
  error: string | null;
  /** Recarga con el dataset vigente. */
  refetch: () => void;
}

export function usePreprocessingData(): UsePreprocessingDataResult {
  const { filters } = useFilter();
  const { selectedDatasetId } = filters;

  const [data, setData] = useState<PreprocessingDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedDatasetId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await dashboardService.getPreprocessingData(selectedDatasetId);
      setData(result);
    } catch (err) {
      setError('Error al cargar los datos del dataset');
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDatasetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
