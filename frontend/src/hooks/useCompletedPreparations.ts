/**
 * Preparaciones de datos completadas, para los selectores de las paginas de
 * creacion de analisis.
 *
 * Las cuatro paginas que arrancan un analisis (bolsa de palabras, n-gramas,
 * NER y modelado de temas) repetian exactamente la misma funcion: pedir la
 * lista al servicio, quedarse solo con las que estan en estado 'completed',
 * gestionar su propio indicador de carga y mostrar el mismo mensaje de error.
 *
 * Solo tiene sentido elegir una preparacion terminada, asi que el filtro vive
 * aqui y no en cada pagina: si manana cambia el criterio, cambia en un sitio.
 */

import { useState, useEffect, useCallback } from 'react';
import dataPreparationService from '../services/dataPreparationService';
import type { DataPreparationListItem } from '../services/dataPreparationService';
import { useToast } from '../contexts/ToastContext';

export interface CompletedPreparations {
  preparations: DataPreparationListItem[];
  isLoadingPreparations: boolean;
  /** Vuelve a pedir la lista; util tras crear una preparacion nueva. */
  reloadPreparations: () => Promise<void>;
}

export function useCompletedPreparations(): CompletedPreparations {
  const { showError } = useToast();
  const [preparations, setPreparations] = useState<DataPreparationListItem[]>([]);
  // Arranca en true porque la carga se dispara al montar: dos de las paginas
  // usan este indicador para tapar el formulario entero, y con false
  // parpadearia el formulario vacio antes de llegar los datos.
  const [isLoadingPreparations, setIsLoadingPreparations] = useState(true);

  const reloadPreparations = useCallback(async () => {
    setIsLoadingPreparations(true);
    try {
      const data = await dataPreparationService.getPreparations();
      setPreparations(data.filter((prep: DataPreparationListItem) => prep.status === 'completed'));
    } catch (error) {
      // Error de axios: el mensaje util viene en response.data.error si el
      // backend lo envio, y si no en message.
      const e = error as { response?: { data?: { error?: string } }; message?: string };
      showError('Error al cargar preparaciones: ' + (e.response?.data?.error || e.message));
    } finally {
      setIsLoadingPreparations(false);
    }
  }, [showError]);

  useEffect(() => {
    reloadPreparations();
    // Solo al montar: reloadPreparations se expone para recargar a mano.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { preparations, isLoadingPreparations, reloadPreparations };
}
