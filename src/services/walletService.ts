/**
 * Wallet Service
 * Handles wallet operations including balance fetching and withdrawals
 */

import { authenticatedRequest } from './api/apiclient';
import { API_CONFIG } from '../config/api';
import { logger } from '../lib/utils/logger';

export interface WalletBalance {
  balance_minor: number;
  balance_usd?: number; // Optional, calculated from balance_minor if not provided
  currency: string;
  stripe_onboarded?: boolean;
  recent_transactions?: WalletTransaction[] | null;
}

export interface WithdrawalRequest {
  amount_minor: number;
  type: 'instant' | 'standard';
}

export interface WithdrawalResponse {
  success: boolean;
  withdrawal_id: number;
  amount_minor: number;
  fee_minor: number;
  status: 'pending_review' | 'processing' | 'paid' | 'failed' | 'rejected';
  new_balance_minor: number;
}

export interface StripeConnectAccountLinkResponse {
  url: string;
  account_id: string;
}

export interface WalletTransaction {
  id: number;
  kind:
    | 'deposit'
    | 'withdraw'
    | 'refund'
    | 'fee'
    | 'adjustment'
    | 'dispute_hold'
    | 'product_purchase_credit'
    | 'webhook_event';
  amount_minor: number;
  balance_before_minor: number;
  balance_after_minor: number;
  description?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
  total?: number;
  page?: number;
  page_size?: number;
}

