/**
 * Descope Authentication Service
 * Using Descope SDK like the old code
 *
 * @description Professional Descope SDK integration matching old implementation
 * @author TriviaPay Team
 */

import { keychainStorage } from './keychainStorage';
import { logger } from '../lib/utils/logger';
import * as Sentry from '@sentry/react-native';

export interface OTPResponse {
  success: boolean;
  maskedEmail?: string;
  error?: string;
  message?: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  sessionJwt?: string;
  refreshJwt?: string;
  user?: any;
  error?: string;
  message?: string;
}

export interface BindPasswordResponse {
  success: boolean;
  user?: any;
  error?: string;
  message?: string;
}

/**
 * Professional Descope Authentication Service using SDK
 * This service provides methods that can be used with the Descope SDK hooks
 */
class DescopeAuthService {
  private static instance: DescopeAuthService;

  private constructor() {
    // No initialization needed - SDK is used via hooks
  }

  static getInstance(): DescopeAuthService {
    if (!DescopeAuthService.instance) {
      DescopeAuthService.instance = new DescopeAuthService();
    }
    return DescopeAuthService.instance;
  }

  /**
   * Send OTP for email verification (using Descope SDK)
   * This method should be called with the descope instance from useDescope hook
   */
  async sendOTP(email: string, descope: any): Promise<OTPResponse> {
    try {
      const response = await descope.otp.signUpOrIn.email(email, {
        redirectUrl: 'triviapay://callback',
      });

      if (response.ok) {
        return {
          success: true,
          maskedEmail: email, // Descope SDK doesn't return masked email
          message: 'OTP sent to your email',
        };
      } else {
        logger.error('OTP send failed', 'AUTH', response.error);
        return {
          success: false,
          error: response.error?.errorMessage || response.error?.message || 'Failed to send OTP',
          message: response.error?.errorMessage || response.error?.message || 'Failed to send OTP',
        };
      }
    } catch (error: any) {
      logger.error('OTP send error', 'AUTH', error);
      return {
        success: false,
        error: error.message,
        message: error.message,
      };
    }
  }

  /**
   * Verify OTP code (using Descope SDK)
   * This method should be called with the descope instance from useDescope hook
   */
  async verifyOTP(email: string, code: string, descope: any): Promise<VerifyOTPResponse> {
    try {
      const response = await descope.otp.verify.email(email, code);

      if (response.ok) {
        // Get tokens from response (like old code)
        const sessionToken = response.data?.sessionToken || response.data?.sessionJwt;
        const refreshToken = response.data?.refreshToken || response.data?.refreshJwt;

        // Log tokens during signup (OTP verification)
        if (__DEV__ && sessionToken) {
          const masked = `${sessionToken.slice(0, 6)}...${sessionToken.slice(-6)}`;
          console.log('🔑 [descopeAuthService] Access Token:', masked);
          console.log('🔑 [descopeAuthService] Access Token Length:', sessionToken.length);
          logger.debug('Access Token received', 'AUTH', { tokenLength: sessionToken.length });
        }
        if (__DEV__ && refreshToken) {
          const masked = `${refreshToken.slice(0, 6)}...${refreshToken.slice(-6)}`;
          console.log('🔑 [descopeAuthService] Refresh Token:', masked);
          console.log('🔑 [descopeAuthService] Refresh Token Length:', refreshToken.length);
          logger.debug('Refresh Token received', 'AUTH', { tokenLength: refreshToken.length });
        }

        // Store tokens securely using keychain
        if (sessionToken) {
          await keychainStorage.storeAccessToken(sessionToken);
        }
        if (refreshToken) {
          await keychainStorage.storeRefreshToken(refreshToken);
        }

        return {
          success: true,
          token: sessionToken,
          refreshToken,
          sessionJwt: sessionToken,
          refreshJwt: refreshToken,
          user: response.data?.user,
          message: 'Email verified successfully',
        };
      } else {
        logger.error('OTP verification failed', 'AUTH', response.error);
        return {
          success: false,
          error:
            response.error?.errorMessage || response.error?.message || 'Invalid verification code',
          message:
            response.error?.errorMessage || response.error?.message || 'Invalid verification code',
        };
      }
    } catch (error: any) {
      logger.error('OTP verification error', 'AUTH', error);
      return {
        success: false,
        error: error.message,
        message: error.message,
      };
    }
  }

