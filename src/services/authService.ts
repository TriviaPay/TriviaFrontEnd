/**
 * Professional Authentication Service
 * Handles all authentication operations in a professional manner
 * Single source of truth for all authentication needs
 */

import * as Keychain from 'react-native-keychain';
import { DESCOPE_CONFIG } from '../config/descope';
import { keychainStorage } from './keychainStorage';
import { getGlobalAuthState, User as AuthUser } from '../store/authSlice';
import { selectAuthState } from '../store/authSelectors';
// import { store } from '../store/store'; // REMOVED to prevent circular dependency
import { API_CONFIG } from '../config/api';
import { logger } from '../lib/utils/logger';

// Lazy load store to prevent circular dependencies
const getStore = () => {
  try {
    return require('../store/store').store;
  } catch (e) {
    logger.warn('Failed to load store lazily', 'AUTH', e);
    return null;
  }
};

const __DEV__ = process.env.NODE_ENV === 'development';

// Using keychain storage only - no MMKV

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expiry',
  USER_DATA: 'user_data',
  LAST_REFRESH: 'last_refresh',
  SESSION_TOKEN: 'session_token',
} as const;

// Types
export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  picture?: string;
  country?: string;
  date_of_birth?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  error?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Professional Authentication Service
 * Handles all authentication operations in a professional manner
 */
class AuthService {
  private static instance: AuthService;
  private descopeInstance: any = null;
  private isInitialized = false;
  private refreshPromise: Promise<string | null> | null = null;
  private tokenCache: { token: string | null; timestamp: number } | null = null;
  private readonly TOKEN_CACHE_DURATION = 60000; // 60 seconds cache (increased for performance)

  // Session caching for 1 minute to prevent multiple session creation
  private sessionCache: {
    session: any;
    timestamp: number;
    userId?: string;
  } | null = null;
  private readonly SESSION_CACHE_DURATION = 60000; // 1 minute cache
  private activeSessionRequests: Map<string, Promise<any>> = new Map();
  private sessionRequestCounts: Map<string, number> = new Map();

  // Refresh lock mechanism
  private isRefreshing = false;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly REFRESH_THRESHOLD = 45 * 1000; // 45 seconds before expiry (reduced from 2 minutes)

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize the service with Descope SDK
   */
  setDescopeInstance(descopeInstance: any): void {
    this.descopeInstance = descopeInstance;
    this.isInitialized = true;
  }

  /**
   * Initialize Descope SDK - The SDK is already initialized via AuthProvider in App.tsx
   */
  async initializeDescope(): Promise<void> {
    try {
      // Check for and clear corrupted token data

      try {
        // Try to get access token - if it fails with missing chunks, clear corrupted data
        const accessToken = await keychainStorage.getAccessToken();
        if (accessToken) {
          // Check if token is corrupted (contains Redux persist data)
          if (
            accessToken.includes('_persist') ||
            accessToken.includes('version') ||
            accessToken.length < 100
          ) {
            await keychainStorage.clearAllCorruptedData();
          } else {
          }
        } else {
        }
      } catch (error) {
        // If we get an error getting the token (e.g., missing chunks), clear corrupted data

        try {
          await keychainStorage.clearAllCorruptedData();
        } catch (clearError) {
          logger.error('Error clearing corrupted data', 'AUTH', clearError);
        }
      }

      // The Descope SDK is already initialized at the app level via AuthProvider
      // We just need to mark this service as initialized
      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to initialize Descope SDK', 'AUTH', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.descopeInstance) {
      logger.warn('Auth Service not initialized yet, returning default values', 'AUTH');
      // Don't throw error, just return default values
      return;
    }
  }

  /**
   * Check if session is cached and still valid
   */
  private isSessionCached(userId?: string): boolean {
    if (!this.sessionCache) return false;

    const now = Date.now();
    const isExpired = now - this.sessionCache.timestamp >= this.SESSION_CACHE_DURATION;
    const isSameUser = !userId || this.sessionCache.userId === userId;

    return !isExpired && isSameUser;
  }

  /**
   * Get cached session if available
   */
  private getCachedSession(): any {
    return this.sessionCache?.session || null;
  }

  /**
   * Cache session data
   */
  private cacheSession(session: any, userId?: string): void {
    this.sessionCache = {
      session,
      timestamp: Date.now(),
      userId,
    };
  }

  /**
   * Check if session request is already in progress
   */
  private isSessionRequestInProgress(userId: string): boolean {
    return this.activeSessionRequests.has(userId);
  }

  /**
   * Get active session request
   */
  private getActiveSessionRequest(userId: string): Promise<any> | null {
    return this.activeSessionRequests.get(userId) || null;
  }

  /**
   * Set active session request
   */
  private setActiveSessionRequest(userId: string, promise: Promise<any>): void {
    this.activeSessionRequests.set(userId, promise);
  }

  /**
   * Clear active session request
   */
  private clearActiveSessionRequest(userId: string): void {
    this.activeSessionRequests.delete(userId);
  }

  /**
   * Track session request count to prevent rapid calls
   */
  private incrementSessionRequestCount(userId: string): void {
    const count = this.sessionRequestCounts.get(userId) || 0;
    this.sessionRequestCounts.set(userId, count + 1);
  }

