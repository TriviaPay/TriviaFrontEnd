/**
 * Professional API Service
 * Handles all backend communication in a professional manner
 * Single source of truth for all API requests
 * Optimized to prevent multiple API calls and loops
 */

import { authService } from './authService';
import { API_CONFIG } from '../config/api';
import { logger } from '../lib/utils/logger';

// Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  picture?: string;
  country?: string;
  date_of_birth?: string;
}

export interface Winner {
  id: string;
  username: string;
  amount: number;
  date: string;
  country: string;
}

export interface DrawInfo {
  next_draw_time: string;
  prize_pool: number;
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  time_limit: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  country: string;
}

/**
 * Professional API Service
 * Handles all API communication in a professional manner
 */
class ApiService {
  private static instance: ApiService;
  private requestCache: Map<string, { data: any; timestamp: number; duration?: number }> =
    new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache (default)
  private readonly DRAW_CACHE_DURATION = 60000; // 60 seconds cache for draw data
  private activeRequests: Map<string, Promise<any>> = new Map();

  private constructor() {}

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * Check if request is cached and still valid
   */
  private isCached(endpoint: string): boolean {
    const cached = this.requestCache.get(endpoint);
    if (!cached) return false;

    const now = Date.now();
    const cacheDuration = cached.duration || this.CACHE_DURATION;
    return now - cached.timestamp < cacheDuration;
  }

  /**
   * Get cached data if available
   */
  private getCachedData(endpoint: string): any {
    const cached = this.requestCache.get(endpoint);
    return cached ? cached.data : null;
  }

