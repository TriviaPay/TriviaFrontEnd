/**
 * Base Service
 * Abstract base class for all services
 */

import { IService, IErrorHandlingService } from '../domain/interfaces/IService';
import { ApplicationError, ErrorCode } from '../../lib/constants/errorTypes';
import { logger } from '../../lib/utils/logger';

export abstract class BaseService implements IErrorHandlingService {
  protected initialized = false;

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.onInitialize();
      this.initialized = true;
    } catch (error) {
      this.handleError(error, 'Service initialization');
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.onCleanup();
      this.initialized = false;
    } catch (error) {
      this.handleError(error, 'Service cleanup');
    }
  }

  /**
   * Handle errors consistently
   */
  handleError(error: unknown, context?: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const contextMessage = context ? `${context}: ${errorMessage}` : errorMessage;

    logger.error(contextMessage, 'ERROR', error);

    // In production, report to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Report to Sentry or other error tracking service
      // Sentry.captureException(error, { tags: { context } });
    }
  }

  /**
   * Service-specific initialization
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Service-specific cleanup
   */
  protected abstract onCleanup(): Promise<void>;

  /**
   * Check if service is initialized
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new ApplicationError(
        ErrorCode.SERVER_ERROR,
        `${this.constructor.name} is not initialized. Call initialize() first.`
      );
    }
  }
}
