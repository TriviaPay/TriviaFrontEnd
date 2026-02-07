/**
 * Navigation Routes
 * Centralized route definitions
 */

export const AUTH_ROUTES = {
  WELCOME: 'Welcome',
  LOGIN: 'Login',
  SIGNUP: 'Signup',
} as const;

export const MAIN_ROUTES = {
  HOME: 'Home',
  TRIVIA: 'Trivia',
  LEADERBOARD: 'Leaderboard',
  CHAT: 'Chat',
  MORE: 'More',
} as const;

export const ROOT_ROUTES = {
  AUTH: 'Auth',
  MAIN: 'Main',
  PROFILE: 'Profile',
  WALLET: 'Wallet',
  SHOP: 'Shop',
  SETTINGS: 'Settings',
  TRIVIA_GAME: 'TriviaGame',
} as const;
