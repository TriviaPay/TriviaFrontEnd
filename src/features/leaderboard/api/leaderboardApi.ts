import { apiClient } from '@core/services';
import type { LeaderboardEntry } from '../types';

export const fetchLeaderboard = async (
  period: 'daily' | 'weekly' | 'all'
): Promise<LeaderboardEntry[]> => {
  const response = await apiClient.get<LeaderboardEntry[]>('/leaderboard', { params: { period } });
  return response.data || [];
};
