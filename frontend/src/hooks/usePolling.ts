/**
 * Sondeo periodico mientras una condicion se mantiene.
 *
 * Las diez paginas de detalle de analisis (BoW, TF-IDF, n-gramas, temas,
 * BERTopic, LSTM, NER, datasets y preparacion de datos) repetian el mismo
 * bloque: un useRef con el id del intervalo, un useEffect que lo arranca si el
 * estado es 'processing', lo para si no, y una funcion de limpieza que lo
 * vuelve a parar al desmontar.
 *
 * Tenerlo en un solo sitio evita la variante que siempre acaba apareciendo en
 * una copia: olvidar el clearInterval del desmontaje y dejar el temporizador
 * disparando peticiones contra una pagina que ya no existe.
 */

import { useEffect, useRef } from 'react';

export interface UsePollingOptions {
  /** Milisegundos entre llamadas. Por defecto 2000, el valor que ya usaban. */
  intervalMs?: number;
  /** Si es true, ejecuta `callback` una vez de inmediato al activarse. */
  immediate?: boolean;
}

/**
 * Ejecuta `callback` cada `intervalMs` mientras `isActive` sea true.
 *
 * El intervalo se limpia al desactivarse y al desmontar el componente. La
 * referencia a `callback` se mantiene al dia sin reiniciar el temporizador,
 * asi que no hace falta memorizarla con useCallback en quien llama.
 */
export function usePolling(
  callback: () => void,
  isActive: boolean,
  { intervalMs = 2000, immediate = false }: UsePollingOptions = {},
): void {
  const callbackRef = useRef(callback);

  // Guardamos siempre la ultima version sin reiniciar el intervalo: si
  // dependieramos de `callback` en el efecto de abajo, cada render crearia un
  // temporizador nuevo.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!isActive) return;

    if (immediate) callbackRef.current();

    const id = setInterval(() => callbackRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [isActive, intervalMs, immediate]);
}
