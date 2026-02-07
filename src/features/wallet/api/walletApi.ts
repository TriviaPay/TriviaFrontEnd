import { apiClient } from '@core/services';
import { API_CONFIG } from '@config/api';
import type { Transaction, WithdrawalRequest } from '../types';

export const fetchTransactions = async (): Promise<Transaction[]> => {
  const response = await apiClient.get<Transaction[]>(API_CONFIG.ENDPOINTS.WALLET.TRANSACTIONS);
  return response?.data || [];
};

export const requestWithdrawal = async (request: WithdrawalRequest): Promise<void> => {
  await apiClient.post(API_CONFIG.ENDPOINTS.WALLET.WITHDRAW, request);
};

export const purchaseCoins = async (packageId: string): Promise<void> => {
  await apiClient.post(API_CONFIG.ENDPOINTS.PAYMENTS.PAYMENT_SHEET, {
    topup_type: 'product',
    product_id: packageId,
    currency: 'usd',
  });
};
