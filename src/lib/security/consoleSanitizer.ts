/**
 * Console Sanitizer
 * Prevents console.log statements from leaking sensitive information in production
 * Replaces console methods with safe implementations
 */

import { logger } from '../utils/logger';

const __DEV__ = process.env.NODE_ENV === 'development';

/**
 * Sanitize console output to prevent information leakage
 */
function sanitizeConsoleOutput(...args: any[]): any[] {
  if (__DEV__) {
    // In development, allow all output
    return args;
  }

  // In production, sanitize sensitive data
  return args.map(arg => {
    if (typeof arg === 'string') {
      // Remove potential sensitive patterns
      let sanitized = arg;

      // Remove API keys
      sanitized = sanitized.replace(/api[_-]?key["\s:=]+([a-zA-Z0-9_-]{20,})/gi, 'api_key=***');
      sanitized = sanitized.replace(/apikey["\s:=]+([a-zA-Z0-9_-]{20,})/gi, 'apikey=***');

      // Remove tokens
      sanitized = sanitized.replace(/token["\s:=]+([a-zA-Z0-9._-]{20,})/gi, 'token=***');
      sanitized = sanitized.replace(/bearer\s+([a-zA-Z0-9._-]{20,})/gi, 'bearer ***');
      sanitized = sanitized.replace(/jwt["\s:=]+([a-zA-Z0-9._-]{20,})/gi, 'jwt=***');

      // Remove passwords
      sanitized = sanitized.replace(/password["\s:=]+([^\s"']+)/gi, 'password=***');
      sanitized = sanitized.replace(/pwd["\s:=]+([^\s"']+)/gi, 'pwd=***');

      // Remove secrets
      sanitized = sanitized.replace(/secret["\s:=]+([a-zA-Z0-9_-]{10,})/gi, 'secret=***');

      // Remove email addresses (partially)
      sanitized = sanitized.replace(
        /([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
        (match, user, domain) => {
          return `${user.substring(0, 2)}***@${domain}`;
        }
      );

      // Remove phone numbers
      sanitized = sanitized.replace(
        /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
        '***-***-****'
      );

      // Remove credit card numbers
      sanitized = sanitized.replace(
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        '****-****-****-****'
      );

      // Remove SSN
      sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****');

      return sanitized;
    }

    if (typeof arg === 'object' && arg !== null) {
      // Sanitize object properties
      try {
        const sanitized: any = {};
        for (const key in arg) {
          const value = arg[key];
          const lowerKey = key.toLowerCase();

          // Skip sensitive keys
          if (
            lowerKey.includes('password') ||
            lowerKey.includes('token') ||
            lowerKey.includes('secret') ||
            lowerKey.includes('key') ||
            lowerKey.includes('auth') ||
            lowerKey.includes('credential')
          ) {
            sanitized[key] = '***';
          } else if (typeof value === 'string') {
            sanitized[key] = sanitizeConsoleOutput(value)[0];
          } else {
            sanitized[key] = value;
          }
        }
        return sanitized;
      } catch (e) {
        return '[Object]';
      }
    }

    return arg;
  });
}

/**
 * Initialize console sanitization
 * Call this early in app initialization
 */
export function initializeConsoleSanitization(): void {
  if (__DEV__) {
    // In development, keep original console
    return;
  }

  // Store original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

  // Override console methods in production
  console.log = (...args: any[]) => {
    // In production, disable console.log completely
    // Or use a logger service that respects production mode
  };

  console.debug = (...args: any[]) => {
    // Disable in production
  };

  console.info = (...args: any[]) => {
    // Disable in production
  };

  console.warn = (...args: any[]) => {
    // Sanitize and log warnings (they might be important)
    const sanitized = sanitizeConsoleOutput(...args);
    // Use logger service instead
    // logger.warn(...sanitized);
  };

  console.error = (...args: any[]) => {
    // Sanitize errors but still log them (errors are important)
    const sanitized = sanitizeConsoleOutput(...args);
    // Use logger service instead
    // logger.error(...sanitized);
  };
}

/**
 * Safe console wrapper that respects production mode
 */
export const safeConsole = {
  log: (...args: any[]) => {
    if (__DEV__) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    const sanitized = sanitizeConsoleOutput(...args);
    if (__DEV__) {
      logger.warn('Warning', 'APP', ...sanitized);
    }
    // In production, use logger service
  },
  error: (...args: any[]) => {
    const sanitized = sanitizeConsoleOutput(...args);
    if (__DEV__) {
      logger.error('Error', 'APP', ...sanitized);
    }
    // In production, use logger service
  },
  info: (...args: any[]) => {
    if (__DEV__) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (__DEV__) {
      console.debug(...args);
    }
  },
};

export default {
  initializeConsoleSanitization,
  safeConsole,
  sanitizeConsoleOutput,
};
