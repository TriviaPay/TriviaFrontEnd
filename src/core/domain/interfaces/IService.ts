/**
 * Service Interface
 * Base interface for application services
 */

export interface IService {
  /**
   * Initialize the service
   */
  initialize?(): Promise<void>;

  /**
   * Cleanup resources
   */
  cleanup?(): Promise<void>;
}

/**
 * Service with error handling
 */
export interface IErrorHandlingService extends IService {
  /**
   * Handle errors in a consistent way
   */
  handleError(error: unknown, context?: string): void;
}
