/**
 * Obtención de datos del dashboard de Modelado.
 *
 * Reúne la carga de los análisis (NER, modelado de temas y BERTopic) y la
 * comparación de coherencia, que el componente pedía en el mismo efecto.
 */

import { useState, useEffect, useCallback } from 'react';
import dashboardService from '../services/dashboardService';
import type { ModelingDashboardData } from '../services/dashboardService';
import publicTopicModelingService from '../services/publicTopicModelingService';
import type { CoherenceComparisonItem } from '../services/publicTopicModelingService';
import { useFilter } from '../contexts/FilterContext';

export interface UseModelingDataResult {
  data: ModelingDashboardData | null;
  coherenceComparison: CoherenceComparisonItem[];
  isLoading: boolean;
  error: string | null;
  /**
   * Recarga los datos.
   *
   * Por defecto respeta los analisis ya seleccionados. Con
   * `{ resetSelections: true }` los pide sin especificar, que es como se
   * comportaban los botones "Actualizar" de las secciones de temas y
   * BERTopic: volvian a preseleccionar el primer analisis completado.
   */
  refetch: (opts?: { resetSelections?: boolean }) => void;
}

export function useModelingData(): UseModelingDataResult {
  const { filters, setSelectedNer, setSelectedTopicModel, setSelectedBertopic } = useFilter();
  const { selectedDatasetId, selectedNerId, selectedTopicModelId, selectedBertopicId } = filters;

  const [data, setData] = useState<ModelingDashboardData | null>(null);
  const [coherenceComparison, setCoherenceComparison] = useState<CoherenceComparisonItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (opts?: { resetSelections?: boolean }) => {
    const reset = opts?.resetSelections === true;
    const nerId = reset ? undefined : selectedNerId;
    const topicId = reset ? undefined : selectedTopicModelId;
    const bertopicId = reset ? undefined : selectedBertopicId;

    if (!selectedDatasetId) {
      setData(null);
      setCoherenceComparison([]);
      setIsLoading(false);
      return;
    }

    publicTopicModelingService.getCoherenceComparison(selectedDatasetId)
      .then(setCoherenceComparison)
      .catch(() => setCoherenceComparison([]));

    try {
      setIsLoading(true);
      setError(null);

      const result = await dashboardService.getModelingData(
        selectedDatasetId,
        nerId,
        topicId,
        bertopicId,
      );
      setData(result);

      // Preselecciona el primer análisis completado si no hay uno elegido
      if (!nerId) {
        const first = result.nerAnalyses.find(a => a.status === 'completed');
        if (first) setSelectedNer(first.id);
      }
      if (!topicId) {
        const first = result.topicModelingAnalyses.find(a => a.status === 'completed');
        if (first) setSelectedTopicModel(first.id);
      }
      if (!bertopicId) {
        const first = result.bertopicAnalyses.find(a => a.status === 'completed');
        if (first) setSelectedBertopic(first.id);
      }
    } catch (err) {
      setError('Error al cargar los datos de modelado');
      console.error('Modeling dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  // Las mismas dependencias que tenía el efecto original en el componente.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatasetId, selectedNerId, selectedTopicModelId, selectedBertopicId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, coherenceComparison, isLoading, error, refetch: fetchData };
}
