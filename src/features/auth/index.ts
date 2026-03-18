/**
 * Auth Feature Module
 * Public API - only export what's needed outside this feature
 */

// Screens
export { default as LoginScreen } from './screens/LoginScreen';
export { default as WelcomeScreen } from './screens/WelcomeScreen';
export { default as SignupScreen } from './screens/SignupScreen';
export { default as ForgotPasswordScreen } from './screens/ForgotPasswordScreen';

// Hooks
export { useAuth } from './hooks/useAuth';

// Types (only if needed by other features)
export type { LoginCredentials, SignupData, AuthResponse } from './types';
