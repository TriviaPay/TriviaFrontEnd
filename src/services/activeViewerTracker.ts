/**
 * Active Viewer Tracker Service
 * Professional viewer tracking - only counts users actively watching the live chat
 * Similar to YouTube Live, Twitch, etc.
 */

import { authService } from './authService';
import { apiService } from './apiService';

interface ViewerSession {
  userId: string;
  sessionId: number;
  lastSeen: number;
  isActive: boolean;
}

class ActiveViewerTrackerService {
  private sessionId: number = 1;
  private userId: string = '';
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private viewerTrackingInterval: NodeJS.Timeout | null = null;
  private isTracking: boolean = false;
  private lastHeartbeat: number = 0;
  private lastViewerCount: number = 0;
  private readonly HEARTBEAT_INTERVAL = 120000; // 2 minutes - much less frequent to reduce API calls
  private readonly INACTIVE_THRESHOLD = 300000; // 5 minutes
  private readonly VIEWER_TRACKING_INTERVAL = 180000; // 3 minutes - track viewer count much less frequently

  constructor() {
    this.sendHeartbeat = this.sendHeartbeat.bind(this);
  }

  /**
   * Start tracking active viewer status
   */
  async startTracking(): Promise<void> {
    try {
      // Get user ID from auth service
      const user = await authService.getCurrentUser();
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      this.userId = user.id;

      // Get session ID from live chat status
      await this.getSessionId();

      // Start heartbeat
      this.startHeartbeat();

      // Start viewer tracking
      this.startViewerTracking();

      this.isTracking = true;
    } catch (error) {
      logger.error('❌ Failed to start viewer tracking:', 'SERVICE', error);
    }
  }

  /**
   * Stop tracking active viewer status
   */
  stopTracking(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.viewerTrackingInterval) {
      clearInterval(this.viewerTrackingInterval);
      this.viewerTrackingInterval = null;
    }

    this.isTracking = false;
  }

  /**
   * Get session ID from live chat status
   */
  private async getSessionId(): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.API_BASE_URL || 'https://trivia-back-end.vercel.app'}/trivia-live-chat/status`,
        {
          headers: {
            Authorization: `Bearer ${await authService.getValidAccessToken()}`,
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        this.sessionId = data.session?.id || 1;
      }
    } catch (error) {
      logger.error('❌ Failed to get session ID for viewer tracking:', 'SERVICE', error);
      this.sessionId = 1; // Default fallback
    }
  }

  /**
   * Start heartbeat to maintain active status
   */
  private startHeartbeat(): void {
    // Send initial heartbeat
    this.sendHeartbeat();

    // Set up regular heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Start viewer tracking to monitor active viewers
   */
  private startViewerTracking(): void {
    // Track viewer count immediately
    this.trackViewerCount();

    // Set up regular viewer tracking
    this.viewerTrackingInterval = setInterval(() => {
      this.trackViewerCount();
    }, this.VIEWER_TRACKING_INTERVAL);
  }

  /**
   * Track viewer count and update if needed
   */
  private async trackViewerCount(): Promise<void> {
    try {
      // getLiveChatViewers removed - live chat no longer used
      const viewersResponse = { success: false, error: 'Endpoint removed', data: null };

      if (viewersResponse.success && viewersResponse.data) {
        const currentViewerCount = viewersResponse.data.viewer_count || 0;

        // Only log if viewer count has changed
        if (currentViewerCount !== this.lastViewerCount) {
          this.lastViewerCount = currentViewerCount;
        }
      }
    } catch (error) {
      logger.warn('⚠️ Failed to track viewer count:', 'SERVICE', error);
    }
  }

  /**
   * Update viewer tracking via existing API endpoints
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      const now = Date.now();

      // Skip if we just sent a heartbeat recently (increased threshold)
      if (now - this.lastHeartbeat < 30000) {
        return;
      }

      // Use existing live chat endpoints for viewer tracking
      try {
        // Use the viewers endpoint to maintain active status (this is the only way to track viewers)
        // getLiveChatViewers removed - live chat no longer used
        const viewersResponse = { success: false, error: 'Endpoint removed', data: null };
        if (viewersResponse.success) {
          this.lastHeartbeat = now;
        } else {
          logger.warn('⚠️ Viewer tracking failed:', 'SERVICE', viewersResponse.error);
        }
      } catch (error) {
        logger.warn('⚠️ Viewer tracking failed:', 'SERVICE', error);
      }
    } catch (error) {
      logger.error('❌ Failed to update viewer tracking:', 'SERVICE', error);
    }
  }

  /**
   * Mark user as actively viewing
   */
  async markAsActive(): Promise<void> {
    if (!this.isTracking) {
      await this.startTracking();
    }

    // Send immediate heartbeat
    await this.sendHeartbeat();
  }

  /**
   * Mark user as inactive (when they leave the screen)
   */
  async markAsInactive(): Promise<void> {
    try {
      // Try the new viewer inactive endpoint first
      try {
        const response = await apiService.markViewerInactive(this.sessionId, this.userId);

        if (response.success) {
          return;
        }
      } catch (error) {
        // If the new endpoint doesn't exist (404), fall back to existing method
      }

      // Fallback: Just log the inactive status (backend will handle cleanup based on heartbeat timeout)
    } catch (error) {
      logger.error('❌ Failed to mark user as inactive:', 'SERVICE', error);
    }
  }

  /**
   * Check if user is currently being tracked
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): number {
    return this.sessionId;
  }
}

// Export singleton instance
export const activeViewerTracker = new ActiveViewerTrackerService();