  /**
   * Check if too many session requests for this user
   */
  private isTooManySessionRequests(userId: string): boolean {
    const count = this.sessionRequestCounts.get(userId) || 0;
    return count > 3; // Max 3 session requests per user in short time
  }

  /**
   * Reset session request count
   */
  private resetSessionRequestCount(userId: string): void {
    this.sessionRequestCounts.delete(userId);
  }

  /**
   * Get or create session with 1-minute caching to prevent multiple session creation
   */
  async getOrCreateSession(userId?: string): Promise<any> {
    try {
      if (!this.isInitialized || !this.descopeInstance) {
        logger.warn('Auth Service not initialized', 'AUTH');
        return null;
      }

      // Check if we have a cached session
      if (this.isSessionCached(userId)) {
        return this.getCachedSession();
      }

      // Check if session request is already in progress
      if (userId && this.isSessionRequestInProgress(userId)) {
        const activeRequest = this.getActiveSessionRequest(userId);
        if (activeRequest) {
          return await activeRequest;
        }
      }

      // Check for too many rapid requests
      if (userId && this.isTooManySessionRequests(userId)) {
        logger.warn('Too many session requests, using cached session or returning null', 'AUTH');
        return this.getCachedSession();
      }

      // Increment request count
      if (userId) {
        this.incrementSessionRequestCount(userId);
      }

      // Create session request promise
      const sessionPromise = this.createSessionInternal(userId);

      // Set as active request
      if (userId) {
        this.setActiveSessionRequest(userId, sessionPromise);
      }

      try {
        const session = await sessionPromise;

        // Cache the session for 1 minute
        this.cacheSession(session, userId);

        // Reset request count on success
        if (userId) {
          this.resetSessionRequestCount(userId);
        }

        return session;
      } finally {
        // Clear active request
        if (userId) {
          this.clearActiveSessionRequest(userId);
        }
      }
    } catch (error) {
      logger.error('Error getting or creating session', 'AUTH', error);
      return null;
    }
  }

