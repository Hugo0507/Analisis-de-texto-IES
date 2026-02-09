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

// Response interceptor - error handling only, no auth logic
publicApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Public API error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

export default publicApiClient;
