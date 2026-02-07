/**
 * Authentication Constants
 * Centralized constants for authentication screens
 */

export const LOGIN_CONSTANTS = {
  TITLES: {
    WELCOME: 'Welcome Back',
    SUBTITLE: 'Sign in to your account',
    EMAIL_LABEL: 'Email or Username',
    PASSWORD_LABEL: 'Password',
    EMAIL_PLACEHOLDER: 'Enter your email or username',
    PASSWORD_PLACEHOLDER: 'Enter your password',
  },

  BUTTONS: {
    NEXT: 'Next',
    SIGN_IN: 'Sign In',
    SIGNING_IN: 'Signing In...',
    SIGN_UP: 'Sign Up',
    FORGOT_PASSWORD: 'Forgot Password?',
  },

  MESSAGES: {
    ENTER_EMAIL: 'Please enter your email',
    ENTER_VALID_EMAIL: 'Please enter a valid email address',
    ENTER_BOTH_FIELDS: 'Please enter both email and password',
    ENTER_EMAIL_FIRST: 'Please enter your email first',
    NO_ACCOUNT_FOUND: 'No Account Found',
    ACCOUNT_NOT_REGISTERED: 'This email is not registered. Would you like to create an account?',
    FORGOT_PASSWORD_TITLE: 'Forgot Password',
    FORGOT_PASSWORD_MESSAGE: 'Password reset functionality will be implemented with Descope.',
    DONT_HAVE_ACCOUNT: "Don't have an account?",
  },

  ALERT_BUTTONS: {
    CANCEL: 'Cancel',
    OK: 'OK',
    SIGN_UP: 'Sign Up',
  },

  STYLING: {
    PRIMARY_COLOR: '#6c5ce7',
    WHITE: '#ffffff',
    STATUS_BAR_COLOR: '#6c5ce7',
  },
} as const;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LOGIN_ANIMATION_CONFIG = {
  DURATION: 250,
  KEYBOARD_SCALE: 0.7,
  NORMAL_SCALE: 1,
} as const;
