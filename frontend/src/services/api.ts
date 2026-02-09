/**
 * API Client Configuration
 *
 * Configures axios instance with base URL and interceptors.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Base URL from environment or default
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if exists
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {

    // Handle specific error codes
    if (error.response?.status === 401) {
      // Only handle 401 token clearing on admin routes
      const isAdminRoute = window.location.pathname.startsWith('/admin');

      if (isAdminRoute) {
        // Don't clear token during file uploads (retry logic handles it)
        const isFileUpload = error.config?.url?.includes('/datasets/') &&
                            error.config?.url?.includes('/add_files/');

        if (!isFileUpload) {
          localStorage.removeItem('authToken');
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// Export types
export type { AxiosError, AxiosResponse } from 'axios';
