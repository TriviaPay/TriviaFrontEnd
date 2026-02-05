import { apiClient } from '@core/services';
import type { UserProfile } from '../types';

export const fetchProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/profile');
  return response.data!;
};

export const updateProfile = async (data: Partial<UserProfile>): Promise<void> => {
  await apiClient.put('/profile', data);
};
