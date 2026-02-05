import { authService } from '../authService';
import { API_CONFIG } from '../../config/api';
import { logger } from '../../lib/utils/logger';

// Lazy load request deduplication to prevent initialization issues
let requestDeduplicator: any = null;
try {
  const dedupModule = require('../../lib/network/requestDeduplication');
  requestDeduplicator = dedupModule.requestDeduplicator;
} catch (error) {
  // Fallback if deduplication module fails to load
  logger.warn('Request deduplication not available, continuing without it', 'API');
}

interface ApiOptions {
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  [key: string]: any;
}

/**
 * Makes an authenticated API request
 * @param url - API endpoint
 * @param options - Fetch options
 * @returns Promise<Response> - API response
 */
export const authenticatedRequest = async (
  url: string,
  options: ApiOptions = {}
): Promise<Response> => {
  try {
    // Get valid access token (ensures token is refreshed if needed)
    const accessToken = await authService.ensureValidToken();

    if (!accessToken) {
      throw new Error('No authentication token available');
    }

    // Reject mock tokens - only use real tokens
    if (accessToken.startsWith('mock_')) {
      logger.error('Mock token detected - rejecting request', 'AUTH_TOKEN');
      throw new Error('Mock token detected. Please use a real authentication token.');
    }

    // Set up headers with authentication token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    // Always add Authorization header for real authentication
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    // Decode JWT to see which user this token belongs to
    let tokenUserInfo: any = null;
    try {
      const tokenParts = accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        tokenUserInfo = {
          sub: payload.sub,
          email: payload.email || payload.drn || 'N/A',
          exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A',
        };
      }
    } catch (e) {
      logger.warn('Could not decode token', 'AUTH_TOKEN');
    }

    logger.debug(`Making authenticated request: ${options.method || 'GET'} ${url}`, 'API');

    // Make the request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout (increased for slow backends)

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    logger.debug(`Response status: ${response.status}`, 'API');

    // Handle token expiration - retry with refresh ONCE, then logout if fails
    if (response.status === 401) {
      // CRITICAL: Check if this is a retry attempt (prevent infinite loop)
      const isRetry = (options.headers as any)?.__isRetry;

      if (isRetry) {
        // This is already a retry - refresh failed, force logout
        logger.error('Second 401 after token refresh - forcing logout', 'AUTH_TOKEN');
        await authService.logout();
        return response;
      }

      logger.warn('401 error, attempting token refresh (ONE attempt)', 'AUTH_TOKEN');

      try {
        const newToken = await authService.refreshAccessToken(true);

        if (newToken) {
          // Retry the request with the new token - mark as retry to prevent loop
          const newHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers,
            __isRetry: 'true', // Mark as retry attempt
          };

          // Always add Authorization header for real authentication
          newHeaders.Authorization = `Bearer ${newToken}`;

          logger.debug('Retrying request with refreshed token (FINAL attempt)', 'AUTH_TOKEN');
          const retryResponse = await fetch(url, {
            ...options,
            headers: newHeaders,
          });

          // If retry also fails with 401, token refresh didn't work - FORCE LOGOUT
          if (retryResponse.status === 401) {
            logger.error(
              'Retry after refresh still returned 401 - refresh token invalid, forcing logout',
              'AUTH_TOKEN'
            );
            await authService.logout();
          }

          return retryResponse;
        } else {
          // Refresh returned null - refresh token is invalid, FORCE LOGOUT
          logger.error(
            'Token refresh returned null - refresh token invalid, forcing logout',
            'AUTH_TOKEN'
          );
          await authService.logout();
          return response;
        }
      } catch (refreshError) {
        // Refresh error - FORCE LOGOUT to prevent infinite loop
        logger.error(
          'Token refresh error - forcing logout to prevent loop',
          'AUTH_TOKEN',
          refreshError
        );
        await authService.logout();
        return response;
      }
    }

    return response;
  } catch (error) {
    // Suppress "No authentication token available" errors - expected when not logged in
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = String(error);
    const isAuthError =
      errorMessage === 'No authentication token available' ||
      errorMessage.includes('No authentication token') ||
      errorString.includes('No authentication token available') ||
      errorString.includes('No authentication token');

    if (isAuthError) {
      // Silent - expected when user is not authenticated
      // Re-throw the error but don't log it - let callers handle it silently
      throw error;
    }

    logger.error(`API request error: ${errorMessage}`, 'API', {
      url,
      method: options.method || 'GET',
    });

    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your internet connection');
      } else if (error.message.includes('Network request failed')) {
        throw new Error('Network error - please check your internet connection and try again');
      } else if (error.message.includes('fetch')) {
        throw new Error('Connection failed - please check your internet connection');
      }
    }

    throw error;
  }
};

