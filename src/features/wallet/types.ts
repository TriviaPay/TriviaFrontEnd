export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'win' | 'purchase';
  amount: number;
  currency: 'coins' | 'gems' | 'usd';
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  description: string;
}

export interface WithdrawalRequest {
  amount: number;
  method: 'paypal' | 'bank' | 'stripe';
  accountDetails: string;
}
