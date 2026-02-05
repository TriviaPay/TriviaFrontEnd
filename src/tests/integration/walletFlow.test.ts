import {
  fetchTransactions,
  requestWithdrawal,
  purchaseCoins,
} from '../../features/wallet/api/walletApi';
import { apiClient } from '../../core/services/ApiClient';
import { API_CONFIG } from '../../config/api';

jest.mock('../../core/services/ApiClient', () => {
  const original = jest.requireActual('../../core/services/ApiClient');
  return {
    ...original,
    apiClient: {
      post: jest.fn(),
      get: jest.fn(),
    },
  };
});

describe('Wallet API integration', () => {
  it('fetches transactions', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      success: true,
      data: [{ id: 'tx1', amount: 10 }],
    });
    const txs = await fetchTransactions();
    expect(txs.length).toBe(1);
  });

  it('requests withdrawal', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true });
    await requestWithdrawal({ amount: 100, currency: 'usd', address: 'addr' } as any);
    expect(apiClient.post).toHaveBeenCalledWith(API_CONFIG.ENDPOINTS.WALLET.WITHDRAW, {
      amount: 100,
      currency: 'usd',
      address: 'addr',
    });
  });

  it('purchases coins', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true });
    await purchaseCoins('pkg1');
    expect(apiClient.post).toHaveBeenCalledWith(API_CONFIG.ENDPOINTS.PAYMENTS.PAYMENT_SHEET, {
      topup_type: 'product',
      product_id: 'pkg1',
      currency: 'usd',
    });
  });
});
