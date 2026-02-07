/**
 * Home API
 * All home-related API calls
 */

import { apiClient } from '@core/services';
import { ApiResponse } from '@core/types';
import type {
  RecentWinner,
  DailyReward,
  UserBalance,
  Notification,
  SubscriptionOffer,
} from '../types';

/**
 * Fetch recent winners
 */
export const fetchRecentWinners = async (): Promise<RecentWinner[]> => {
  const response = await apiClient.get<RecentWinner[]>('/winners/recent');

  if (!response.success || !response.data) {
    throw new Error('Failed to fetch recent winners');
  }

  return response.data;
};

/**
 * Fetch user balance
 */
export const fetchUserBalance = async (): Promise<UserBalance> => {
  const response = await apiClient.get<UserBalance>('/user/balance');

  if (!response.success || !response.data) {
    throw new Error('Failed to fetch user balance');
  }

  return response.data;
};

/**
 * Fetch daily rewards
 */
export const fetchDailyRewards = async (): Promise<DailyReward[]> => {
  const response = await apiClient.get<DailyReward[]>('/rewards/daily');

  if (!response.success || !response.data) {
    throw new Error('Failed to fetch daily rewards');
  }

  return response.data;
};

/**
 * Fetch notifications
 */
export const fetchNotifications = async (): Promise<Notification[]> => {
  const response = await apiClient.get<Notification[]>('/notifications');

  if (!response.success || !response.data) {
    throw new Error('Failed to fetch notifications');
  }

  return response.data;
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await apiClient.post(`/notifications/${notificationId}/read`);
};

/**
 * Fetch subscription offers
 */
export const fetchSubscriptionOffers = async (): Promise<SubscriptionOffer[]> => {
  const response = await apiClient.get<SubscriptionOffer[]>('/subscriptions/offers');

  if (!response.success || !response.data) {
    throw new Error('Failed to fetch subscription offers');
  }

  return response.data;
};
