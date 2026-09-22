/**
 * Public API Client
 *
 * Axios instance for the public dashboard endpoints.
 * Does NOT attach JWT tokens - all requests are unauthenticated.
 */

import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

const publicApiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/public`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Retry on 503 (HF Spaces cold start — container wakes up in ~30-60s)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Caché en memoria de las lecturas públicas.
 *
 * El dashboard vuelve a pedir los mismos datos al cambiar de sección (y al
 * volver atrás), y el backend vive en un contenedor gratuito con la base de
 * datos remota: cada viaje cuesta cientos de milisegundos. Guardar la respuesta
 * durante un minuto hace que moverse entre secciones sea inmediato; los botones
 * de recargar de cada tarjeta siguen forzando datos frescos.
 */
const TTL_MS = 60_000;
const cache = new Map<string, { expira: number; datos: unknown }>();

function claveDe(config: { url?: string; params?: unknown }): string {
  return `${config.url ?? ''}?${JSON.stringify(config.params ?? {})}`;
}

/** Vacía la caché (tras crear o borrar análisis desde Administración). */
export function limpiarCachePublica(): void {
  cache.clear();
}

// Petición: si hay copia reciente, se responde sin ir al servidor
publicApiClient.interceptors.request.use((config) => {
  if ((config.method ?? 'get').toLowerCase() !== 'get') return config;
  const guardado = cache.get(claveDe(config));
  if (guardado && guardado.expira > Date.now()) {
    // El adaptador devuelve la copia; axios no llega a hacer la petición.
    config.adapter = async () => ({
      data: guardado.datos,
      status: 200,
      statusText: 'OK (caché)',
      headers: {},
      config: config as never,
    });
  }
  return config;
});

// Response interceptor - retry on 503, error handling otherwise
publicApiClient.interceptors.response.use(
  (response) => {
    if ((response.config.method ?? 'get').toLowerCase() === 'get' && response.statusText !== 'OK (caché)') {
      cache.set(claveDe(response.config), { expira: Date.now() + TTL_MS, datos: response.data });
    }
    return response;
  },
  async (error) => {
    const config = error.config as any;

    if (error.response?.status === 503 && (config._retryCount || 0) < MAX_RETRIES) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delay = RETRY_DELAY_MS * config._retryCount; // 2s, 4s, 6s
      console.warn(
        `Public API 503 — backend waking up. Retry ${config._retryCount}/${MAX_RETRIES} in ${delay / 1000}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return publicApiClient(config);
    }

    console.error('Public API error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

export default publicApiClient;
