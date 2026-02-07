/**
 * Descope Configuration - Using existing setup from old TriviaPay
 * Project ID loaded from environment variables
 */
import { ENV_CONFIG } from './env';

export const DESCOPE_CONFIG = {
  projectId: ENV_CONFIG.DESCOPE_PROJECT_ID || '',
  baseUrl: 'https://api.descope.com',
  persistTokens: true,
  autoRefresh: true,
  logger: {
    level: 'error',
  },
  // Redirect URL for magic links and OAuth flows
  redirectUrl: 'triviapay://callback',

  // Session management
  sessionTokenKey: 'descope_session_token',
  refreshTokenKey: 'descope_refresh_token',
};

// Authentication steps for the signup flow
export const AUTH_STEPS = {
  EMAIL_VERIFICATION: 'email_verification',
  OTP_VERIFICATION: 'otp_verification',
  PASSWORD_SETUP: 'password_setup',
  USERNAME_SETUP: 'username_setup',
  PROFILE_SETUP: 'profile_setup',
  COMPLETED: 'completed',
} as const;

// Verification methods
export const VERIFICATION_METHODS = {
  OTP: 'otp',
  MAGIC_LINK: 'magic_link',
  PASSWORD: 'password',
} as const;

// Error messages
export const DESCOPE_ERRORS = {
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid credentials',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  INVALID_OTP: 'Invalid verification code',
  OTP_EXPIRED: 'Verification code expired',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const;

export type AuthStep = (typeof AUTH_STEPS)[keyof typeof AUTH_STEPS];
export type VerificationMethod = (typeof VERIFICATION_METHODS)[keyof typeof VERIFICATION_METHODS];
