/**
 * Session Manager Hook
 * Provides session management with 1-minute caching to prevent multiple session creation
 * Matches frontend behavior for session consistency
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { sessionManager, SessionInfo } from '../services/sessionManager';

interface UseSessionManagerOptions {
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseSessionManagerResult {
  session: SessionInfo | null;
  loading: boolean;
  error: string | null;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
  isSessionValid: boolean;
  cacheStats: {
    hasCachedSession: boolean;
    cacheAge: number | null;
    activeRequests: number;
    requestCounts: { [userId: string]: number };
  };
}

/**
 * Hook for managing sessions with 1-minute caching
 * Prevents multiple rapid calls from creating additional sessions
 */
export function useSessionManager(options: UseSessionManagerOptions = {}): UseSessionManagerResult {
  const { userId, autoRefresh = false, refreshInterval = 30000 } = options;

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Get or create session with caching
   */
  const getSession = useCallback(
    async (force = false) => {
      if (!isMountedRef.current) return;

      try {
        setLoading(true);
        setError(null);
        const sessionData = await sessionManager.getOrCreateSession(userId);

        if (!isMountedRef.current) return;

        if (sessionData) {
          setSession(sessionData);
        } else {
          setError('Failed to get or create session');
          logger.error('❌ useSessionManager: Failed to get session', 'HOOK');
        }
      } catch (err) {
        if (!isMountedRef.current) return;

        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        logger.error('❌ useSessionManager: Error getting session:', 'HOOK', errorMessage);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [userId]
  );

  /**
   * Refresh session (force new session creation)
   */
  const refreshSession = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const sessionData = await sessionManager.forceRefreshSession(userId);

      if (!isMountedRef.current) return;

      if (sessionData) {
        setSession(sessionData);
      } else {
        setError('Failed to refresh session');
        logger.error('❌ useSessionManager: Failed to refresh session', 'HOOK');
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('❌ useSessionManager: Error refreshing session:', 'HOOK', errorMessage);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  /**
   * Clear session
   */
  const clearSession = useCallback(() => {
    sessionManager.clearSessionCache();
    setSession(null);
    setError(null);
  }, []);

  /**
   * Check if current session is valid
   */
  const isSessionValid = session ? sessionManager.isSessionValid(session) : false;

  /**
   * Get cache statistics
   */
  const cacheStats = sessionManager.getSessionCacheStats();

  // Initial session fetch
  useEffect(() => {
    if (isMountedRef.current) {
      getSession();
    }
  }, [getSession]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (autoRefresh && isMountedRef.current) {
      refreshTimeoutRef.current = setInterval(() => {
        if (isMountedRef.current) {
          getSession();
        }
      }, refreshInterval);

      return () => {
        if (refreshTimeoutRef.current) {
          clearInterval(refreshTimeoutRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, getSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    session,
    loading,
    error,
    refreshSession,
    clearSession,
    isSessionValid,
    cacheStats,
  };
}

/**
 * Hook for getting session without state management
 * Useful for one-time session retrieval
 */
export function useGetSession(userId?: string): {
  getSession: () => Promise<SessionInfo | null>;
  loading: boolean;
} {
  const [loading, setLoading] = useState(false);

  const getSession = useCallback(async (): Promise<SessionInfo | null> => {
    try {
      setLoading(true);
      const session = await sessionManager.getOrCreateSession(userId);
      return session;
    } catch (error) {
      logger.error('❌ useGetSession: Error getting session:', 'HOOK', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { getSession, loading };
}

export default useSessionManager;
