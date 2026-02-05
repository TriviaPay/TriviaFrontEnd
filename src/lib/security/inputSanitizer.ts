/**
 * Input Sanitization Utilities
 * Prevents XSS and injection attacks
 */

/**
 * Sanitize string input - removes dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Remove script tags and event handlers
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/javascript:[^\s]*/gi, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  // Remove whitespace and convert to lowercase
  let sanitized = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }

  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>'"&]/g, '');

  return sanitized;
}

/**
 * Sanitize username input
 */
export function sanitizeUsername(username: string): string {
  if (typeof username !== 'string') {
    return '';
  }

  // Remove whitespace
  let sanitized = username.trim();

  // Only allow alphanumeric, underscore, and hyphen
  sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '');

  // Limit length
  if (sanitized.length > 30) {
    sanitized = sanitized.substring(0, 30);
  }

  return sanitized;
}

/**
 * Sanitize password input (no sanitization, just validation)
 */
export function validatePassword(password: string): boolean {
  if (typeof password !== 'string') {
    return false;
  }

  // Minimum length check
  if (password.length < 8) {
    return false;
  }

  // Maximum length check
  if (password.length > 128) {
    return false;
  }

  return true;
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  let sanitized = url.trim();

  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/^(javascript|data|vbscript):/gi, '');

  // Only allow http, https protocols
  if (!sanitized.match(/^https?:\/\//i)) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize number input
 */
export function sanitizeNumber(input: string | number): number | null {
  if (typeof input === 'number') {
    return isNaN(input) ? null : input;
  }

  if (typeof input !== 'string') {
    return null;
  }

  const num = parseFloat(input);
  return isNaN(num) ? null : num;
}

/**
 * Sanitize object - recursively sanitize all string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key] as string) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
}
