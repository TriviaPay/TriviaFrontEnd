/**
 * Session Manager Service
 * Handles session caching and prevents multiple session creation
 * Implements 1-minute session caching to match frontend behavior
 */

import { authService } from './authService';
import { logger } from '../lib/utils/logger';

export interface SessionInfo {
  id: string;
  userId?: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  lastAccessed: string;
}

export interface SessionCacheStats {
  hasCachedSession: boolean;
  cacheAge: number | null;
  activeRequests: number;
  requestCounts: { [userId: string]: number };
}

/**
 * Session Manager for preventing multiple session creation
 */
class SessionManager {
  private static instance: SessionManager;
  private sessionCache: Map<string, SessionInfo> | null = null;
  private readonly SESSION_CACHE_DURATION = 60000; // 1 minute cache
  private activeRequests: Map<string, Promise<SessionInfo>> = new Map();
  private requestCounts: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Get or create session with 1-minute caching
   * Prevents multiple rapid calls from creating additional sessions
   */
  async getOrCreateSession(userId?: string): Promise<SessionInfo | null> {
    try {
      // Check if we have a cached session
      if (this.isSessionCached(userId)) {
        return this.getCachedSession();
      }

      // Check if session request is already in progress
      if (userId && this.isRequestInProgress(userId)) {
        const activeRequest = this.getActiveRequest(userId);
        if (activeRequest) {
          return await activeRequest;
        }
      }

      // Check for too many rapid requests
      if (userId && this.isTooManyRequests(userId)) {
        logger.warn('Too many session requests, using cached session', 'SESSION');
        return this.getCachedSession();
      }

      // Increment request count
      if (userId) {
        this.incrementRequestCount(userId);
      }
      // Create session request promise
      const sessionPromise = this.createSessionInternal(userId);

      // Set as active request
      if (userId) {
        this.setActiveRequest(userId, sessionPromise);
      }

      try {
        const session = await sessionPromise;

        // Cache the session for 1 minute
        this.cacheSession(session);

        // Reset request count on success
        if (userId) {
          this.resetRequestCount(userId);
        }
        return session;
      } finally {
        // Clear active request
        if (userId) {
          this.clearActiveRequest(userId);
        }
      }
    } catch (error) {
      logger.error('Error getting or creating session', 'SESSION', error);
      return null;
    }
  }

  /**
   * Check if session is cached and still valid
   */
  private isSessionCached(userId?: string): boolean {
    if (!this.sessionCache) return false;

    const now = Date.now();
    const isExpired = now - this.getCacheTimestamp() >= this.SESSION_CACHE_DURATION;
    const isSameUser = !userId || this.sessionCache.userId === userId;

    return !isExpired && isSameUser;
  }

  /**
   * Get cached session if available
   */
  private getCachedSession(): SessionInfo | null {
    return this.sessionCache;
  }

  /**
   * Cache session data
   */
  private cacheSession(session: SessionInfo): void {
    this.sessionCache = session;
  }

  /**
   * Get cache timestamp (using session creation time)
   */
  private getCacheTimestamp(): number {
    if (!this.sessionCache) return 0;
    return new Date(this.sessionCache.createdAt).getTime();
  }

  /**
   * Check if session request is already in progress
   */
  private isRequestInProgress(userId: string): boolean {
    return this.activeRequests.has(userId);
  }

  /**
   * Get active session request
   */
  private getActiveRequest(userId: string): Promise<SessionInfo> | null {
    return this.activeRequests.get(userId) || null;
  }

  /**
   * Set active session request
   */
  private setActiveRequest(userId: string, promise: Promise<SessionInfo>): void {
    this.activeRequests.set(userId, promise);
  }

  /**
   * Clear active session request
   */
  private clearActiveRequest(userId: string): void {
    this.activeRequests.delete(userId);
  }

  /**
   * Track session request count to prevent rapid calls
   */
  private incrementRequestCount(userId: string): void {
    const count = this.requestCounts.get(userId) || 0;
    this.requestCounts.set(userId, count + 1);
  }

  /**
   * Check if too many session requests for this user
   */
  private isTooManyRequests(userId: string): boolean {
    const count = this.requestCounts.get(userId) || 0;
    return count > 3; // Max 3 session requests per user in short time
  }

  /**
   * Reset session request count
   */
  private resetRequestCount(userId: string): void {
    this.requestCounts.delete(userId);
  }

  /**
   * Internal method to create session
   */
  private async createSessionInternal(userId?: string): Promise<SessionInfo> {
    try {
      // Try to get existing session from auth service
      const existingSession = await authService.getOrCreateSession(userId);
      if (existingSession) {
        return this.transformToSessionInfo(existingSession, userId);
      }

      // Create new session
      const newSession: SessionInfo = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userId || 'anonymous',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        isActive: true,
        lastAccessed: new Date().toISOString(),
      };
      return newSession;
    } catch (error) {
      logger.error('❌ SessionManager: Error creating session:', 'SERVICE', error);
      throw error;
    }
  }

  /**
   * Transform auth service session to SessionInfo format
   */
  private transformToSessionInfo(session: any, userId?: string): SessionInfo {
    return {
      id: session.id || `session_${Date.now()}`,
      userId: userId || session.userId || 'anonymous',
      createdAt: session.createdAt || new Date().toISOString(),
      expiresAt: session.expiresAt || new Date(Date.now() + 3600000).toISOString(),
      isActive: session.isActive !== false,
      lastAccessed: new Date().toISOString(),
    };
  }

  /**
   * Clear session cache
   */
  clearSessionCache(): void {
    this.sessionCache = null;
    this.activeRequests.clear();
    this.requestCounts.clear();
  }

  /**
   * Get session cache statistics
   */
  getSessionCacheStats(): SessionCacheStats {
    const now = Date.now();
    const cacheAge = this.sessionCache ? now - this.getCacheTimestamp() : null;

    return {
      hasCachedSession: !!this.sessionCache,
      cacheAge,
      activeRequests: this.activeRequests.size,
      requestCounts: Object.fromEntries(this.requestCounts.entries()),
    };
  }

  /**
   * Force refresh session (bypass cache)
   */
  async forceRefreshSession(userId?: string): Promise<SessionInfo | null> {
    try {
      // Clear existing cache
      this.clearSessionCache();

      // Create new session
      const session = await this.createSessionInternal(userId);

      // Cache the new session
      this.cacheSession(session);
      return session;
    } catch (error) {
      logger.error('❌ SessionManager: Error force refreshing session:', 'SERVICE', error);
      return null;
    }
  }

  /**
   * Check if session is valid
   */
  isSessionValid(session: SessionInfo): boolean {
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    return session.isActive && now < expiresAt;
  }

  /**
   * Get current session info
   */
  getCurrentSession(): SessionInfo | null {
    return this.sessionCache;
  }

  /**
   * Update session last accessed time
   */
  updateSessionAccess(): void {
    if (this.sessionCache) {
      this.sessionCache.lastAccessed = new Date().toISOString();
    }
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
export default sessionManager;
