/**
 * Stripe Service
 * Payment processing
 */

import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { env } from '@config/env';
import { apiClient } from './ApiClient';

class StripeService {
  /**
   * Initialize payment intent
   */
  async createPaymentIntent(amount: number, currency: string = 'usd') {
    const response = await apiClient.post<{ clientSecret: string }>('/payments/create-intent', {
      amount,
      currency,
    });

    return response.data?.clientSecret;
  }

  /**
   * Process payment
   */
  async processPayment(clientSecret: string, cardDetails: any) {
    // This would be called from a React component with useStripe hook
    // Implementation depends on UI flow
    return { success: true };
  }

  /**
   * Get publishable key
   */
  getPublishableKey(): string {
    return env.STRIPE_PUBLISHABLE_KEY;
  }
}

export const stripeService = new StripeService();
