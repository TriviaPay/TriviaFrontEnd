/**
 * Security Module - Central Export
 * All security utilities and services
 */

// Device Security
export { deviceSecurity, default as deviceSecurityService } from './deviceSecurity';

// Console Sanitization
export {
  initializeConsoleSanitization,
  safeConsole,
  sanitizeConsoleOutput,
  default as consoleSanitizer,
} from './consoleSanitizer';

// Error Sanitization
export {
  sanitizeError,
  createSafeError,
  logErrorSafely,
  sanitizeErrorMessage,
  sanitizeStackTrace,
  default as errorSanitizer,
} from './errorSanitizer';

// Certificate Pinning
export { certificatePinning, default as certificatePinningService } from './certificatePinning';

// Input Sanitization
export {
  sanitizeString,
  sanitizeEmail,
  sanitizeUsername,
  validatePassword,
  sanitizeUrl,
  sanitizeNumber,
  sanitizeObject,
} from './inputSanitizer';

// Rate Limiting
export {
  rateLimiter,
  apiRateLimiter,
  withRateLimit,
  default as rateLimiterService,
} from './rateLimiter';

// Secure Keys
export { generateSecureKey, generateSecureServiceName, hashKey } from './secureKeys';

// Security Audit
export { securityAudit, SecurityAudit } from '../../core/security/SecurityAudit';

// Security Validator
export { securityValidator, default as securityValidatorService } from './securityValidator';

// Request Signing
export { requestSigning, default as requestSigningService } from './requestSigning';

// Import security services for initialization
import { initializeConsoleSanitization } from './consoleSanitizer';
import { certificatePinning } from './certificatePinning';
import { deviceSecurity } from './deviceSecurity';
import { securityValidator } from './securityValidator';
import { requestSigning } from './requestSigning';
import { logger } from '../utils/logger';

/**
 * Initialize all security services
 */
export async function initializeSecurity(): Promise<void> {
  try {
    // Initialize console sanitization first
    initializeConsoleSanitization();

    // Initialize request signing
    await requestSigning.initialize();

    // Initialize certificate pinning
    await certificatePinning.initialize();

    // Check device security
    const securityCheck = await deviceSecurity.checkDeviceSecurity();

    if (!securityCheck.isSecure) {
      logger.warn('Device security check completed with threats', 'SECURITY', {
        threats: securityCheck.threats,
      });
    }

    // Run security validation
    const validation = await securityValidator.validateSecurity();

    if (!validation.passed) {
      logger.warn('Security validation found issues', 'SECURITY', {
        score: validation.score,
        errors: validation.errors.length,
        warnings: validation.warnings.length,
      });
    }

    logger.info('Security services initialized', 'SECURITY', {
      securityScore: validation.score,
    });
  } catch (error) {
    logger.error('Security initialization failed', 'SECURITY', error);
    // Don't throw - allow app to continue even if security initialization fails
  }
}

// Default export with all security services
export default {
  initializeSecurity,
  deviceSecurity,
  certificatePinning,
};
