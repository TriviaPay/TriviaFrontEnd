/**
 * useHome Hook
 * Home screen business logic
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '@store/hooks';
import { errorHandler } from '@core/errors';
import { logger } from '@core/services';
import * as homeApi from '../api/homeApi';
import type { RecentWinner, UserBalance, Notification } from '../types';

export const useHome = () => {
  const user = useAppSelector(state => state.user.profile);
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([]);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all home data
   */
  const fetchHomeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data in parallel
      const [winnersData, balanceData, notificationsData] = await Promise.all([
        homeApi.fetchRecentWinners().catch(err => {
          const errorMessage = err?.message || String(err);
          const isAuthError =
            errorMessage.includes('No authentication token') ||
            errorMessage.includes('Not authenticated') ||
            errorMessage.includes('401');
          if (!isAuthError) {
            logger.warn('Failed to fetch winners', 'HOME', err);
          }
          return [];
        }),
        homeApi.fetchUserBalance().catch(err => {
          const errorMessage = err?.message || String(err);
          const isAuthError =
            errorMessage.includes('No authentication token') ||
            errorMessage.includes('Not authenticated') ||
            errorMessage.includes('401');
          if (!isAuthError) {
            logger.warn('Failed to fetch balance', 'HOME', err);
          }
          return null;
        }),
        homeApi.fetchNotifications().catch(err => {
          const errorMessage = err?.message || String(err);
          const isAuthError =
            errorMessage.includes('No authentication token') ||
            errorMessage.includes('Not authenticated') ||
            errorMessage.includes('401');
          if (!isAuthError) {
            logger.warn('Failed to fetch notifications', 'HOME', err);
          }
          return [];
        }),
      ]);

      setRecentWinners(winnersData);
      setBalance(balanceData);
      setNotifications(notificationsData);
    } catch (err) {
      const appError = errorHandler.handle(err);
      setError(appError.userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await homeApi.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif => (notif.id === notificationId ? { ...notif, read: true } : notif))
      );
    } catch (err) {
      logger.error('Failed to mark notification as read', 'HOME', err);
    }
  }, []);

  /**
   * Refresh data
   */
  const refresh = useCallback(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // Initial load
  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  return {
    user,
    recentWinners,
    balance,
    notifications,
    loading,
    error,
    markAsRead,
    refresh,
  };
};