  /**
   * Cache response data
   */
  private cacheResponse(endpoint: string, data: any): void {
    this.requestCache.set(endpoint, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if request is already in progress
   */
  private isRequestInProgress(endpoint: string): boolean {
    return this.activeRequests.has(endpoint);
  }

  /**
   * Get active request promise
   */
  private getActiveRequest(endpoint: string): Promise<any> | null {
    return this.activeRequests.get(endpoint) || null;
  }

  /**
   * Set active request
   */
  private setActiveRequest(endpoint: string, promise: Promise<any>): void {
    this.activeRequests.set(endpoint, promise);
  }

  /**
   * Clear active request
   */
  private clearActiveRequest(endpoint: string): void {
    this.activeRequests.delete(endpoint);
  }

  /**
   * Make authenticated request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await authService.ensureValidToken();
      if (!token) {
        return {
          success: false,
          error: 'Not authenticated',
          status: 401,
        };
      }

      // Skip authentication for mock tokens (development mode)
      const isMockToken = token.startsWith('mock_');
      const shouldSkipAuth = isMockToken; // Skip auth for mock tokens

      // Log API requests for debugging (only in dev mode)
      logger.debug(`Making API request: ${options.method || 'GET'} ${endpoint}`, 'API');

      // Prepare headers with authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };

      // Only add Authorization header for real tokens
      if (!shouldSkipAuth) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Don't send body for POST requests if body is explicitly undefined
      const fetchOptions: RequestInit = {
        ...options,
        headers,
      };

      // Remove body if it's undefined (for POST requests with no body)
      if (options.body === undefined) {
        delete fetchOptions.body;
      }

      let response: Response;
      try {
        response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, fetchOptions);
      } catch (networkError) {
        // Handle network errors (offline, DNS failure, etc.)
        const errorMessage =
          networkError instanceof Error ? networkError.message : 'Network request failed';
        logger.error(`Network error: ${errorMessage}`, 'API');

        // Check if it's a network connectivity issue
        if (
          errorMessage.includes('Network request failed') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('Unable to resolve host')
        ) {
          return {
            success: false,
            error: 'No internet connection. Please check your network and try again.',
            status: 0, // 0 indicates network error
          };
        }

        throw networkError;
      }

      logger.debug(`API Response: ${response.status} ${endpoint}`, 'API');

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = '';
        let errorData: any = {};
        try {
          errorData = await response.json();
          errorDetails =
            errorData.detail || errorData.message || errorData.error || JSON.stringify(errorData);
          logger.error(`Backend error: ${errorDetails}`, 'API', errorData);
        } catch (parseError) {
          errorDetails = response.statusText;
        }

        if (response.status === 401) {
          // CRITICAL: Check if this is already a retry to prevent infinite loop
          const isRetry = (options.headers as any)?.__isRetry;

          if (isRetry) {
            // This is already a retry - refresh failed, force logout
            logger.error('Second 401 after token refresh - forcing logout', 'AUTH_TOKEN');
            await authService.logout();
            return {
              success: false,
              error: 'Session expired. Please login again.',
              status: 401,
            };
          }

          logger.warn('401 error, attempting token refresh (ONE attempt)', 'AUTH_TOKEN');

          try {
            const newToken = await authService.refreshAccessToken(true);

            if (newToken) {
              logger.debug(
                'Token refreshed successfully, retrying request (FINAL attempt)',
                'AUTH_TOKEN'
              );
              // Retry with new token - mark as retry to prevent loop
              const retryHeaders = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${newToken}`,
                ...options.headers,
                __isRetry: 'true', // Mark as retry attempt
              };

              const retryResponse = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
                ...options,
                headers: retryHeaders,
              });

              if (!retryResponse.ok) {
                logger.warn(
                  `Retry failed after token refresh, status: ${retryResponse.status}`,
                  'AUTH_TOKEN'
                );
                // If still 401, the refresh token is invalid - FORCE LOGOUT
                if (retryResponse.status === 401) {
                  logger.error(
                    'Token refresh failed - refresh token invalid, forcing logout',
                    'AUTH_TOKEN'
                  );
                  await authService.logout();
                  return {
                    success: false,
                    error: 'Session expired. Please login again.',
                    status: 401,
                  };
                }
                return {
                  success: false,
                  error: 'Authentication failed after refresh',
                  status: retryResponse.status,
                };
              }

              const data = await retryResponse.json();
              return { success: true, data, status: retryResponse.status };
            } else {
              // Refresh returned null - refresh token invalid, FORCE LOGOUT
              logger.error('Token refresh returned null - forcing logout', 'AUTH_TOKEN');
              await authService.logout();
              return {
                success: false,
                error: 'Session expired. Please login again.',
                status: 401,
              };
            }
          } catch (refreshError) {
            // Refresh error - FORCE LOGOUT to prevent infinite loop
            logger.error('Token refresh error - forcing logout', 'AUTH_TOKEN', refreshError);
            await authService.logout();
            return {
              success: false,
              error: 'Session expired. Please login again.',
              status: 401,
            };
          }
        }

        // Handle 404 gracefully - don't throw for optional endpoints
        if (response.status === 404) {
          // Return success with empty data for 404 - professional apps handle this gracefully
          logger.debug(`Endpoint returned 404 (${endpoint}) - returning empty data`, 'API');
          return { success: true, data: null, status: 404 };
        }

        // Log full error details for debugging
        logger.error(
          `HTTP ${response.status} error for ${endpoint}: ${errorDetails}`,
          'API',
          errorData
        );

        throw new Error(`HTTP ${response.status}: ${errorDetails}`);
      }

      const data = await response.json();

      return { success: true, data, status: response.status };
    } catch (error) {
      // Handle network errors gracefully
      const errorMessage = error instanceof Error ? error.message : 'Request failed';

      // Check for network connectivity issues
      if (
        errorMessage.includes('Network request failed') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('Unable to resolve host') ||
        errorMessage.includes('AbortError')
      ) {
        logger.error(`Network error: ${errorMessage}`, 'API');
        return {
          success: false,
          error: 'No internet connection. Please check your network and try again.',
          status: 0, // 0 indicates network error
        };
      }

      logger.error('API request error', 'API', error);
      // Preserve HTTP status if available in error message
      let status = 500;

      // Extract status from error message if present (e.g., "HTTP 500: ...")
      const statusMatch = errorMessage.match(/HTTP (\d+)/);
      if (statusMatch) {
        status = parseInt(statusMatch[1], 10);
      }

      return {
        success: false,
        error: errorMessage,
        status,
      };
    }
  }

  /**
   * Authentication APIs
   */

  /**
   * Check if Descope user exists
   */
  async checkDescopeUserExists(email: string): Promise<ApiResponse<{ exists: boolean }>> {
    return this.makeRequest<{ exists: boolean }>(API_CONFIG.ENDPOINTS.AUTH.CHECK_DESCOPE_USER, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Check email availability (public API - no auth required)
   * Optimized with instant response and caching
   */
  async checkEmailAvailability(email: string): Promise<ApiResponse<{ available: boolean }>> {
    logger.debug(`Checking email availability: ${email}`, 'API');

    try {
      // Check cache first for instant response
      if (this.isCached(`/email-available?email=${email}`)) {
        const cachedData = this.getCachedData(`/email-available?email=${email}`);
        logger.debug('Email availability from cache', 'API');
        return {
          success: true,
          data: cachedData,
        };
      }

      const fullUrl = `${API_CONFIG.BASE_URL}/email-available?email=${encodeURIComponent(email)}`;

      // Use AbortController for timeout (increased to 10 seconds for better reliability)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        logger.warn('Email check request timeout after 10 seconds', 'API');
        controller.abort();
      }, 10000); // 10 second timeout for better reliability

      let response: Response;
      try {
        response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        // If it's an abort error, return optimistic result instead of throwing
        if (error instanceof Error && error.name === 'AbortError') {
          logger.warn('Email check timed out, returning optimistic result', 'API');
          // Return optimistic result (available = true) to allow user to continue
          return {
            success: true,
            data: { available: true },
          };
        }
        throw error;
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Email check response not ok, status: ${response.status}`, 'API', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the response for instant future checks
      this.cacheResponse(`/email-available?email=${email}`, data);

      return {
        success: true,
        data,
      };
    } catch (error) {
      logger.error('Email availability check failed', 'API', error);

      // Return optimistic response for better UX
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('Email check timed out, returning optimistic response', 'API');
        return {
          success: true,
          data: { available: true }, // Assume available for better UX
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email availability check failed',
      };
    }
  }

  /**
   * Check username availability (requires auth token)
   * Optimized with instant response and caching
   */
  async checkUsernameAvailability(
    username: string,
    accessToken?: string
  ): Promise<ApiResponse<{ available: boolean }>> {
    try {
      // Check cache first for instant response
      if (this.isCached(`/username-available?username=${username}`)) {
        const cachedData = this.getCachedData(`/username-available?username=${username}`);
        return {
          success: true,
          data: cachedData,
        };
      }

      // Prepare headers
      const headers: HeadersInit = {
        accept: 'application/json',
        'Content-Type': 'application/json',
      };

      // Add Authorization header if token is provided
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      // Use AbortController for fast timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(
        `${API_CONFIG.BASE_URL}/username-available?username=${encodeURIComponent(username)}`,
        {
          method: 'GET',
          headers,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the response for instant future checks
      this.cacheResponse(`/username-available?username=${username}`, data);

      return {
        success: true,
        data,
      };
    } catch (error) {
      logger.error('Username availability check failed', 'API', error);

      // Return optimistic response for better UX
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('Username check timed out, returning optimistic response', 'API');
        return {
          success: true,
          data: { available: false }, // Assume available for better UX
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Username availability check failed',
      };
    }
  }

  /**
   * Bind password
   */
  async bindPassword(userData: {
    email: string;
    password: string;
    username: string;
    country: string;
    dateOfBirth: string;
    referral_code?: string | null;
  }): Promise<ApiResponse<{ success: boolean }>> {
    logger.debug('API Service bindPassword called', 'API');

    // Try different field name format that backend might expect
    const requestData: any = {
      email: userData.email,
      password: userData.password,
      username: userData.username,
      country: userData.country,
      date_of_birth: userData.dateOfBirth, // Backend might expect snake_case
    };

    // Add referral_code only if provided
    if (userData.referral_code) {
      requestData.referral_code = userData.referral_code;
    }

    const result = await this.makeRequest<{ success: boolean }>(
      API_CONFIG.ENDPOINTS.BIND_PASSWORD,
      {
        method: 'POST',
        body: JSON.stringify(requestData),
      }
    );

    return result;
  }

  /**
   * Validate referral code (no authentication required)
   */
  async validateReferralCode(
    referralCode: string
  ): Promise<ApiResponse<{ valid: boolean; status: string; message: string; code?: string }>> {
    logger.debug('API Service validateReferralCode called', 'API');

    try {
      // Prepare headers without authentication
      const headers: HeadersInit = {
        accept: 'application/json',
        'Content-Type': 'application/json',
      };

      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VALIDATE_REFERRAL}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ referral_code: referralCode }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle response structure - extract valid, status, message, code
      const result = {
        valid: data.valid !== undefined ? data.valid : data.status === 'success',
        status: data.status || (data.valid ? 'success' : 'error'),
        message: data.message || '',
        code: data.code,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error('Failed to validate referral code', 'API', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate referral code',
      };
    }
  }

  /**
   * Get countries list (no authentication required)
   */
  async getCountries(): Promise<ApiResponse<{ countries: string[]; country_codes: string[] }>> {
    logger.debug('API Service getCountries called', 'API');

    try {
      // Check cache first
      if (this.isCached(API_CONFIG.ENDPOINTS.COUNTRIES)) {
        const cachedData = this.getCachedData(API_CONFIG.ENDPOINTS.COUNTRIES);
        // Ensure cached data has the correct structure
        if (cachedData && cachedData.countries) {
          return { success: true, data: cachedData };
        }
        // If cache structure is wrong, clear it and fetch fresh
        this.requestCache.delete(API_CONFIG.ENDPOINTS.COUNTRIES);
      }

      // Prepare headers - try to include auth token if available, but don't require it
      const headers: HeadersInit = {
        accept: 'application/json',
        'Content-Type': 'application/json',
      };

      // Try to get auth token if available (optional)
      try {
        const token = await authService.ensureValidToken();
        if (token && !token.startsWith('mock_')) {
          headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        // No token available, continue without auth
      }

      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COUNTRIES}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Countries API error response', 'API', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      logger.debug('Countries API response received', 'API', {
        hasStatus: !!responseData.status,
        hasCountries: !!responseData.countries,
        countriesCount: responseData.countries?.length,
      });

      // Extract countries from response - API returns { status: "success", countries: [...], country_codes: [] }
      const countriesList = responseData.countries || [];
      const countryCodes = responseData.country_codes || [];

      if (!Array.isArray(countriesList) || countriesList.length === 0) {
        logger.error('Invalid countries data received', 'API', { responseData });
        throw new Error('Invalid countries data received from API');
      }

      // Cache the result for 5 minutes (countries don't change often)
      const cacheData = { countries: countriesList, country_codes: countryCodes };

      this.requestCache.set(API_CONFIG.ENDPOINTS.COUNTRIES, {
        data: cacheData,
        timestamp: Date.now(),
        duration: 300000, // 5 minutes in milliseconds
      });

      logger.debug('Countries data processed successfully', 'API', {
        countriesCount: countriesList.length,
      });

      return {
        success: true,
        data: cacheData,
      };
    } catch (error) {
      logger.error('Failed to fetch countries', 'API', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch countries',
      };
    }
  }

  /**
   * User APIs
   */

  /**
   * Home/Draw APIs
   */

  /**
   * Get next draw information
   * Uses caching and request deduplication to prevent multiple simultaneous calls
   */
  async getNextDraw(): Promise<ApiResponse<DrawInfo>> {
    const endpoint = API_CONFIG.ENDPOINTS.DRAW.NEXT;

    // Check cache first (longer cache for draw data - 60 seconds)
    if (this.isCached(endpoint)) {
      const cachedData = this.getCachedData(endpoint);
      if (cachedData) {
        logger.debug('Using cached draw data', 'API');
        return cachedData;
      }
    }

    // Check if there's already an active request for this endpoint
    if (this.activeRequests.has(endpoint)) {
      logger.debug('Draw request already in progress, waiting for existing request', 'API');
      return this.activeRequests.get(endpoint)!;
    }

    // Create new request and store it
    const requestPromise = this.makeRequest<DrawInfo>(endpoint)
      .then(response => {
        // Cache successful responses for 60 seconds (draw data doesn't change frequently)
        if (response.success && response.data) {
          this.requestCache.set(endpoint, {
            data: response,
            timestamp: Date.now(),
            duration: this.DRAW_CACHE_DURATION,
          });
        }
        // Remove from active requests
        this.activeRequests.delete(endpoint);
        return response;
      })
      .catch(error => {
        // Remove from active requests on error
        this.activeRequests.delete(endpoint);
        throw error;
      });

    this.activeRequests.set(endpoint, requestPromise);
    return requestPromise;
  }

  /**
   * Get free mode leaderboard
   * @param drawDate Date string in YYYY-MM-DD format
   */
  async getFreeModeLeaderboard(
    drawDate: string
  ): Promise<ApiResponse<{ draw_date: string; leaderboard: any[] }>> {
    // Use full URL for the new API endpoint
    const fullUrl = `https://trivia-back-end.vercel.app/trivia/free-mode/leaderboard?draw_date=${encodeURIComponent(drawDate)}`;

    try {
      const token = await authService.ensureValidToken();
      if (!token) {
        return {
          success: false,
          error: 'Not authenticated',
          status: 401,
        };
      }

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || errorData.message || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      const data = await response.json();
      return { success: true, data, status: response.status };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Request failed';
      logger.error(`Free mode leaderboard error: ${errorMessage}`, 'API');
      return {
        success: false,
        error: errorMessage,
        status: 0,
      };
    }
  }

  /**
   * Get bronze mode leaderboard
   * @param drawDate Date string in YYYY-MM-DD format
   */
  async getBronzeModeLeaderboard(
    drawDate: string
  ): Promise<ApiResponse<{ draw_date: string; leaderboard: any[] }>> {
    const fullUrl = `https://trivia-back-end.vercel.app/trivia/bronze-mode/leaderboard?draw_date=${encodeURIComponent(drawDate)}`;

    try {
      const token = await authService.ensureValidToken();
      if (!token) {
        return {
          success: false,
          error: 'Not authenticated',
          status: 401,
        };
      }

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || errorData.message || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      const data = await response.json();
      return { success: true, data, status: response.status };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Request failed';
      logger.error(`Bronze mode leaderboard error: ${errorMessage}`, 'API');
      return {
        success: false,
        error: errorMessage,
        status: 0,
      };
    }
  }

  /**
   * Get silver mode leaderboard
   * @param drawDate Date string in YYYY-MM-DD format
   */
  async getSilverModeLeaderboard(
    drawDate: string
  ): Promise<ApiResponse<{ draw_date: string; leaderboard: any[] }>> {
    const fullUrl = `https://trivia-back-end.vercel.app/trivia/silver-mode/leaderboard?draw_date=${encodeURIComponent(drawDate)}`;

    try {
      const token = await authService.ensureValidToken();
      if (!token) {
        return {
          success: false,
          error: 'Not authenticated',
          status: 401,
        };
      }

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || errorData.message || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      const data = await response.json();
      return { success: true, data, status: response.status };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Request failed';
      logger.error(`Silver mode leaderboard error: ${errorMessage}`, 'API');
      return {
        success: false,
        error: errorMessage,
        status: 0,
      };
    }
  }

  /**
   * Get recent winners
   */
  async getRecentWinners(): Promise<
    ApiResponse<{
      draw_date: string;
      total_winners: number;
      bronze_winners: number;
      silver_winners: number;
      winners: Array<{
        mode: string;
        position: number;
        username: string;
        user_id: number;
        money_awarded: number;
        submitted_at: string;
        profile_pic: string | null;
        badge_image_url: string | null;
        avatar_url: string | null;
        frame_url: string | null;
        subscription_badges: Array<{
          id: string;
          name: string;
          image_url: string;
          subscription_type: string;
          price: number;
        }>;
        level: number;
        level_progress: string;
        draw_date: string;
      }>;
    }>
  > {
    return this.makeRequest<{
      draw_date: string;
      total_winners: number;
      bronze_winners: number;
      silver_winners: number;
      winners: Array<{
        mode: string;
        position: number;
        username: string;
        user_id: number;
        money_awarded: number;
        submitted_at: string;
        profile_pic: string | null;
        badge_image_url: string | null;
        avatar_url: string | null;
        frame_url: string | null;
        subscription_badges: Array<{
          id: string;
          name: string;
          image_url: string;
          subscription_type: string;
          price: number;
        }>;
        level: number;
        level_progress: string;
        draw_date: string;
      }>;
    }>(API_CONFIG.ENDPOINTS.WINNERS.RECENT);
  }

  /**
   * Trivia APIs
   */

  /**
   * Utility APIs
   */

  /**
   * Health check
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.makeRequest<{ status: string; timestamp: string }>(
      API_CONFIG.ENDPOINTS.UTILITY.HEALTH
    );
  }

  /**
   * Get app configuration
   */
  async getAppConfig(): Promise<
    ApiResponse<{
      version: string;
      features: string[];
      maintenance: boolean;
    }>
  > {
    return this.makeRequest<{
      version: string;
      features: string[];
      maintenance: boolean;
    }>(API_CONFIG.ENDPOINTS.UTILITY.CONFIG);
  }

  /**
   * Make authenticated request (public method for use in slices)
   */
  async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, options);
  }

  /**
   * Chat Mute APIs
   */

  /**
   * Mute/unmute global chat
   */
  async muteGlobalChat(muted: boolean): Promise<
    ApiResponse<{
      message: string;
      global_chat_muted: boolean;
    }>
  > {
    return this.makeRequest<{
      message: string;
      global_chat_muted: boolean;
    }>(API_CONFIG.ENDPOINTS.CHAT_MUTE.GLOBAL, {
      method: 'POST',
      body: JSON.stringify({ muted }),
    });
  }

  /**
   * Mute/unmute private chat with specific user
   */
  async mutePrivateChat(
    userId: number,
    muted: boolean
  ): Promise<
    ApiResponse<{
      message: string;
      muted: boolean;
    }>
  > {
    return this.makeRequest<{
      message: string;
      muted: boolean;
    }>(`${API_CONFIG.ENDPOINTS.CHAT_MUTE.PRIVATE}/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ muted }),
    });
  }

  /**
   * Get list of muted private chat users
   */
  async getMutedPrivateChats(): Promise<
    ApiResponse<{
      muted_users: number[];
      count: number;
    }>
  > {
    return this.makeRequest<{
      muted_users: number[];
      count: number;
    }>(API_CONFIG.ENDPOINTS.CHAT_MUTE.PRIVATE_LIST);
  }

  /**
   * Send referral code
   */
  async sendReferral(): Promise<
    ApiResponse<{
      referral_code: string;
      share_text: string;
      app_link: string;
    }>
  > {
    return this.makeRequest<{
      referral_code: string;
      share_text: string;
      app_link: string;
    }>('/profile/send-referral', {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();
export default apiService;
