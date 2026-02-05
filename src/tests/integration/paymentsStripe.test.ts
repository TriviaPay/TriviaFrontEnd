import { stripeService } from '../../core/services/StripeService';
import { apiClient } from '../../core/services/ApiClient';

jest.mock('../../core/services/ApiClient', () => {
  const original = jest.requireActual('../../core/services/ApiClient');
  return {
    ...original,
    apiClient: {
      post: jest.fn(),
    },
  };
});

describe('StripeService integration', () => {
  it('creates payment intent and returns client secret', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { clientSecret: 'cs_test_123' },
    });
    const cs = await stripeService.createPaymentIntent(100, 'usd');
    expect(cs).toBe('cs_test_123');
    expect(apiClient.post).toHaveBeenCalledWith('/payments/create-intent', {
      amount: 100,
      currency: 'usd',
    });
  });
});
