/**
 * API Configuration
 * Centralized configuration for all API endpoints
 * Base URL loaded from environment variables
 */

import { ENV_CONFIG } from './env';

export const API_CONFIG = {
  BASE_URL: ENV_CONFIG.API_BASE_URL,

  ENDPOINTS: {
    AUTH: {
      CHECK_USERNAME: '/auth/check-username',
      CHECK_DESCOPE_USER: '/auth/check-descope-user',
      REFRESH: '/auth/refresh',
      PUSHER_AUTH: '/pusher/auth',
    },
    BIND_PASSWORD: '/bind-password',
    VALIDATE_REFERRAL: '/validate-referral',
    COUNTRIES: '/countries',
    DRAW: {
      NEXT: '/draw/next',
    },
    WINNERS: {
      RECENT: '/recent-winners',
    },
    TRIVIA: {
      SUBMIT: '/trivia/submit',
    },
    UTILITY: {
      HEALTH: '/health',
      CONFIG: '/config',
    },
    STATUS: {
      BASE: '/status',
      POSTS: '/status/posts',
      FEED: '/status/feed',
      VIEWS: '/status/views',
    },
    PRESENCE: {
      BASE: '/presence',
    },
    GLOBAL_CHAT: {
      MESSAGES: '/global-chat',
      SEND: '/global-chat/send',
    },
    ONESIGNAL: {
      REGISTER: '/onesignal/register',
      PLAYERS: '/onesignal/players',
    },
    PRIVATE_CHAT: {
      CONVERSATIONS: '/private-chat/conversations',
      CONVERSATION_DETAILS: '/private-chat/conversations', // /{id}
      MESSAGES: '/private-chat/conversations', // /{id}/messages
      SEND: '/private-chat/send',
      MARK_READ: '/private-chat/conversations', // /{id}/mark-read
      TYPING: '/private-chat/conversations', // /{id}/typing
      TYPING_STOP: '/private-chat/conversations', // /{id}/typing-stop
      MARK_DELIVERED: '/private-chat/messages', // /{id}/mark-delivered
      ACCEPT_REJECT: '/private-chat/accept-reject',
      BLOCK: '/private-chat/block',
      UNBLOCK: '/private-chat/block', // /{id} DELETE
      BLOCKS: '/private-chat/blocks',
    },
    CHAT_MUTE: {
      GLOBAL: '/chat-mute/global',
      PRIVATE: '/chat-mute/private', // /{userId}
      PRIVATE_LIST: '/chat-mute/private',
    },
    NOTIFICATIONS: {
      BASE: '/notifications',
      UNREAD_COUNT: '/notifications/unread-count',
      MARK_READ: '/notifications/mark-read',
      MARK_ALL_READ: '/notifications/mark-all-read',
    },
    PAYMENTS: {
      CONFIG: '/api/v1/payments/config',
      PAYMENT_SHEET: '/api/v1/payments/payment-sheet',
    },
    WALLET: {
      ME: '/api/v1/wallet/me',
      WITHDRAW: '/api/v1/wallet/withdraw',
      TRANSACTIONS: '/api/v1/wallet/transactions',
    },
    STRIPE_CONNECT: {
      CREATE_ACCOUNT_LINK: '/api/v1/stripe/connect/create-account-link',
      REFRESH_ACCOUNT_LINK: '/api/v1/stripe/connect/refresh-account-link',
      PUBLISHABLE_KEY: '/api/v1/stripe/connect/publishable-key',
    },
    STRIPE_WEBHOOK: {
      WEBHOOK: '/api/v1/stripe/webhook',
    },
  },
} as const;
