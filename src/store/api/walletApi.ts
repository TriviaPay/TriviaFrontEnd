import { baseApi } from './baseApi';
import { API_CONFIG } from '../../config/api';

// Types
export interface WalletBalance {
  balance_minor: number;
  balance_usd?: number;
  currency: string;
  stripe_onboarded?: boolean;
  recent_transactions?: WalletTransaction[] | null;
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

export interface StripeConnectAccountLinkRequest {
  return_url?: string;
  refresh_url?: string;
}

export interface StripeConnectAccountLinkResponse {
  url: string;
  account_id: string;
}

export interface PaymentConfig {
  publishable_key: string;
  currency?: string;
}

export interface PaymentSheetInitRequest {
  topup_type: 'wallet_topup' | 'product';
  amount_minor?: number | null;
  product_id?: string | null;
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

export const walletApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getWalletBalance: builder.query<WalletBalance, boolean | void>({
      query: (includeTransactions = false) => ({
        url: API_CONFIG.ENDPOINTS.WALLET.ME,
        params: { include_transactions: includeTransactions },
      }),
      providesTags: ['Wallet'],
    }),

    getWalletTransactions: builder.query<
      WalletTransactionsResponse,
      { page?: number; pageSize?: number } | void
    >({
      query: params => ({
        url: API_CONFIG.ENDPOINTS.WALLET.TRANSACTIONS,
        params: {
          page: params?.page || 1,
          page_size: params?.pageSize || 20,
        },
      }),
      providesTags: ['Wallet'],
    }),

    requestWithdrawal: builder.mutation<WithdrawalResponse, WithdrawalRequest>({
      query: body => ({
        url: API_CONFIG.ENDPOINTS.WALLET.WITHDRAW,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wallet'],
    }),

    createStripeConnectAccountLink: builder.mutation<
      StripeConnectAccountLinkResponse,
      StripeConnectAccountLinkRequest
    >({
      query: body => ({
        url: API_CONFIG.ENDPOINTS.STRIPE_CONNECT.CREATE_ACCOUNT_LINK,
        method: 'POST',
        params: {
          return_url: body.return_url,
          refresh_url: body.refresh_url,
        },
      }),
    }),

    refreshStripeConnectAccountLink: builder.mutation<
      StripeConnectAccountLinkResponse,
      StripeConnectAccountLinkRequest
    >({
      query: body => ({
        url: API_CONFIG.ENDPOINTS.STRIPE_CONNECT.REFRESH_ACCOUNT_LINK,
        method: 'POST',
        params: {
          return_url: body.return_url,
          refresh_url: body.refresh_url,
        },
      }),
    }),

    getPaymentConfig: builder.query<PaymentConfig, void>({
      query: () => '/api/v1/payments/config',
    }),

    initPaymentSheet: builder.mutation<PaymentSheetInitResponse, PaymentSheetInitRequest>({
      query: body => ({
        url: API_CONFIG.ENDPOINTS.PAYMENTS.PAYMENT_SHEET,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetWalletBalanceQuery,
  useGetWalletTransactionsQuery,
  useRequestWithdrawalMutation,
  useCreateStripeConnectAccountLinkMutation,
  useRefreshStripeConnectAccountLinkMutation,
  useGetPaymentConfigQuery,
  useInitPaymentSheetMutation,
} = walletApi;
