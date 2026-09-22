/**
 * Obtención de datos del dashboard de Clasificación (LSTM).
 *
 * Mismo patrón que `useModelingData`: carga la lista de análisis del dataset
 * y el detalle del seleccionado (o el más reciente si no hay ninguno elegido).
 */

import { useState, useEffect, useCallback } from 'react';
import dashboardService from '../services/dashboardService';
import type { ClassificationDashboardData } from '../services/dashboardService';
import { useFilter } from '../contexts/FilterContext';

export interface UseClassificationDataResult {
  data: ClassificationDashboardData | null;
  isLoading: boolean;
  error: string | null;
  /** Recarga los datos; con `resetSelections` vuelve a elegir el más reciente. */
  refetch: (opts?: { resetSelections?: boolean }) => void;
}

export function useClassificationData(): UseClassificationDataResult {
  const { filters, setSelectedLstm } = useFilter();
  const { selectedDatasetId, selectedLstmId } = filters;

  const [data, setData] = useState<ClassificationDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (opts?: { resetSelections?: boolean }) => {
    const reset = opts?.resetSelections === true;
    const lstmId = reset ? undefined : selectedLstmId;

    if (!selectedDatasetId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await dashboardService.getClassificationData(selectedDatasetId, lstmId);
      setData(result);

      // Preselecciona el análisis mostrado si no había uno elegido
      if (!lstmId && result.selected) {
        setSelectedLstm(result.selected.id);
      }
    } catch (err) {
      setError('Error al cargar las clasificaciones LSTM');
      console.error('Classification dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  // Mismas dependencias que useModelingData
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatasetId, selectedLstmId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