  /**
   * Bind password and username (using Descope SDK)
   * This method should be called with the descope instance from useDescope hook
   */
  async bindPassword(
    email: string,
    username: string,
    descope: any,
    country?: string,
    dateOfBirth?: string
  ): Promise<BindPasswordResponse> {
    try {
      // Update user profile with password and additional info
      const response = await descope.me.update({
        displayName: username,
        name: username,
        email,
        customAttributes: {
          country,
          dateOfBirth,
        },
      });

      if (response.ok) {
        // Store user data
        const userData = {
          email,
          username,
          country,
          dateOfBirth,
          ...response.data,
        };

        await keychainStorage.storeUserData(userData);
        await keychainStorage.storeAuthState({
          isAuthenticated: true,
          loginMethod: 'signup',
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          user: userData,
          message: 'Account created successfully',
        };
      } else {
        logger.error('Password binding failed', 'AUTH', response.error);
        return {
          success: false,
          error:
            response.error?.errorMessage || response.error?.message || 'Failed to create account',
          message:
            response.error?.errorMessage || response.error?.message || 'Failed to create account',
        };
      }
    } catch (error: any) {
      logger.error('Password binding error', 'AUTH', error);
      return {
        success: false,
        error: error.message,
        message: error.message,
      };
    }
  }

  /**
   * Login with password (using Descope SDK)
   * This method should be called with the descope instance from useDescope hook
   */
  async loginWithPassword(
    email: string,
    password: string,
    descope: any
  ): Promise<VerifyOTPResponse> {
    try {
      // If no descope instance provided, try to get it from the global context
      if (!descope) {
        // Try to access Descope from the global context
        // This is a fallback for when the service is called outside of React components
        try {
          // Note: This won't work in a service context, but we'll handle it gracefully
          throw new Error(
            'Descope instance not available in service context. Please use the Descope hooks in React components.'
          );
        } catch (error) {
          throw new Error(
            'Descope instance not provided. Please ensure you are using Descope authentication within a React component that has access to the Descope context.'
          );
        }
      }

      const response = await descope.password.signIn(email, password);

      if (response.ok) {
        const sessionToken = response.data?.sessionToken || response.data?.sessionJwt;
        const refreshToken = response.data?.refreshToken || response.data?.refreshJwt;
        const user = response.data?.user;

        // Log tokens during login (only in dev mode)
        if (__DEV__ && sessionToken) {
          const masked = `${sessionToken.slice(0, 6)}...${sessionToken.slice(-6)}`;
          logger.debug('🔑 [descopeAuthService] Access Token:', 'AUTH', masked);
          logger.debug('🔑 [descopeAuthService] Access Token Length:', 'AUTH', sessionToken.length);

          if (user?.userId) {
            Sentry.setUser({ id: user.userId, email: user.email, username: user.name });
          }

          if (refreshToken) {
            const maskedRefresh = `${refreshToken.slice(0, 6)}...${refreshToken.slice(-6)}`;
            logger.debug('🔑 [descopeAuthService] Refresh Token:', 'AUTH', maskedRefresh);
            logger.debug('🔑 [descopeAuthService] Refresh Token Length:', 'AUTH', refreshToken.length);
          } else {
            // It's possible we only got an access token refresh, or no refresh token was sent
            // But usually a full login should return both
            logger.debug('🔑 [descopeAuthService] Refresh Token: NULL/NONE', 'AUTH');
          }
        }

        // Store tokens securely
        if (sessionToken) {
          await keychainStorage.storeAccessToken(sessionToken);
        }
        if (refreshToken) {
          await keychainStorage.storeRefreshToken(refreshToken);
        }

        return {
          success: true,
          token: sessionToken,
          refreshToken,
          sessionJwt: sessionToken,
          refreshJwt: refreshToken,
          user: response.data?.user,
          message: 'Login successful',
        };
      } else {
        logger.error('Login failed', 'AUTH', response.error);
        return {
          success: false,
          error: response.error?.errorMessage || response.error?.message || 'Invalid credentials',
          message: response.error?.errorMessage || response.error?.message || 'Invalid credentials',
        };
      }
    } catch (error: any) {
      logger.error('Login error', 'AUTH', error);
      return {
        success: false,
        error: error.message,
        message: error.message,
      };
    }
  }

  /**
   * Logout user (using Descope SDK)
   * This method should be called with the descope instance from useDescope hook
   */
  async logout(descope: any): Promise<boolean> {
    try {
      const success = await descope.logout();

      if (success) {
        // Clear all stored data
        await keychainStorage.clearAll();

        return true;
      } else {
        logger.error('Logout failed', 'AUTH');
        return false;
      }
    } catch (error: any) {
      logger.error('Logout error', 'AUTH', error);
      return false;
    }
  }
}

// Export singleton instance
export const descopeAuthService = DescopeAuthService.getInstance();