  /**
   * Internal method to create session
   */
  private async createSessionInternal(userId?: string): Promise<any> {
    try {
      // Try to get existing session from Descope
      if (this.descopeInstance?.session?.getSession) {
        const session = await this.descopeInstance.session.getSession();
        if (session && session.ok) {
          return session.data;
        }
      }

      // If no existing session, create a new one

      // This would typically involve your session creation logic
      // For now, we'll return a mock session structure
      const newSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userId || 'anonymous',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        isActive: true,
      };

      return newSession;
    } catch (error) {
      logger.error('Error creating session', 'AUTH', error);
      throw error;
    }
  }

  /**
   * Store tokens securely
   */
  async storeTokens(
    accessToken: string,
    refreshToken?: string,
    expiryTime?: number
  ): Promise<void> {
    try {
      // Security: Don't log token details in production
      if (__DEV__) {
      }

      // Store using keychainStorage service (consistent approach)
      const accessTokenStored = await keychainStorage.storeAccessToken(accessToken);
      if (!accessTokenStored) {
        throw new Error('Failed to store access token');
      }

      if (refreshToken) {
        const refreshTokenStored = await keychainStorage.storeRefreshToken(refreshToken);
        if (!refreshTokenStored) {
          logger.warn(
            'Failed to store refresh token, but access token stored successfully',
            'AUTH'
          );
        }
      }

      if (expiryTime) {
        await keychainStorage.set(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
      }

      await keychainStorage.set(STORAGE_KEYS.LAST_REFRESH, Date.now().toString());
    } catch (error) {
      logger.error('Failed to store tokens', 'AUTH', error);
      throw error;
    }
  }

  /**
   * Get access token with caching to prevent excessive calls
   * NOTE: This function should NOT call store.getState() during reducer execution
   * Use getGlobalAuthState() first, then fallback to keychain
   */
  async getAccessToken(): Promise<string | null> {
    // Check cache first
    if (this.tokenCache && Date.now() - this.tokenCache.timestamp < this.TOKEN_CACHE_DURATION) {
      return this.tokenCache.token;
    }

    // Try globalAuthState first (safe during reducer execution)
    const globalState = getGlobalAuthState();
    if (globalState?.token) {
      const token = globalState.token as string;
      this.tokenCache = { token, timestamp: Date.now() };
      return token;
    }

    // Try Redux state (only if not in reducer execution - use try-catch to be safe)
    try {
      // Only access store if it's safe (not during reducer execution)
      const store = getStore();
      if (store) {
        const authState = selectAuthState(store.getState());
        if (authState?.token) {
          const token = authState.token as string;
          this.tokenCache = { token, timestamp: Date.now() };
          return token;
        }
      }
    } catch (error: any) {
      // If we're in reducer execution, store.getState() will throw
      // Fall through to keychain storage
      if (error?.message?.includes('reducer is executing')) {
        // Silently fall through to keychain
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    // Fallback to Keychain storage (always safe)
    const token = await keychainStorage.getAccessToken();
    // Update cache
    this.tokenCache = { token, timestamp: Date.now() };
    return token || null;
  }

  /**
   * Get session token (same as access token with caching)
   */
  async getSessionToken(): Promise<string | null> {
    return this.getAccessToken();
  }

  /**
   * Get refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      const refreshToken = await keychainStorage.getRefreshToken();
      return refreshToken;
    } catch (error) {
      logger.error('Error getting refresh token', 'AUTH', error);
      return null;
    }
  }

  /**
   * Store session token
   */
  async setSessionToken(token: string): Promise<void> {
    try {
      await keychainStorage.storeAccessToken(token);
      // Clear cache when token is updated
      this.tokenCache = null;
    } catch (error) {
      logger.error('Failed to store session token', 'AUTH', error);
    }
  }

  /**
   * Get email from session token (for signup flow)
   */
  async getEmailFromSessionToken(): Promise<string | null> {
    try {
      const token = await this.getSessionToken();
      if (!token || !token.startsWith('temp_signup_')) {
        return null;
      }

      // Extract email from token format: temp_signup_<base64_email>_<timestamp>
      const parts = token.split('_');
      if (parts.length >= 3) {
        const emailBase64 = parts[2];

        // Use atob for React Native instead of Buffer
        const email = atob(emailBase64);
        // Security: Don't log email from token in production
        if (__DEV__) {
        }
        return email;
      }
      return null;
    } catch (error) {
      logger.error('Failed to extract email from session token', 'AUTH', error);
      return null;
    }
  }

  /**
   * Get token expiry time
   */
  private async getTokenExpiry(): Promise<number | null> {
    try {
      const token = await this.getAccessToken();
      if (token) {
        return this.getTokenExpiryFromJWT(token);
      }
      return null;
    } catch (error) {
      logger.error('Failed to get token expiry', 'AUTH', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  async isTokenExpired(): Promise<boolean> {
    const expiry = await this.getTokenExpiry();
    if (!expiry) return false; // If no expiry info, assume token is valid
    return Date.now() >= expiry;
  }

  // Cache for token expiry checks to reduce API calls
  private tokenExpiryCache: { result: boolean; timestamp: number } | null = null;
  private jwtPayloadCache: { payload: any; timestamp: number } | null = null;
  private readonly TOKEN_CACHE_DURATION = 10000; // 10 seconds cache

  /**
   * Clear all caches (useful for logout or token refresh)
   */
  private clearCaches(): void {
    this.tokenExpiryCache = null;
    this.jwtPayloadCache = null;
  }

  /**
   * Check if token is expiring soon (within 2 minutes for proactive refresh)
   */
  async isTokenExpiringSoon(): Promise<boolean> {
    // Check cache first
    if (
      this.tokenExpiryCache &&
      Date.now() - this.tokenExpiryCache.timestamp < this.TOKEN_CACHE_DURATION
    ) {
      return this.tokenExpiryCache.result;
    }

    const expiry = await this.getTokenExpiry();
    if (!expiry) return false; // If no expiry info, assume token is valid

    const now = Date.now();
    const timeUntilExpiry = expiry - now;

    const shouldRefresh = timeUntilExpiry <= this.REFRESH_THRESHOLD;

    // Cache the result
    this.tokenExpiryCache = {
      result: shouldRefresh,
      timestamp: now,
    };

    if (__DEV__) {
    }

    return shouldRefresh;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      const isExpired = await this.isTokenExpired();
      const expiry = await this.getTokenExpiry();

      return !!(token && !isExpired);
    } catch (error) {
      logger.warn('Auth Service not initialized, returning false for isAuthenticated', 'AUTH');
      return false;
    }
  }

  /**
   * Check authentication status on app start - Professional Implementation
   */
  async checkAuthStatus(): Promise<{
    isAuthenticated: boolean;
    user: User | null;
    needsRefresh: boolean;
  }> {
    try {
      // First check if we have a token
      const token = await this.getAccessToken();
      if (!token) {
        return { isAuthenticated: false, user: null, needsRefresh: false };
      }

      // Check token expiry
      const isExpired = await this.isTokenExpired();
      const isExpiringSoon = await this.isTokenExpiringSoon();
      let tokenWasRefreshed = false;

      if (isExpired) {
        const newToken = await this.refreshAccessToken();
        if (!newToken) {
          await this.logout();
          return { isAuthenticated: false, user: null, needsRefresh: false };
        }

        tokenWasRefreshed = true;
      } else if (isExpiringSoon) {
        const newToken = await this.refreshAccessToken();
        if (!newToken) {
        } else {
          tokenWasRefreshed = true;
        }
      }

      // Get user data from local storage only
      let user = await this.getCurrentUser();

      // If no user data locally, try to get from global auth state first
      if (!user) {
        // Try globalAuthState first (safe during reducer execution)
        const globalState = getGlobalAuthState();
        if (globalState?.user) {
          user = globalState.user;
        } else {
          // Try Redux state (only if not in reducer execution)
          try {
            const store = getStore();
            if (store) {
              const authState = selectAuthState(store.getState());
              if (authState?.user) {
                user = authState.user;
              }
            }
          } catch (error: any) {
            // If we're in reducer execution, store.getState() will throw
            // Silently fall through
            if (!error?.message?.includes('reducer is executing')) {
            }
          }
        }
      }

      if (!user) {
        await this.logout();
        return { isAuthenticated: false, user: null, needsRefresh: false };
      }

      return { isAuthenticated: true, user, needsRefresh: tokenWasRefreshed };
    } catch (error) {
      logger.error('Auth status check failed', 'AUTH', error);
      // Don't logout immediately, try to recover

      await this.logout();
      return { isAuthenticated: false, user: null, needsRefresh: false };
    }
  }

  /**
   * Initialize authentication system on app start
   */
  async initializeAuth(): Promise<{
    isAuthenticated: boolean;
    user: User | null;
    needsRefresh: boolean;
  }> {
    try {
      // Initialize Descope if not already done
      if (!this.isInitialized) {
        await this.initializeDescope();
      }

      // Check authentication status
      const authStatus = await this.checkAuthStatus();

      if (authStatus.isAuthenticated) {
        // Start background token refresh
        this.startTokenRefreshTimer();
      } else {
      }

      return authStatus;
    } catch (error) {
      logger.error('Auth initialization failed', 'AUTH', error);
      return { isAuthenticated: false, user: null, needsRefresh: false };
    }
  }

  /**
   * Start automatic token refresh timer
   */
  private startTokenRefreshTimer(): void {
    try {
      // Clear any existing timer to prevent duplicates
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }

      // Check token every 60 seconds (reduced frequency for performance)
      const REFRESH_INTERVAL = 60 * 1000; // 60 seconds

      this.refreshTimer = setInterval(async () => {
        try {
          // Skip if already refreshing - timer will resume after refresh completes
          if (this.isRefreshing) {
            return;
          }

          // Skip refresh if we have a temporary signup token (not a real auth token)
          const token = await this.getAccessToken();
          if (token && token.startsWith('temp_signup_')) {
            return;
          }
          if (token && (await this.isTokenExpiringSoon())) {
            // Stop timer during refresh to prevent multiple concurrent attempts
            this.pauseRefreshTimer();

            const newToken = await this.refreshAccessToken();

            // Resume timer after refresh completes
            this.resumeRefreshTimer();
          }
        } catch (error) {
          // Resume timer even on error
          this.resumeRefreshTimer();
        }
      }, REFRESH_INTERVAL);
    } catch (error) {
      // Silent failure - timer will retry on next auth check
    }
  }

  /**
   * Stop automatic token refresh timer
   */
  private stopTokenRefreshTimer(): void {
    try {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    } catch (error) {
      logger.error('Failed to stop token refresh timer', 'AUTH', error);
    }
  }

  /**
   * Pause refresh timer during ongoing refresh
   */
  private pauseRefreshTimer(): void {
    try {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }
    } catch (error) {
      logger.error('Failed to pause refresh timer', 'AUTH', error);
    }
  }

  /**
   * Resume refresh timer after refresh completes
   */
  private resumeRefreshTimer(): void {
    try {
      // Only resume if not already running and not refreshing
      if (!this.refreshTimer && !this.isRefreshing) {
        this.startTokenRefreshTimer();
      }
    } catch (error) {
      logger.error('Failed to resume refresh timer', 'AUTH', error);
    }
  }

  /**
   * Get current refresh threshold for debugging
   */
  getRefreshThreshold(): number {
    return this.REFRESH_THRESHOLD;
  }

  /**
   * Check if refresh is currently in progress
   */
  isRefreshInProgress(): boolean {
    return this.isRefreshing;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(): Promise<string | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    if (await this.isTokenExpired()) {
      return await this.refreshAccessToken();
    }

    if (await this.isTokenExpiringSoon()) {
      return await this.refreshAccessToken();
    }

    return token;
  }

  /**
   * Force proactive token refresh (for critical operations)
   */
  async forceProactiveRefresh(): Promise<string | null> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        return null;
      }

      // Always refresh if token exists (for critical operations)
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        return newToken;
      } else {
        return token;
      }
    } catch (error) {
      logger.error('Force proactive refresh error', 'AUTH', error);
      return await this.getAccessToken();
    }
  }

  /**
   * Refresh access token with enhanced deduplication and single lock
   * @param forceRefresh - If true, force refresh even if cached token seems valid
   */
  async refreshAccessToken(forceRefresh: boolean = false): Promise<string | null> {
    // Prevent multiple simultaneous refresh attempts with promise (preferred approach)
    if (this.refreshPromise) {
      try {
        const result = await this.refreshPromise;
        return result;
      } catch (error) {
        logger.error('Error in existing refresh promise', 'AUTH', error);
        // Clear the promise if it failed so we can retry
        this.refreshPromise = null;
        this.isRefreshing = false;
        return null;
      }
    }

    // Check if refresh is already in progress (fallback check)
    if (this.isRefreshing) {
      // Wait a bit for promise to be created, then check again
      await new Promise(resolve => setTimeout(resolve, 200));
      if (this.refreshPromise) {
        return this.refreshPromise;
      }
      // If still no promise after wait, proceed to create new refresh
    }

    try {
      this.isRefreshing = true;

      // Pause timer during refresh to prevent concurrent attempts
      this.pauseRefreshTimer();

      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        this.isRefreshing = false;
        this.resumeRefreshTimer();
        return null;
      }

      // Check if we have a valid cached token first (before creating promise)
      // Only use cached token if not forcing refresh and token is not expired
      if (!forceRefresh) {
        const cachedToken = await this.getAccessToken();
        if (cachedToken && !(await this.isTokenExpired())) {
          this.isRefreshing = false;
          this.resumeRefreshTimer();
          return cachedToken;
        }
      } else {
      }

      // Create refresh promise
      this.refreshPromise = this.performTokenRefresh(refreshToken).finally(() => {
        this.refreshPromise = null;
        this.isRefreshing = false;

        this.resumeRefreshTimer();
      });

      const result = await this.refreshPromise;
      return result;
    } catch (error) {
      logger.error('Error in refreshAccessToken', 'AUTH', error);
      this.isRefreshing = false;
      this.refreshPromise = null;

      // Resume timer even on error
      this.resumeRefreshTimer();

      // If there's a parsing error, try to clear corrupted data
      if (error instanceof SyntaxError) {
        await this.clearCorruptedData();
      }
      return null;
    }
  }

  /**
   * Perform token refresh
   */
  private async performTokenRefresh(refreshToken: string): Promise<string | null> {
    try {
      // Clear caches before refresh
      this.clearCaches();

      // Token refresh is handled by Descope SDK automatically

      // Try Descope SDK refresh as fallback
      if (this.descopeInstance?.refresh) {
        try {
          const descopeResult = await this.descopeInstance.refresh();
          if (descopeResult?.sessionJwt) {
            const newToken = descopeResult.sessionJwt;
            const expiry = this.getTokenExpiryFromJWT(newToken);

            await this.storeTokens(newToken, descopeResult.refreshJwt, expiry || undefined);
            // Update global auth state (safe during reducer execution)
            const { getGlobalAuthState } = await import('../store/authSlice');
            const globalState = getGlobalAuthState();
            if (globalState) {
              (globalState as any).token = newToken;
              (globalState as any).lastCheck = Date.now();
            }

            return newToken;
          }
        } catch (error) {}
      }

      // Final fallback: Backend API refresh
      const apiResult = await this.refreshTokenViaAPI(refreshToken);
      if (apiResult.success && apiResult.access_token) {
        const newToken = apiResult.access_token!; // Non-null assertion since we checked it exists
        const expiry = this.getTokenExpiryFromJWT(newToken);

        await this.storeTokens(newToken, apiResult.refresh_token, expiry ?? undefined);
        // Update global auth state
        const { getGlobalAuthState } = await import('../store/authSlice');
        const currentState = getGlobalAuthState();
        if (currentState) {
          (currentState as any).token = newToken;
          (currentState as any).lastCheck = Date.now();
        }

        return newToken;
      }

      // If both methods fail, logout

      await this.logout();
      return null;
    } catch (error) {
      logger.error('Token refresh error', 'AUTH', error);
      await this.logout();
      return null;
    }
  }

  /**
   * Refresh token via API
   */
  private async refreshTokenViaAPI(refreshToken: string): Promise<{
    success: boolean;
    access_token?: string;
    refresh_token?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.error(`[refreshTokenViaAPI] Refresh failed: ${response.status}`, 'AUTH', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      };
    } catch (error) {
      logger.error('[refreshTokenViaAPI] API token refresh failed', 'AUTH', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check and refresh token if needed (call this before API requests)
   */
  async ensureValidToken(): Promise<string | null> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        return null;
      }

      const isExpired = await this.isTokenExpired();
      const isExpiringSoon = await this.isTokenExpiringSoon();

      if (isExpired) {
        return await this.refreshAccessToken();
      }

      if (isExpiringSoon) {
        return await this.refreshAccessToken();
      }

      return token;
    } catch (error) {
      logger.error('Error ensuring valid token', 'AUTH', error);
      return null;
    }
  }

  /**
   * Get token expiry from JWT (with caching)
   */
  private getTokenExpiryFromJWT(token: string): number | null {
    try {
      // Check cache first
      if (
        this.jwtPayloadCache &&
        Date.now() - this.jwtPayloadCache.timestamp < this.TOKEN_CACHE_DURATION
      ) {
        return this.jwtPayloadCache.payload;
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        logger.error('Invalid JWT format', 'AUTH');
        return null;
      }

      // Use atob for React Native instead of Buffer
      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp;
      const iat = payload.iat;

      // Only log once per cache period
      if (!this.jwtPayloadCache) {
      }

      if (typeof exp === 'number') {
        const expiryMs = exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = expiryMs - now;

        // Only log once per cache period
        if (!this.jwtPayloadCache) {
        }

        // Cache the result
        this.jwtPayloadCache = {
          payload: expiryMs,
          timestamp: now,
        };

        return expiryMs;
      }

      logger.error('No exp claim in JWT', 'AUTH');
      return null;
    } catch (error) {
      logger.error('Failed to parse JWT expiry', 'AUTH', error);
      return null;
    }
  }

  /**
   * Send OTP for signup
   */
  async sendOTP(email: string): Promise<AuthResponse> {
    try {
      // Try to use the Descope REST API service
      try {
        const { descopeAuthService } = await import('./descopeAuthService');

        const result = await descopeAuthService.sendOTP(email, null);

        if (result.success) {
          // Create a temporary session token for signup flow with email encoded
          const emailBase64 = btoa(email); // Use btoa instead of Buffer for React Native
          const tempSessionToken = 'temp_signup_' + emailBase64 + '_' + Date.now();
          await this.setSessionToken(tempSessionToken);
          // Security: Don't log email in production
          if (__DEV__) {
          }

          return { success: true };
        } else {
          logger.error('Descope REST API error', 'AUTH', result.error);
          throw new Error(result.error || 'Failed to send OTP via Descope API');
        }
      } catch (apiError) {
        logger.error('Descope REST API failed', 'AUTH', apiError);

        // For development, provide a mock success response
        if (__DEV__) {
        }
        const emailBase64 = btoa(email);
        const tempSessionToken = 'temp_signup_' + emailBase64 + '_' + Date.now();
        await this.setSessionToken(tempSessionToken);
        // Security: Don't log email in production
        if (__DEV__) {
        }

        return { success: true };
      }
    } catch (error) {
      logger.error('OTP send error', 'AUTH', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send OTP',
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, code: string): Promise<AuthResponse> {
    try {
      // Try to use the Descope REST API service
      try {
        const { descopeAuthService } = await import('./descopeAuthService');

        const result = await descopeAuthService.verifyOTP(email, code, null);

        if (result.success && result.sessionJwt) {
          const token = result.sessionJwt;
          const refreshToken = result.refreshJwt;
          const expiry = this.getTokenExpiryFromJWT(token);

          // Log tokens during signup (OTP verification)

          if (refreshToken) {
          }

          // Store session token for signup flow (don't store as access token yet)
          await this.setSessionToken(token);

          // Get user info
          const user = await this.getCurrentUser();

          return {
            success: true,
            user: user || undefined,
            token,
            refreshToken,
          };
        } else {
          logger.error('Descope REST API verification error', 'AUTH', result.error);
          throw new Error(result.error || 'Invalid OTP code');
        }
      } catch (apiError) {
        logger.error('Descope REST API verification failed', 'AUTH', apiError);

        // For development, provide a mock verification response

        const mockToken = 'mock_session_token_' + Date.now();
        const mockRefreshToken = 'mock_refresh_token_' + Date.now();

        // Store session token for signup flow
        await this.setSessionToken(mockToken);

        return {
          success: true,
          user: undefined,
          token: mockToken,
          refreshToken: mockRefreshToken,
        };
      }
    } catch (error) {
      logger.error('OTP verification error', 'AUTH', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid OTP code',
      };
    }
  }

  /**
   * Bind password
   */
  async bindPassword(
    email: string,
    password: string,
    username: string,
    country: string,
    dateOfBirth: string
  ): Promise<AuthResponse> {
    try {
      if (!this.isInitialized || !this.descopeInstance) {
        return {
          success: false,
          error: 'Authentication service not initialized',
        };
      }

      const result = await this.descopeInstance.password.replace(email, password);

      if (result.ok) {
        // Update user profile
        await this.updateProfile({ name: username });

        // Get tokens from the result
        const accessToken = result.data?.sessionJwt;
        const refreshToken = result.data?.refreshJwt;
        const expiry = this.getTokenExpiryFromJWT(accessToken);

        // Log tokens during signup (bindPassword)
        if (accessToken) {
        }
        if (refreshToken) {
        }

        // Store tokens if available
        if (accessToken) {
          await keychainStorage.storeAccessToken(accessToken);
          // Update global auth state
          const { getGlobalAuthState } = await import('../store/authSlice');
          const currentState = getGlobalAuthState();
          if (currentState) {
            (currentState as any).token = accessToken;
            (currentState as any).lastCheck = Date.now();
          }
        }

        if (refreshToken) {
          await keychainStorage.storeRefreshToken(refreshToken);
        }

        // Store user data
        const user: User = {
          id: result.data?.userId || '',
          email,
          username,
          country,
          date_of_birth: dateOfBirth,
        };

        await keychainStorage.storeUserData(user);

        return {
          success: true,
          user,
        };
      } else {
        throw new Error(result.error || 'Failed to bind password');
      }
    } catch (error) {
      logger.error('Password binding error', 'AUTH', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bind password',
      };
    }
  }

  /**
   * Login with password using real Descope SDK
   */
  async loginWithPassword(email: string, password: string): Promise<AuthResponse> {
    try {
      // Use Descope directly for password login (same pattern as signup)
      if (!this.descopeInstance) {
        throw new Error(
          'Descope instance not available. Please ensure Descope SDK is properly initialized.'
        );
      }

      const response = await this.descopeInstance.password.signIn(email, password);

      if (response.ok) {
        const sessionToken = response.data?.sessionJwt;
        const refreshToken = response.data?.refreshJwt;
        const user = response.data?.user;

        if (sessionToken) {
          // Log tokens during login - always log both access and refresh tokens together
          console.log('🔑 [authService] Access Token:', sessionToken);
          console.log('🔑 [authService] Access Token Length:', sessionToken.length);
          logger.log('[Login] Access Token received', 'AUTH_TOKEN', {
            tokenLength: sessionToken.length,
          });

          // Always log refresh token when access token is logged
          if (refreshToken) {
            console.log('🔑 [authService] Refresh Token:', refreshToken);
            console.log('🔑 [authService] Refresh Token Length:', refreshToken.length);
            logger.log('[Login] Refresh Token received', 'AUTH_TOKEN', {
              tokenLength: refreshToken.length,
            });
          } else {
            console.log('🔑 [authService] Refresh Token: NULL/NONE');
            logger.warn('[Login] Refresh Token not received', 'AUTH_TOKEN');
          }
        }

        if (sessionToken) {
          const expiry = this.getTokenExpiryFromJWT(sessionToken);
          await this.storeTokens(sessionToken, refreshToken, expiry || undefined);

          // Create user object from login data
          const userObj: User = {
            id: user?.id || email,
            email,
            username: user?.username || email.split('@')[0],
            name: user?.name || email.split('@')[0],
            picture: user?.picture,
            country: user?.country,
            date_of_birth: user?.dateOfBirth,
          };

          // Store user data
          await keychainStorage.storeUserData(userObj);

          // Update global auth state
          const { getGlobalAuthState } = await import('../store/authSlice');
          const currentState = getGlobalAuthState();
          if (currentState) {
            (currentState as any).user = userObj;
            (currentState as any).token = sessionToken;
            (currentState as any).isAuthenticated = true;
            (currentState as any).lastCheck = Date.now();
          }

          return {
            success: true,
            user: userObj,
            token: sessionToken,
            refreshToken,
          };
        } else {
          throw new Error('No session token received from Descope');
        }
      } else {
        const errorMessage =
          response.error?.errorDescription || response.error?.message || 'Login failed';

        // Handle specific Descope error codes
        if (response.error?.errorCode === 'E062903') {
          return {
            success: false,
            error:
              'Invalid email/username or password. Please check your credentials and try again.',
          };
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      logger.error('Login error', 'AUTH', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await keychainStorage.getUserData();
      if (userData) {
        // userData might already be an object or a JSON string
        if (typeof userData === 'string') {
          return JSON.parse(userData);
        } else {
          return userData;
        }
      }

      // Try to get user from Descope (only if available)
      if (this.descopeInstance?.me?.load) {
        try {
          const result = await this.descopeInstance.me.load();
          if (result.ok && result.data) {
            const user: User = {
              id: result.data.userId || '',
              email: result.data.email || '',
              username: result.data.name || '',
              name: result.data.name,
              picture: result.data.picture,
            };

            await keychainStorage.storeUserData(user);
            return user;
          }
        } catch (error) {
          logger.warn('Failed to load user from Descope', 'AUTH', error);
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to get current user', 'AUTH', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<AuthResponse> {
    try {
      if (!this.isInitialized || !this.descopeInstance) {
        return {
          success: false,
          error: 'Authentication service not initialized',
        };
      }

      const result = await this.descopeInstance.me.update(updates);

      if (result.ok) {
        // Update local storage
        const currentUser = await this.getCurrentUser();
        if (currentUser) {
          const updatedUser = { ...currentUser, ...updates };
          await keychainStorage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
        }

        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      logger.error('Profile update error', 'AUTH', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      };
    }
  }

  /**
   * Logout - Professional implementation with complete cleanup
   */
  async logout(): Promise<void> {
    try {
      logger.info('🔴 Logout initiated - clearing all auth data', 'AUTH');

      // Stop token refresh timer first
      this.stopTokenRefreshTimer();

      // Clear refresh lock
      this.isRefreshing = false;
      this.refreshPromise = null;

      // Clear token cache
      this.tokenCache = null;
      this.tokenExpiryCache = null;
      this.jwtPayloadCache = null;

      // Logout from Descope
      if (this.descopeInstance?.logout) {
        await this.descopeInstance.logout();
      }

      // Clear all stored data
      await keychainStorage.clearAll();

      // Clear session cache
      this.clearSessionCache();

      // CRITICAL: Dispatch logout action to Redux to update auth state
      try {
        const { store } = await import('../store');
        const { logout: logoutAction } = await import('../store/authSlice');
        store.dispatch(logoutAction());
        logger.info('✅ Redux auth state cleared', 'AUTH');
      } catch (dispatchError) {
        logger.error('Error dispatching logout action to Redux', 'AUTH', dispatchError);
      }

      logger.info('✅ Logout completed successfully', 'AUTH');
    } catch (error) {
      logger.error('Logout error', 'AUTH', error);
      // Force clear even if logout fails
      this.stopTokenRefreshTimer();
      this.isRefreshing = false;
      this.refreshPromise = null;
      this.tokenCache = null;
      this.tokenExpiryCache = null;
      this.jwtPayloadCache = null;
      await keychainStorage.clearAll();

      // Try to dispatch logout action even on error
      try {
        const { store } = await import('../store');
        const { logout: logoutAction } = await import('../store/authSlice');
        store.dispatch(logoutAction());
      } catch {
        // Silent fail
      }
    }
  }

  /**
   * Clear all authentication data (for debugging)
   */
  async clearAllAuthData(): Promise<void> {
    try {
      await this.logout();
    } catch (error) {
      logger.error('Error clearing auth data', 'AUTH', error);
    }
  }

  /**
   * Clear session cache
   */
  clearSessionCache(): void {
    this.sessionCache = null;
    this.activeSessionRequests.clear();
    this.sessionRequestCounts.clear();
  }

  /**
   * Get session cache statistics
   */
  getSessionCacheStats(): {
    hasCachedSession: boolean;
    cacheAge: number | null;
    activeRequests: number;
    requestCounts: { [userId: string]: number };
  } {
    const now = Date.now();
    const cacheAge = this.sessionCache ? now - this.sessionCache.timestamp : null;

    return {
      hasCachedSession: !!this.sessionCache,
      cacheAge,
      activeRequests: this.activeSessionRequests.size,
      requestCounts: Object.fromEntries(this.sessionRequestCounts.entries()),
    };
  }

  /**
   * Force refresh session (bypass cache)
   */
  async forceRefreshSession(userId?: string): Promise<any> {
    try {
      // Clear existing cache
      this.clearSessionCache();

      // Create new session
      const session = await this.createSessionInternal(userId);

      // Cache the new session
      this.cacheSession(session, userId);

      return session;
    } catch (error) {
      logger.error('Error force refreshing session', 'AUTH', error);
      return null;
    }
  }

  /**
   * Debug storage state (for troubleshooting)
   */
  async debugStorageState(): Promise<void> {
    try {
      const userData = await keychainStorage.getUserData();
      const accessToken = await keychainStorage.getAccessToken();
      const refreshToken = await keychainStorage.getRefreshToken();
      const authState = await keychainStorage.getAuthState();
    } catch (error) {
      logger.error('Error debugging storage state', 'AUTH', error);
    }
  }

  /**
   * Force complete authentication reset
   */
  async forceReset(): Promise<void> {
    try {
      // Clear token cache
      this.tokenCache = null;

      // Nuclear clear all storage
      await keychainStorage.nuclearClear();

      // Reset global state
      const currentState = getGlobalAuthState();
      // Note: globalAuthState is managed in authSlice, this will be reset by Redux
    } catch (error) {
      logger.error('Force reset failed', 'AUTH', error);
    }
  }

  /**
   * Clear corrupted keychain data
   */
  async clearCorruptedData(): Promise<void> {
    try {
      await keychainStorage.clearAllCorruptedData();
    } catch (error) {
      logger.error('Error clearing corrupted data', 'AUTH', error);
    }
  }

  /**
   * Check and repair keychain data integrity
   */
  async checkAndRepairKeychain(): Promise<{
    hasCorruptedData: boolean;
    repaired: boolean;
    message: string;
  }> {
    try {
      // Try to get tokens to detect corruption
      let hasCorruptedData = false;
      let message = 'Keychain data is healthy';

      try {
        await this.getAccessToken();
      } catch (error) {
        if (error instanceof SyntaxError) {
          hasCorruptedData = true;
          message = 'Corrupted access token data detected';
        }
      }

      try {
        await this.getRefreshToken();
      } catch (error) {
        if (error instanceof SyntaxError) {
          hasCorruptedData = true;
          message = 'Corrupted refresh token data detected';
        }
      }

      if (hasCorruptedData) {
        await this.clearCorruptedData();
        message = 'Corrupted data cleared, user will need to login again';
        return { hasCorruptedData: true, repaired: true, message };
      }

      return { hasCorruptedData: false, repaired: false, message };
    } catch (error) {
      logger.error('Error checking keychain integrity', 'AUTH', error);
      return {
        hasCorruptedData: true,
        repaired: false,
        message: 'Error checking keychain integrity',
      };
    }
  }

  /**
   * Remove access token
   */
  async removeAccessToken(): Promise<void> {
    try {
      await keychainStorage.removeAccessToken();
    } catch (error) {
      logger.error('Error removing access token', 'AUTH', error);
    }
  }

  /**
   * Remove refresh token
   */
  async removeRefreshToken(): Promise<void> {
    try {
      await keychainStorage.removeRefreshToken();
    } catch (error) {
      logger.error('Error removing refresh token', 'AUTH', error);
    }
  }

  /**
   * Make authenticated API request
   */
  async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getValidAccessToken();
      if (!token) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      // Prepare headers - skip Authorization for mock tokens
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };

      // Always add Authorization header for real authentication
      headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          const newToken = await this.refreshAccessToken();
          if (newToken) {
            // Retry with new token
            const retryHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
              ...((options.headers as Record<string, string>) || {}),
            };

            // Always add Authorization header for real authentication
            retryHeaders.Authorization = `Bearer ${newToken}`;

            const retryResponse = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
              ...options,
              headers: retryHeaders,
            });

            if (!retryResponse.ok) {
              await this.logout();
              return {
                success: false,
                error: 'Authentication expired',
              };
            }

            const data = await retryResponse.json();
            return { success: true, data };
          } else {
            await this.logout();
            return {
              success: false,
              error: 'Authentication expired',
            };
          }
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      logger.error('API request error', 'AUTH', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Export initializeAuth function for App.tsx
export const initializeAuth = async () => {
  return await authService.initializeAuth();
};

export default authService;
