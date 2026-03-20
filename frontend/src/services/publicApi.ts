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

// Response interceptor - retry on 503, error handling otherwise
publicApiClient.interceptors.response.use(
  (response) => response,
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
