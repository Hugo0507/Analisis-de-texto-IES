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
      // Unauthorized - but DON'T clear token immediately
      // (might be temporary server restart during file upload)
      // Let the retry logic in datasetsService handle it

      // Only redirect to login if this is NOT a file upload request
      const isFileUpload = error.config?.url?.includes('/datasets/') &&
                          error.config?.url?.includes('/add_files/');

      if (!isFileUpload) {
        // For non-upload requests, clear token and redirect
        localStorage.removeItem('authToken');
        // window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// Export types
export type { AxiosError, AxiosResponse } from 'axios';
