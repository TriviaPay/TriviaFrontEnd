import { logger } from '../lib/utils/logger';

/**
 * Legacy log utility - wraps logger for backward compatibility
 * @deprecated Use logger directly from '../lib/utils/logger'
 */
export const log = (...args: any[]) => {
  if (__DEV__) {
    logger.log(args.join(' '), 'LEGACY');
  }
};
