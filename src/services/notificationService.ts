/**
 * Notification Service
 * Manages in-app notifications and syncs with backend
 */

import { logger } from '../lib/utils/logger';
import { authenticatedRequest } from './api/apiclient';
import { API_CONFIG } from '../config/api';

export interface StoredNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: string;
  data?: any;
}

// In-memory storage for notifications
let notifications: StoredNotification[] = [];
const listeners: Set<(notifications: StoredNotification[]) => void> = new Set();
// Cache for unread count to avoid unnecessary API calls
let cachedUnreadCount: number | null = null;

/**
 * Add a notification to storage
 */
export const addNotification = (
  notification: Omit<StoredNotification, 'read' | 'id'> & { id?: string }
): void => {
  try {
    const newNotification: StoredNotification = {
      id: notification.id || `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ...notification,
      read: false,
    };

    // Check if notification already exists (prevent duplicates)
    const exists = notifications.some(n => n.id === newNotification.id);
    if (exists) {
      logger.log('⚠️ Notification already exists, skipping:', 'NOTIFICATIONS', {
        id: newNotification.id,
      });
      return;
    }

    // Add to beginning of array (newest first)
    notifications = [newNotification, ...notifications];

    // Limit to last 100 notifications to prevent memory issues
    if (notifications.length > 100) {
      notifications = notifications.slice(0, 100);
    }

    // Notify listeners
    notifyListeners();

    logger.log('✅ Notification added:', 'NOTIFICATIONS', {
      id: newNotification.id,
      title: newNotification.title,
      total: notifications.length,
    });
  } catch (error) {
    logger.error('❌ Error adding notification:', 'NOTIFICATIONS', error);
  }
};

/**
 * Get all notifications
 */
export const getNotifications = (): StoredNotification[] => {
  return [...notifications];
};

/**
 * Mark notification as read
 */
export const markAsRead = async (id: string): Promise<void> => {
  try {
    // Update local state immediately
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1 && !notifications[index].read) {
      notifications[index].read = true;
      // Update cached unread count
      if (cachedUnreadCount !== null && cachedUnreadCount > 0) {
        cachedUnreadCount = Math.max(0, cachedUnreadCount - 1);
      }
      notifyListeners();
      logger.log('✅ Notification marked as read locally:', 'NOTIFICATIONS', { id });
    }

    // Sync with API
    try {
      // Convert string ID to number for API (API uses numeric IDs)
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        logger.warn('⚠️ Cannot mark notification as read - invalid ID format:', 'NOTIFICATIONS', {
          id,
        });
        return;
      }

      const response = await authenticatedRequest(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_READ}`,
        {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notification_ids: [numericId],
          }),
        }
      );

      if (response.ok) {
        logger.log('✅ Notification marked as read on server:', 'NOTIFICATIONS', { id });
      } else {
        logger.warn('⚠️ Failed to mark notification as read on server:', 'NOTIFICATIONS', {
          id,
          status: response.status,
        });
      }
    } catch (apiError) {
      logger.warn('⚠️ Error syncing mark as read with API:', 'NOTIFICATIONS', apiError);
    }
  } catch (error) {
    logger.error('❌ Error marking notification as read:', 'NOTIFICATIONS', error);
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (): Promise<void> => {
  try {
    // Update local state immediately
    let changed = false;
    notifications = notifications.map(n => {
      if (!n.read) {
        changed = true;
        return { ...n, read: true };
      }
      return n;
    });

    if (changed) {
      // Update cached unread count
      cachedUnreadCount = 0;
      notifyListeners();
      logger.log('✅ All notifications marked as read locally', 'NOTIFICATIONS');
    }

    // Sync with API
    try {
      const response = await authenticatedRequest(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ}`,
        {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        logger.log('✅ All notifications marked as read on server:', 'NOTIFICATIONS', data);
      } else {
        logger.warn('⚠️ Failed to mark all notifications as read on server:', 'NOTIFICATIONS', {
          status: response.status,
        });
      }
    } catch (apiError) {
      logger.warn('⚠️ Error syncing mark all as read with API:', 'NOTIFICATIONS', apiError);
    }
  } catch (error) {
    logger.error('❌ Error marking all notifications as read:', 'NOTIFICATIONS', error);
  }
};

/**
 * Remove notification
 */
export const removeNotification = async (id: string): Promise<void> => {
  try {
    // Update local state immediately
    const beforeLength = notifications.length;
    const deletedNotification = notifications.find(n => n.id === id);
    notifications = notifications.filter(n => n.id !== id);

    if (notifications.length !== beforeLength) {
      // Update cached unread count if deleted notification was unread
      if (
        deletedNotification &&
        !deletedNotification.read &&
        cachedUnreadCount !== null &&
        cachedUnreadCount > 0
      ) {
        cachedUnreadCount = Math.max(0, cachedUnreadCount - 1);
      }
      notifyListeners();
      logger.log('✅ Notification removed locally:', 'NOTIFICATIONS', { id });
    }

    // Sync with API
    try {
      // Convert string ID to number for API (API uses numeric IDs)
      const numericId = parseInt(id, 10);
      if (isNaN(numericId)) {
        logger.warn('⚠️ Cannot delete notification - invalid ID format:', 'NOTIFICATIONS', { id });
        return;
      }

      const response = await authenticatedRequest(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE}/${numericId}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (response.ok) {
        logger.log('✅ Notification deleted on server:', 'NOTIFICATIONS', { id });
      } else {
        logger.warn('⚠️ Failed to delete notification on server:', 'NOTIFICATIONS', {
          id,
          status: response.status,
        });
      }
    } catch (apiError) {
      logger.warn('⚠️ Error syncing delete with API:', 'NOTIFICATIONS', apiError);
    }
  } catch (error) {
    logger.error('❌ Error removing notification:', 'NOTIFICATIONS', error);
  }
};

/**
 * Clear all notifications
 */
export const clearAll = async (): Promise<void> => {
  try {
    // Update local state immediately
    notifications = [];
    notifyListeners();
    logger.log('✅ All notifications cleared locally', 'NOTIFICATIONS');

    // Sync with API
    try {
      const response = await authenticatedRequest(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (response.ok) {
        logger.log('✅ All notifications deleted on server', 'NOTIFICATIONS');
      } else {
        logger.warn('⚠️ Failed to delete all notifications on server:', 'NOTIFICATIONS', {
          status: response.status,
        });
      }
    } catch (apiError) {
      logger.warn('⚠️ Error syncing clear all with API:', 'NOTIFICATIONS', apiError);
    }
  } catch (error) {
    logger.error('❌ Error clearing notifications:', 'NOTIFICATIONS', error);
  }
};

/**
 * Subscribe to notification changes
 */
export const subscribe = (
  callback: (notifications: StoredNotification[]) => void
): (() => void) => {
  listeners.add(callback);
  // Immediately call with current notifications
  callback(getNotifications());

  // Return unsubscribe function
  return () => {
    listeners.delete(callback);
  };
};

/**
 * Notify all listeners
 */
const notifyListeners = (): void => {
  const currentNotifications = getNotifications();
  listeners.forEach(callback => {
    try {
      callback(currentNotifications);
    } catch (error) {
      logger.error('❌ Error in notification listener:', 'NOTIFICATIONS', error);
    }
  });
};

/**
 * Fetch notifications from API
 * This should be called when the notification popup opens
 */
export const fetchNotificationsFromAPI = async (
  limit: number = 50,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<StoredNotification[]> => {
  try {
    const endpoint = `${API_CONFIG.ENDPOINTS.NOTIFICATIONS.BASE}?limit=${limit}&offset=${offset}&unread_only=${unreadOnly}`;

    try {
      const response = await authenticatedRequest(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Handle API response format: { notifications: [], total: 0, unread_count: 0 }
        const apiNotifications = data.notifications || [];

        // Update cached unread count if provided in response
        if (typeof data.unread_count === 'number') {
          cachedUnreadCount = data.unread_count;
        }

        // Convert API notifications to our format
        const convertedNotifications: StoredNotification[] = apiNotifications.map((n: any) => ({
          id: String(n.id || `api-${Date.now()}-${Math.random()}`),
          title: n.title || 'Notification',
          message: n.body || n.message || '',
          timestamp: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
          read: n.read || false,
          type: n.type || 'system',
          data: n.data || {},
        }));

        // Replace all notifications with API data (fresh fetch)
        notifications = convertedNotifications;
        notifyListeners();
        logger.log(
          `✅ Fetched ${convertedNotifications.length} notifications from API`,
          'NOTIFICATIONS',
          {
            unread_count: cachedUnreadCount,
            total: data.total,
          }
        );

        return getNotifications();
      } else {
        logger.debug('Notifications endpoint not available (non-critical)', 'NOTIFICATIONS', {
          status: response.status,
        });
        return getNotifications();
      }
    } catch (apiError: any) {
      if (apiError.message?.includes('404') || apiError.message?.includes('Not Found')) {
        logger.debug('Notifications endpoint not implemented yet (non-critical)', 'NOTIFICATIONS');
      } else {
        logger.warn('⚠️ Error fetching notifications from API:', 'NOTIFICATIONS', apiError);
      }
      return getNotifications();
    }
  } catch (error) {
    logger.error('❌ Error in fetchNotificationsFromAPI:', 'NOTIFICATIONS', error);
    return getNotifications();
  }
};

/**
 * Get unread count
 */
export const getUnreadCount = async (): Promise<number> => {
  // Try to fetch from API first
  try {
    const response = await authenticatedRequest(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const apiUnreadCount = data.unread_count || 0;
      cachedUnreadCount = apiUnreadCount;

      // Update local notifications to match API count
      const localUnreadCount = notifications.filter(n => !n.read).length;
      if (apiUnreadCount !== localUnreadCount) {
        // Refresh notifications from API to sync
        await fetchNotificationsFromAPI();
      }
      return apiUnreadCount;
    }
  } catch (apiError) {
    logger.debug(
      '⚠️ Error fetching unread count from API, using local count:',
      'NOTIFICATIONS',
      apiError
    );
  }

  // Fallback to local count or cached count
  if (cachedUnreadCount !== null) {
    return cachedUnreadCount;
  }
  return notifications.filter(n => !n.read).length;
};

// Named exports for better TypeScript support
export {
  addNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAll,
  subscribe,
  fetchNotificationsFromAPI,
  getUnreadCount,
};

// Default export for convenience
export default {
  addNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAll,
  subscribe,
  fetchNotificationsFromAPI,
  getUnreadCount,
};
