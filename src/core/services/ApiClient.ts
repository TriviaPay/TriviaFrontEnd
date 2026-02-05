/**
 * API Client Service
 * Centralized HTTP client with interceptors and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ApiResponse } from '../types';
import { NetworkError, AuthenticationError, ServerError, AppError } from '../errors';
import { logger } from './Logger';
import { getPublicKeyPinning } from './SSLPinning';
import { keychainStorage } from '../../services/keychainStorage';
import { securityInterceptor } from './SecurityInterceptor';
import { attachRetryInterceptor } from '../api/retryInterceptor';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

class ApiClientService {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor(config: ApiClientConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    // Attach retry logic
    attachRetryInterceptor(this.client);

    this.setupInterceptors();
    this.loadAuthToken();
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      config => {
        // Run security sanity checks on payload
        config = securityInterceptor(config);

        // Enforce HTTPS URLs only
        if (config.url && typeof config.url === 'string' && !config.url.startsWith('https://')) {
          const err = new Error('Insecure HTTP request blocked');
          logger.error('HTTPS enforcement error', 'API', err);
          return Promise.reject(err);
        }

        // Add auth token if available
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Add SSL pinning header if provided (placeholder implementation)
        const pinningHeader = getPublicKeyPinning();
        if (pinningHeader) {
          config.headers['X-SSL-Pinning'] = pinningHeader;
        }

        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, 'API');
        return config;
      },
      error => {
        logger.error('API Request error', 'API', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      response => {
        logger.debug(`API Response: ${response.status} ${response.config.url}`, 'API');
        return response;
      },
      error => {
        return this.handleError(error);
      }
    );
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = (error.response.data as any)?.message || error.message;

      if (status === 401) {
        logger.error('Authentication error', 'API', error);
        throw new AuthenticationError(message);
      } else if (status >= 500) {
        logger.error('Server error', 'API', error);
        throw new ServerError(message);
      } else {
        logger.error('API error', 'API', error);
        throw new AppError(message);
      }
    } else if (error.request) {
      // Request made but no response
      logger.error('Network error', 'API', error);
      throw new NetworkError('Network error. Please check your connection.');
    } else {
      // Something else happened
      logger.error('Unknown API error', 'API', error);
      throw new AppError(error.message);
    }
  }

  /**
   * Load auth token from storage
   */
  private async loadAuthToken() {
    try {
      const token = await keychainStorage.getAccessToken();
      if (token) {
        this.authToken = token;
      }
    } catch (error) {
      logger.error('Failed to load auth token from Keychain', 'API', error);
    }
  }

  /**
   * Set auth token
   */
  async setAuthToken(token: string | null) {
    this.authToken = token;
    if (token) {
      await keychainStorage.storeAccessToken(token);
    } else {
      await keychainStorage.removeAccessToken();
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }
}

// Will be initialized in config
export let apiClient: ApiClientService;

export const initializeApiClient = (config: ApiClientConfig) => {
  apiClient = new ApiClientService(config);
  return apiClient;
};
