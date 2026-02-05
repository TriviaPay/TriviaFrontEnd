/**
 * Payment Service
 * Handles Stripe payment operations including wallet top-ups and product purchases
 */

import { authenticatedRequest } from './api/apiclient';
import { API_CONFIG } from '../config/api';
import { logger } from '../lib/utils/logger';

export interface PaymentConfig {
  publishable_key: string;
  currency?: string; // Optional, defaults to 'usd'
}

export interface PaymentSheetInitRequest {
  topup_type: 'wallet_topup' | 'product';
  amount_minor?: number | null; // Required for wallet_topup
  product_id?: string | null; // Required for product, null for wallet_topup
  currency: string;
}

export interface PaymentSheetInitResponse {
  customerId: string;
  ephemeralKeySecret: string;
  paymentIntentClientSecret: string;
  amount_minor: number;
  currency: string;
  topup_type: 'wallet_topup' | 'product';
  product_id: string | null;
}

class PaymentService {
  private baseUrl = API_CONFIG.BASE_URL;

  /**
   * Get Stripe configuration (publishable key and currency)
   * This should be called when the app starts or when entering the Payments screen
   */
  async getPaymentConfig(): Promise<PaymentConfig> {
    try {
      // Auth guard: Check authentication before making API call
      const { store } = require('../store/store');
      const state = store.getState();
      if (!state.auth.isAuthenticated || !state.auth.token) {
        logger.warn('Cannot fetch payment config - not authenticated', 'PAYMENT');
        throw new Error('No authentication token available');
      }

      logger.debug('Fetching payment config', 'PAYMENT');

      // Use the correct endpoint: /api/v1/payments/config (not Stripe Connect endpoint)
      const response = await authenticatedRequest(`${this.baseUrl}/api/v1/payments/config`, {
        method: 'GET',
      });

      if (!response.ok) {
        // Handle 404 gracefully - endpoint might not be available
        if (response.status === 404) {
          logger.warn(
            'Payment config endpoint not found (404) - Stripe may not be configured',
            'PAYMENT'
          );
          throw new Error('Payment configuration not available. Please contact support.');
        }

        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.detail || `HTTP ${response.status}`;
        logger.error(`Failed to fetch payment config: ${errorMessage}`, 'PAYMENT');
        throw new Error(`Failed to fetch payment config: ${errorMessage}`);
      }

      const data = await response.json();

      // Ensure currency is set (default to 'usd' if not provided)
      const config: PaymentConfig = {
        publishable_key: data.publishable_key,
        currency: data.currency || 'usd',
      };

      logger.debug('Payment config fetched successfully', 'PAYMENT');
      return config;
    } catch (error) {
      logger.error('Error fetching payment config', 'PAYMENT', error);
      throw error;
    }
  }

  /**
   * Initialize PaymentSheet for wallet top-up
   * @param amountMinor - Amount in cents (e.g., 1000 for $10.00)
   * @param currency - Currency code (default: "usd")
   */
  async initWalletTopup(
    amountMinor: number,
    currency: string = 'usd'
  ): Promise<PaymentSheetInitResponse> {
    try {
      logger.debug(`Initializing wallet top-up: ${amountMinor} ${currency}`, 'PAYMENT');

      // Match backend expected format exactly
      // Backend expects: { topup_type, amount_minor, currency }
      // product_id is NOT sent for wallet_topup
      const requestBody: PaymentSheetInitRequest = {
        topup_type: 'wallet_topup',
        amount_minor: amountMinor,
        currency,
      };

      const response = await authenticatedRequest(
        `${this.baseUrl}${API_CONFIG.ENDPOINTS.PAYMENTS.PAYMENT_SHEET}`,
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        // Handle 404 - endpoint might not exist
        if (response.status === 404) {
          logger.error('Payment sheet endpoint not found (404)', 'PAYMENT');
          throw new Error(
            'Payment endpoint not available. The payment-sheet endpoint may not be implemented yet. Please contact support.'
          );
        }

        const errorData = await response.json().catch(() => ({}));
        let errorMessage =
          errorData.message ||
          errorData.detail ||
          errorData.error?.message ||
          `HTTP ${response.status}`;

        // Extract nested error messages
        if (errorData.error && typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }

        logger.error(`Failed to initialize wallet top-up: ${errorMessage}`, 'PAYMENT', {
          status: response.status,
          url: `${this.baseUrl}${API_CONFIG.ENDPOINTS.PAYMENTS.PAYMENT_SHEET}`,
          errorData,
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Validate response structure matches backend format
      if (!data) {
        throw new Error('Empty response from payment service');
      }

      // Backend response format: { customerId, ephemeralKeySecret, paymentIntentClientSecret, ... }
      // Validate required fields exist
      if (!data.paymentIntentClientSecret && !data.payment_intent_client_secret) {
        throw new Error('Missing paymentIntentClientSecret in response');
      }
      if (!data.customerId && !data.customer_id) {
        throw new Error('Missing customerId in response');
      }
      if (!data.ephemeralKeySecret && !data.ephemeral_key_secret) {
        throw new Error('Missing ephemeralKeySecret in response');
      }

      // Normalize response to match expected format (handle both camelCase and snake_case)
      const normalizedData: PaymentSheetInitResponse = {
        customerId: data.customerId || data.customer_id || '',
        ephemeralKeySecret: data.ephemeralKeySecret || data.ephemeral_key_secret || '',
        paymentIntentClientSecret:
          data.paymentIntentClientSecret || data.payment_intent_client_secret || '',
        amount_minor: data.amount_minor || 0,
        currency: data.currency || 'usd',
        topup_type: data.topup_type || 'wallet_topup',
        product_id: data.product_id || null,
      };

      logger.debug('Wallet top-up initialized successfully', 'PAYMENT');
      return normalizedData;
    } catch (error) {
      logger.error('Error initializing wallet top-up', 'PAYMENT', error);
      throw error;
    }
  }

  /**
   * Initialize PaymentSheet for product purchase
   * @param productId - Product ID (e.g., "GP001", "FR001", "BD001")
   * @param currency - Currency code (default: "usd")
   */
  async initProductPurchase(
    productId: string,
    currency: string = 'usd'
  ): Promise<PaymentSheetInitResponse> {
    try {
      logger.debug(`Initializing product purchase: ${productId}`, 'PAYMENT');

      const requestBody: PaymentSheetInitRequest = {
        topup_type: 'product',
        product_id: productId,
        currency,
      };

      const response = await authenticatedRequest(
        `${this.baseUrl}${API_CONFIG.ENDPOINTS.PAYMENTS.PAYMENT_SHEET}`,
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        // Handle 404 - endpoint might not exist
        if (response.status === 404) {
          logger.error('Payment sheet endpoint not found (404)', 'PAYMENT');
          throw new Error(
            'Payment endpoint not available. The payment-sheet endpoint may not be implemented yet. Please contact support.'
          );
        }

        const errorData = await response.json().catch(() => ({}));
        let errorMessage =
          errorData.message ||
          errorData.detail ||
          errorData.error?.message ||
          `HTTP ${response.status}`;

        // Extract nested error messages
        if (errorData.error && typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }

        logger.error(`Failed to initialize product purchase: ${errorMessage}`, 'PAYMENT', {
          status: response.status,
          url: `${this.baseUrl}${API_CONFIG.ENDPOINTS.PAYMENTS.PAYMENT_SHEET}`,
          errorData,
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      logger.debug('Product purchase initialized successfully', 'PAYMENT');
      return data;
    } catch (error) {
      logger.error('Error initializing product purchase', 'PAYMENT', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
