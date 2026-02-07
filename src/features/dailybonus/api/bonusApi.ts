import { apiClient } from '@core/services';
import type { DailyBonus } from '../types';

export const fetchDailyBonus = async (): Promise<DailyBonus[]> => {
  const response = await apiClient.get<DailyBonus[]>('/bonus/daily');
  return response.data || [];
};

export const claimDailyBonus = async (day: number): Promise<void> => {
  await apiClient.post('/bonus/claim', { day });
};