/**
 * Simple API client class for making requests
 */
class ApiClient {
  private baseUrl = API_CONFIG.BASE_URL;

  async get(url: string, options?: { forceFresh?: boolean }) {
    // Create deduplication key
    const dedupKey = `GET:${url}:${options?.forceFresh ? 'fresh' : 'cached'}`;

    // Use deduplication for GET requests (unless forceFresh is true)
    if (!options?.forceFresh && requestDeduplicator) {
      return requestDeduplicator.deduplicate(dedupKey, async () => {
        return this._getInternal(url, options);
      });
    }

    return this._getInternal(url, options);
  }

  private async _getInternal(url: string, options?: { forceFresh?: boolean }) {
    // Add cache-busting headers if forceFresh is true
    const headers: Record<string, string> = {};
    if (options?.forceFresh) {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers.Pragma = 'no-cache';
      headers.Expires = '0';
      logger.debug(`GET request with cache-busting enabled: ${url}`, 'API');
    }

    const response = await authenticatedRequest(`${this.baseUrl}${url}`, {
      method: 'GET',
      headers,
    });

    // Handle 404 gracefully - parse response body to get meaningful error message
    if (response.status === 404) {
      try {
        const errorData = await response.json();
        // For trivia/current-question, return a structured response indicating no question available
        if (url.includes('/trivia/current-question')) {
          logger.debug(`GET ${url} returned 404 - No question available`, 'API');
          // Return a structure that indicates no question available
          return {
            no_question_available: true,
            detail: errorData.detail || 'No questions available for today',
            daily_completed: false,
          };
        }
        // For other endpoints, return null
        logger.debug(`GET ${url} returned 404 - returning empty array/null`, 'API');
        return null;
      } catch (e) {
        // If we can't parse the error response, return null
        logger.debug(`GET ${url} returned 404 - could not parse error response`, 'API');
        if (url.includes('/trivia/current-question')) {
          return {
            no_question_available: true,
            detail: 'No questions available for today',
            daily_completed: false,
          };
        }
        return null;
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async post(url: string, data: any) {
    // Create deduplication key (only for idempotent POSTs - skip for now)
    // Most POSTs are not idempotent, so we don't deduplicate by default
    return this._postInternal(url, data);
  }

  private async _postInternal(url: string, data: any) {
    logger.debug(`POST request to ${url}`, 'API');

    const response = await authenticatedRequest(`${this.baseUrl}${url}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    logger.debug(`POST response status: ${response.status}`, 'API');

    // Parse response body once for both logging and return
    let responseData: any = null;
    try {
      responseData = await response.json();
      logger.debug(`POST response received for ${url}`, 'API');
    } catch (e) {
      logger.warn('Could not parse response body', 'API', e);
      // If we can't parse and response is not ok, we'll handle it below
      if (response.ok) {
        // If response is ok but we can't parse, return empty object
        return {};
      }
    }

    if (!response.ok) {
      // Get more detailed error information
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = responseData || {};
        errorMessage = `HTTP ${response.status}: ${errorData.message || errorData.detail || response.statusText}`;
        logger.error(`POST Error Response: ${errorMessage}`, 'API', {
          url: `${this.baseUrl}${url}`,
          endpoint: url,
          status: response.status,
        });

        // For trivia submit-answer errors, check if response contains is_correct and daily_completed
        // These are special error responses that should be handled differently
        if (url.includes('/trivia/submit-answer') && errorData.is_correct !== undefined) {
          // Create a special error object that includes the structured data
          const structuredError: any = new Error(errorMessage);
          structuredError.is_correct = errorData.is_correct;
          structuredError.daily_completed = errorData.daily_completed || false;
          structuredError.message = errorData.message || errorData.detail || errorMessage;
          structuredError.status = errorData.status || 'error';
          throw structuredError;
        }
      } catch (e: any) {
        // If it's our structured error, re-throw it
        if (e.is_correct !== undefined) {
          throw e;
        }
        logger.error('Could not parse error response', 'API');
      }
      throw new Error(errorMessage);
    }

    // Return the parsed response
    return responseData;
  }

  async put(url: string, data: any) {
    const response = await authenticatedRequest(`${this.baseUrl}${url}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async delete(url: string) {
    const response = await authenticatedRequest(`${this.baseUrl}${url}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async uploadProfilePicture(fileUri: string, fileName?: string): Promise<any> {
    try {
      // Get valid access token
      const accessToken = await authService.ensureValidToken();
      if (!accessToken) {
        throw new Error('No authentication token available');
      }

      // Create FormData
      const formData = new FormData();

      // Determine file name and type
      const fileExtension = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
      const finalFileName = fileName || `profile_pic.${fileExtension}`;

      // Add file to FormData
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: finalFileName,
      } as any);

      // Make authenticated request with multipart/form-data
      const headers: Record<string, string> = {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        // Don't set Content-Type - let fetch set it with boundary
      };

      const response = await fetch(`${this.baseUrl}/profile/upload-profile-pic`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = `HTTP ${response.status}: ${errorData.message || errorData.detail || response.statusText}`;
        } catch (e) {
          // Could not parse error response
        }
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error: any) {
      logger.error('Error uploading profile picture', 'API', error);
      throw error;
    }
  }

  // selectFrame removed - endpoint no longer available

  /**
   * Select an avatar for the user's profile
   * @param avatarId - The avatar ID to select (e.g., "Avatar-8")
   * @returns Promise with the selection response
   */
  async selectAvatar(avatarId: string): Promise<any> {
    logger.debug(`Selecting avatar: ${avatarId}`, 'API');
    const response = await authenticatedRequest(
      `${this.baseUrl}/cosmetics/avatars/select/${avatarId}`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = `HTTP ${response.status}: ${errorData.message || errorData.detail || response.statusText}`;
      } catch (e) {
        // Could not parse error response
      }
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    logger.debug('Avatar selected successfully', 'API');
    return responseData;
  }
}

export const apiClient = new ApiClient();

/**
 * Test API connectivity without authentication
 */
export const testApiConnectivity = async (): Promise<boolean> => {
  try {
    logger.debug('Testing API connectivity', 'API');
    const response = await fetch('https://trivia-back-end.vercel.app/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.debug(`Health check response: ${response.status}`, 'API');
    return response.ok;
  } catch (error) {
    logger.error('Health check failed', 'API', error);
    return false;
  }
};

/**
 * Test trivia API endpoint format
 */
export const testTriviaApiFormat = async (): Promise<boolean> => {
  try {
    logger.debug('Testing trivia API format', 'API');

    // Test with a simple GET request to current-question
    const response = await fetch('https://trivia-back-end.vercel.app/trivia/current-question', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    logger.debug(`Trivia API test response: ${response.status}`, 'API');

    return response.ok;
  } catch (error) {
    logger.error('Trivia API test failed', 'API', error);
    return false;
  }
};
