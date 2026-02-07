/**
 * Secrets Rotation Utilities
 * Handles client-side secret rotation and token refresh
 *
 * Note: Actual secret rotation is typically handled server-side,
 * but this provides client-side utilities to handle rotation gracefully
 */

import { logger } from '../utils/logger';

interface RotationConfig {
  maxRetries: number;
  retryDelay: number;
  rotationCheckInterval: number;
}

interface RotationStatus {
  lastRotation: number | null;
  nextRotation: number | null;
  rotationInProgress: boolean;
  needsRotation: boolean;
}

/**
 * Secrets Rotation Service
 * Manages secret rotation on the client side
 */
class SecretsRotationService {
  private static instance: SecretsRotationService;
  private rotationTimer: NodeJS.Timeout | null = null;
  private config: RotationConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    rotationCheckInterval: 5 * 60 * 1000, // 5 minutes
  };
  private status: RotationStatus = {
    lastRotation: null,
    nextRotation: null,
    rotationInProgress: false,
    needsRotation: false,
  };

  private constructor() {}

  static getInstance(): SecretsRotationService {
    if (!SecretsRotationService.instance) {
      SecretsRotationService.instance = new SecretsRotationService();
    }
    return SecretsRotationService.instance;
  }

  /**
   * Initialize secrets rotation monitoring
   */
  async initialize(): Promise<void> {
    try {
      // Start periodic rotation check
      this.startRotationCheck();
    } catch (error) {
      logger.error('❌ Secrets rotation initialization failed:', 'APP', error);
    }
  }

  /**
   * Start periodic rotation check
   */
  private startRotationCheck(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    this.rotationTimer = setInterval(() => {
      this.checkRotationNeeded();
    }, this.config.rotationCheckInterval);
  }

  /**
   * Stop rotation check
   */
  stopRotationCheck(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  /**
   * Check if rotation is needed
   */
  private async checkRotationNeeded(): Promise<void> {
    try {
      // Check if tokens need refresh (handled by authService)
      const { authService } = require('../../services/authService');
      const isTokenExpiringSoon = await authService.isTokenExpiringSoon();

      if (isTokenExpiringSoon) {
        this.status.needsRotation = true;
        await this.rotateTokens();
      } else {
        this.status.needsRotation = false;
      }
    } catch (error) {
      logger.error('❌ Rotation check failed:', 'APP', error);
    }
  }

  /**
   * Rotate tokens (refresh access token)
   */
  async rotateTokens(): Promise<boolean> {
    if (this.status.rotationInProgress) {
      return false;
    }

    try {
      this.status.rotationInProgress = true;
      const { authService } = require('../../services/authService');
      const newToken = await authService.refreshAccessToken();

      if (newToken) {
        this.status.lastRotation = Date.now();
        this.status.rotationInProgress = false;
        this.status.needsRotation = false;
        return true;
      } else {
        this.status.rotationInProgress = false;
        logger.error('❌ Token rotation failed', 'APP');
        return false;
      }
    } catch (error) {
      this.status.rotationInProgress = false;
      logger.error('❌ Token rotation error:', 'APP', error);
      return false;
    }
  }

  /**
   * Force token rotation
   */
  async forceRotation(): Promise<boolean> {
    return await this.rotateTokens();
  }

  /**
   * Get rotation status
   */
  getStatus(): RotationStatus {
    return { ...this.status };
  }

  /**
   * Update rotation configuration
   */
  updateConfig(config: Partial<RotationConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart rotation check with new interval
    if (config.rotationCheckInterval) {
      this.startRotationCheck();
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopRotationCheck();
    this.status.rotationInProgress = false;
  }
}

// Export singleton instance
export const secretsRotation = SecretsRotationService.getInstance();

// Export types
export type { RotationConfig, RotationStatus };

export default secretsRotation;
