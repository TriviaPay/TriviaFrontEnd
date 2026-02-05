/**
 * useEmailVerification - Hook for email verification logic
 * Single Responsibility: Handles email verification with OTP
 */

import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Alert } from 'react-native';
import { useDescope } from '@descope/react-native-sdk';
import {
  updateProfileExtended,
  fetchProfileSummary,
  updateProfileLocal,
} from '../../store/profileSlice';
import { setUser, setToken } from '../../store/authSlice';
import { apiService } from '../../services/apiService';
import { keychainStorage } from '../../services/keychainStorage';
import { store } from '../../store/store';

interface UseEmailVerificationOptions {
  profileEmail: string;
  onEmailVerified?: (email: string) => void;
}

export const useEmailVerification = (options: UseEmailVerificationOptions) => {
  const { profileEmail, onEmailVerified } = options;
  const dispatch = useDispatch();
  const descope = useDescope();

  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [originalEmail, setOriginalEmail] = useState<string>('');
  const [emailVerificationLoading, setEmailVerificationLoading] = useState(false);
  const [emailVerificationError, setEmailVerificationError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cleanup email check timeout on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout);
      }
    };
  }, [emailCheckTimeout]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const checkEmailAvailability = useCallback(
    async (emailToCheck: string): Promise<boolean | null> => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailToCheck)) {
        setEmailAvailable(null);
        return null;
      }

      try {
        setEmailChecking(true);
        const response = await apiService.checkEmailAvailability(emailToCheck);

        if (response.success) {
          const available = response.data?.available ?? null;
          setEmailAvailable(available);
          return available;
        } else {
          setEmailAvailable(null);
          return null;
        }
      } catch (error) {
        setEmailAvailable(null);
        return null;
      } finally {
        setEmailChecking(false);
      }
    },
    []
  );

  const sendEmailOtp = useCallback(
    async (newEmail: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        setEmailVerificationError('Please enter a valid email address');
        return false;
      }

      if (newEmail === profileEmail.toLowerCase()) {
        setEmailVerificationError('Please enter a different email address');
        return false;
      }

      let emailCheckResult = emailAvailable;
      if (emailAvailable === null) {
        emailCheckResult = await checkEmailAvailability(newEmail);
      }

      if (emailCheckResult === false) {
        setEmailVerificationError('Email already exists. Please try another email.');
        return false;
      }
      if (emailCheckResult === null) {
        setEmailVerificationError('Please wait while we check your email...');
        return false;
      }

      if (!descope) {
        setEmailVerificationError('Descope SDK not ready. Please try again.');
        return false;
      }

      setEmailVerificationLoading(true);
      setEmailVerificationError(null);

      try {
        setOriginalEmail(profileEmail || '');
        setPendingEmail(newEmail);

        const response = await descope.otp.signUpOrIn.email(newEmail, {
          redirectUrl: 'triviapay://callback',
        });

        if (response.ok) {
          setEmailOtpSent(true);
          setEmailOtp('');
          setResendCountdown(60);
          Alert.alert('OTP Sent', `We've sent a verification code to ${newEmail}`);
          return true;
        } else {
          const errorMsg =
            response.error?.errorMessage ||
            response.error?.errorDescription ||
            'Failed to send OTP';
          logger.error('❌ [Profile] OTP send failed:', 'PROFILE', errorMsg);
          setEmailVerificationError(errorMsg);
          Alert.alert('Error', errorMsg);
          return false;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to send OTP';
        logger.error('❌ [Profile] OTP send error:', 'PROFILE', error);
        setEmailVerificationError(errorMsg);
        Alert.alert('Error', errorMsg);
        return false;
      } finally {
        setEmailVerificationLoading(false);
      }
    },
    [profileEmail, emailAvailable, checkEmailAvailability, descope]
  );

  const verifyEmailOtp = useCallback(
    async (code?: string) => {
      const otpCode = code || emailOtp;

      if (!otpCode || otpCode.length !== 6) {
        setEmailVerificationError('Please enter a valid 6-digit code');
        return false;
      }

      if (!pendingEmail) {
        setEmailVerificationError('No pending email to verify');
        return false;
      }

      if (!descope) {
        setEmailVerificationError('Descope SDK not ready. Please try again.');
        return false;
      }

      setEmailVerificationLoading(true);
      setEmailVerificationError(null);

      try {
        const response = await descope.otp.verify.email(pendingEmail, otpCode);

        if (response.ok) {
          const sessionToken = response.data?.sessionJwt || response.data?.sessionToken;
          const refreshToken = response.data?.refreshJwt || response.data?.refreshToken;

          if (sessionToken) {
            await keychainStorage.storeAccessToken(sessionToken);
            dispatch(setToken(sessionToken));
          }

          if (refreshToken) {
            await keychainStorage.storeRefreshToken(refreshToken);
          }

          try {
            const updateResult = await dispatch(
              updateProfileExtended({ email: pendingEmail }) as any
            );

            if (updateResult.type === 'profile/updateExtended/fulfilled') {
              const fetchResult = await dispatch(fetchProfileSummary({ forceFresh: true }) as any);

              if (fetchResult.type === 'profile/fetchSummary/fulfilled') {
                const updatedProfile = fetchResult.payload;
                const rootState = store.getState();
                const authState = (rootState as any).auth;

                if (authState?.user && updatedProfile?.email) {
                  dispatch(
                    setUser({
                      ...authState.user,
                      email: updatedProfile.email,
                    })
                  );
                }
              }

              dispatch(updateProfileLocal({ email: pendingEmail }));

              setEmailOtpSent(false);
              setEmailOtp('');
              setVerifyingEmail(false);
              setPendingEmail(null);
              setOriginalEmail('');
              setResendCountdown(0);

              if (onEmailVerified) {
                onEmailVerified(pendingEmail);
              }

              Alert.alert('Success', 'Email verified and updated successfully!');
              return true;
            } else {
              const errorMsg = updateResult.error?.message || 'Failed to update email';
              logger.error('❌ [Profile] Email update failed:', 'PROFILE', errorMsg);
              setEmailVerificationError(errorMsg);
              Alert.alert('Error', `Email verified but update failed: ${errorMsg}`);
              return false;
            }
          } catch (apiError) {
            const errorMsg =
              apiError instanceof Error ? apiError.message : 'Failed to update email';
            logger.error('❌ [Profile] Email update error:', 'PROFILE', errorMsg);
            setEmailVerificationError(errorMsg);
            Alert.alert('Error', `Email verified but update failed: ${errorMsg}`);
            return false;
          }
        } else {
          const errorMsg =
            response.error?.errorMessage ||
            response.error?.errorDescription ||
            'Invalid verification code';
          logger.error('❌ [Profile] OTP verification failed:', 'PROFILE', errorMsg);
          setEmailVerificationError(errorMsg);
          setEmailOtp('');
          Alert.alert('Error', errorMsg);
          return false;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Invalid verification code';
        logger.error('❌ [Profile] OTP verification error:', 'PROFILE', error);
        setEmailVerificationError(errorMsg);
        setEmailOtp('');
        Alert.alert('Error', errorMsg);
        return false;
      } finally {
        setEmailVerificationLoading(false);
      }
    },
    [emailOtp, pendingEmail, descope, dispatch, onEmailVerified]
  );

  const resendEmailOtp = useCallback(async () => {
    if (resendCountdown > 0) return false;
    if (pendingEmail) {
      return await sendEmailOtp(pendingEmail);
    }
    return false;
  }, [resendCountdown, pendingEmail, sendEmailOtp]);

  const cancelEmailVerification = useCallback(() => {
    setVerifyingEmail(false);
    setEmailOtpSent(false);
    setEmailOtp('');
    setPendingEmail(null);
    setOriginalEmail('');
    setEmailVerificationError(null);
    setResendCountdown(0);
  }, []);

  return {
    // State
    verifyingEmail,
    setVerifyingEmail,
    emailOtpSent,
    emailOtp,
    setEmailOtp,
    pendingEmail,
    originalEmail,
    emailVerificationLoading,
    emailVerificationError,
    resendCountdown,
    emailChecking,
    emailAvailable,
    setEmailAvailable,
    emailCheckTimeout,
    setEmailCheckTimeout,

    // Actions
    sendEmailOtp,
    verifyEmailOtp,
    resendEmailOtp,
    cancelEmailVerification,
    checkEmailAvailability,
  };
};