class WalletService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * Get current wallet balance
   * This should be called after successful payment to refresh the balance
   * @param includeTransactions - Whether to include recent transactions (default: false)
   */
  async getWalletBalance(includeTransactions: boolean = false): Promise<WalletBalance> {
    try {
      // Auth guard: Check authentication before making API call
      const { store } = require('../store/store');
      const state = store.getState();
      if (!state.auth.isAuthenticated || !state.auth.token) {
        throw new Error('No authentication token available');
      }

      logger.debug('Fetching wallet balance', 'WALLET');

      let url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.WALLET.ME}`;
      if (includeTransactions) {
        url += '?include_transactions=true';
      } else {
        url += '?include_transactions=false';
      }

      const response = await authenticatedRequest(url, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || `HTTP ${response.status}`;
        logger.error(`Failed to fetch wallet balance: ${errorMessage}`, 'WALLET');
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Ensure all required fields are present
      const walletData: WalletBalance = {
        balance_minor: data.balance_minor || 0,
        balance_usd: data.balance_usd || (data.balance_minor ? data.balance_minor / 100 : 0),
        currency: data.currency || 'usd',
        stripe_onboarded: data.stripe_onboarded || false,
        recent_transactions: data.recent_transactions || null,
      };

      logger.debug(
        `Wallet balance fetched: ${walletData.balance_minor} ${walletData.currency}`,
        'WALLET'
      );
      return walletData;
    } catch (error) {
      // Suppress "No authentication token available" errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAuthError =
        errorMessage.includes('No authentication token') ||
        errorMessage.includes('Not authenticated') ||
        errorMessage.includes('401');

      if (!isAuthError) {
        logger.error('Error fetching wallet balance', 'WALLET', error);
      }
      throw error;
    }
  }

  /**
   * Request withdrawal
   * @param amountMinor - Amount to withdraw in cents
   * @param type - Withdrawal type: 'instant' (2% fee, immediate) or 'standard' (no fee, requires approval)
   */
  async requestWithdrawal(
    amountMinor: number,
    type: 'instant' | 'standard'
  ): Promise<WithdrawalResponse> {
    try {
      logger.debug(`Requesting withdrawal: ${amountMinor} ${type}`, 'WALLET');

      const requestBody: WithdrawalRequest = {
        amount_minor: amountMinor,
        type,
      };

      const response = await authenticatedRequest(
        `${this.baseUrl}${API_CONFIG.ENDPOINTS.WALLET.WITHDRAW}`,
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || `HTTP ${response.status}`;
        logger.error(`Failed to request withdrawal: ${errorMessage}`, 'WALLET');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      logger.debug(`Withdrawal requested successfully: ${data.withdrawal_id}`, 'WALLET');
      return data;
    } catch (error) {
      // Suppress "No authentication token available" errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAuthError =
        errorMessage.includes('No authentication token') ||
        errorMessage.includes('Not authenticated') ||
        errorMessage.includes('401');

      if (!isAuthError) {
        logger.error('Error requesting withdrawal', 'WALLET', error);
      }
      throw error;
    }
  }

  /**
   * Create Stripe Connect account link for onboarding
   * This is required before users can withdraw money
   * @param returnUrl - URL to redirect to after onboarding (optional)
   * @param refreshUrl - URL to redirect to if onboarding is restarted (optional)
   */
  async createStripeConnectAccountLink(
    returnUrl?: string,
    refreshUrl?: string
  ): Promise<StripeConnectAccountLinkResponse> {
    try {
      logger.debug('Creating Stripe Connect account link', 'WALLET');

      let url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STRIPE_CONNECT.CREATE_ACCOUNT_LINK}`;
      const params = new URLSearchParams();
      if (returnUrl) params.append('return_url', returnUrl);
      if (refreshUrl) params.append('refresh_url', refreshUrl);
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await authenticatedRequest(url, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage =
          errorData.message ||
          errorData.detail ||
          errorData.error?.message ||
          `HTTP ${response.status}`;

        // Extract more detailed error message if available
        if (errorData.error && typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }

        // Check if the error contains nested Stripe error information
        if (errorData.error && typeof errorData.error === 'object') {
          // Try to extract Stripe error message
          if (errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error.type && errorData.error.message) {
            errorMessage = `${errorData.error.type}: ${errorData.error.message}`;
          }
        }

        // If error message contains "Failed to create Stripe Connect account", extract the actual error
        if (errorMessage.includes('Failed to create Stripe Connect account:')) {
          const parts = errorMessage.split('Failed to create Stripe Connect account:');
          if (parts.length > 1) {
            errorMessage = parts[1].trim();
          }
        }

        logger.error(`Failed to create Stripe Connect account link: ${errorMessage}`, 'WALLET');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      logger.debug('Stripe Connect account link created successfully', 'WALLET');
      return data;
    } catch (error) {
      // Suppress "No authentication token available" errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAuthError =
        errorMessage.includes('No authentication token') ||
        errorMessage.includes('Not authenticated') ||
        errorMessage.includes('401');

      if (!isAuthError) {
        logger.error('Error creating Stripe Connect account link', 'WALLET', error);
      }
      throw error;
    }
  }

  /**
   * Refresh Stripe Connect account link for existing accounts
   * Use this when user needs to update their account information or complete onboarding
   * @param returnUrl - URL to redirect to after refresh (optional)
   * @param refreshUrl - URL to redirect to if refresh is restarted (optional)
   */
  async refreshStripeConnectAccountLink(
    returnUrl?: string,
    refreshUrl?: string
  ): Promise<StripeConnectAccountLinkResponse> {
    try {
      logger.debug('Refreshing Stripe Connect account link', 'WALLET');

      let url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.STRIPE_CONNECT.REFRESH_ACCOUNT_LINK}`;
      const params = new URLSearchParams();
      if (returnUrl) params.append('return_url', returnUrl);
      if (refreshUrl) params.append('refresh_url', refreshUrl);
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await authenticatedRequest(url, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage =
          errorData.message ||
          errorData.detail ||
          errorData.error?.message ||
          `HTTP ${response.status}`;

        // Extract more detailed error message if available
        if (errorData.error && typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }

        // Check if the error contains nested Stripe error information
        if (errorData.error && typeof errorData.error === 'object') {
          if (errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error.type && errorData.error.message) {
            errorMessage = `${errorData.error.type}: ${errorData.error.message}`;
          }
        }

        // If error message contains "Failed to create Stripe Connect account", extract the actual error
        if (errorMessage.includes('Failed to refresh Stripe Connect account link:')) {
          const parts = errorMessage.split('Failed to refresh Stripe Connect account link:');
          if (parts.length > 1) {
            errorMessage = parts[1].trim();
          }
        }

        logger.error(`Failed to refresh Stripe Connect account link: ${errorMessage}`, 'WALLET');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      logger.debug('Stripe Connect account link refreshed successfully', 'WALLET');
      return data;
    } catch (error) {
      // Suppress "No authentication token available" errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAuthError =
        errorMessage.includes('No authentication token') ||
        errorMessage.includes('Not authenticated') ||
        errorMessage.includes('401');

      if (!isAuthError) {
        logger.error('Error refreshing Stripe Connect account link', 'WALLET', error);
      }
      throw error;
    }
  }

  /**
   * Get wallet transaction history
   * @param page - Page number (optional, default: 1)
   * @param pageSize - Items per page (optional, default: 20)
   */
  async getWalletTransactions(
    page: number = 1,
    pageSize: number = 20
  ): Promise<WalletTransactionsResponse> {
    try {
      logger.debug(`Fetching wallet transactions: page ${page}, size ${pageSize}`, 'WALLET');

      let url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.WALLET.TRANSACTIONS}`;
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      url += `?${params.toString()}`;

      const response = await authenticatedRequest(url, {
        method: 'GET',
      });

      // Handle 404 gracefully - endpoint might not be implemented yet
      if (response.status === 404) {
        logger.debug('Transactions endpoint not found (404) - returning empty list', 'WALLET');
        return { transactions: [] };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || `HTTP ${response.status}`;
        logger.error(`Failed to fetch wallet transactions: ${errorMessage}`, 'WALLET');
        throw new Error(errorMessage);
      }

      const data = await response.json();
      logger.debug(
        `Wallet transactions fetched: ${data.transactions?.length || 0} transactions`,
        'WALLET'
      );

      // Handle both array response and object with transactions property
      if (Array.isArray(data)) {
        return { transactions: data };
      }
      return data;
    } catch (error: any) {
      // If it's a 404 or Not Found error, return empty array instead of throwing
      if (error.message?.includes('Not Found') || error.message?.includes('404')) {
        logger.debug('Transactions endpoint not available - returning empty list', 'WALLET');
        return { transactions: [] };
      }

      // Suppress "No authentication token available" errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAuthError =
        errorMessage.includes('No authentication token') ||
        errorMessage.includes('Not authenticated') ||
        errorMessage.includes('401');

      if (!isAuthError) {
        logger.error('Error fetching wallet transactions', 'WALLET', error);
      }
      throw error;
    }
  }
}

export const walletService = new WalletService();
