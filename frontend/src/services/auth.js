import Auth0 from 'react-native-auth0';
import {Alert} from 'react-native';
import {
  AUTH0_CONFIG,
  AUTH0_REDIRECT_URI,
  AUTH0_LOGOUT_URI,
} from './auth0-config';
import EncryptedStorage from 'react-native-encrypted-storage';
import { store } from '../store/store';
import { resetAuthState } from '../store/authSlice';

const auth0 = new Auth0(AUTH0_CONFIG);

/**
 * Helper: handle errors for consistent error messages
 */
const handleAuthError = (error, context) => {
  console.error(`${context} error:`, error);
  const message =
    error?.error_description || error?.message || 'Authentication failed';
  Alert.alert('Error', message);
  throw new Error(message);
};

/**
 * SIGN UP
 */

export const signupUser = async email => {
  try {
    console.log('Requesting email OTP for signup...');

    await auth0.auth.passwordlessWithEmail({
      email,
      send: 'code',
    });

    console.log('OTP sent successfully. User must verify.');
    return {success: true, email};
  } catch (error) {
    console.error('Signup OTP error:', error);
    Alert.alert('Error', error.message || 'Failed to send OTP');
    throw new Error(error);
  }
};

/**
 * FETCH USER INFO from an Access Token
 */
export const getUserInfo = async accessToken => {
  try {
    console.log('Fetching user info...');
    if (!accessToken) {
      throw new Error('Access token is required');
    }
    // user profile
    return await auth0.auth.userInfo({token: accessToken});
  } catch (error) {
    handleAuthError(error, 'Get user info');
  }
};

/**
 * LOGOUT
 */
export const logoutWithAuth0 = async () => {
  try {
    console.log('Initiating logout...');
    // First clear the local storage
    await EncryptedStorage.removeItem('auth_tokens');
    
    // Then clear the Auth0 session
    await auth0.webAuth.clearSession({
      returnTo: AUTH0_LOGOUT_URI,
      federated: true,
    });
    
    console.log('Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, ensure local storage is cleared
    await EncryptedStorage.removeItem('auth_tokens');
    throw error;
  }
};

/**
 * VERIFY EMAIL CODE
 */
export const verifyEmailCode = async (email, otpCode) => {
  try {
    console.log(`Verifying OTP for ${email}...`);

    const credentials = await auth0.auth.loginWithEmail({
      email,
      code: otpCode,
    });

    console.log('OTP verification successful. Logging in...');
    return {
      accessToken: credentials.accessToken,
      idToken: credentials.idToken,
    };
  } catch (error) {
    console.error('OTP Verification Error:', error);
    Alert.alert('Error', error.message || 'Invalid OTP. Try again.');
    throw new Error(error);
  }
};
/**
 * RESEND VERIFICATION CODE
 */
export const resendVerificationCode = async email => {
  console.log(`Resending verification code to ${email}...`);
};
