import { apiClient } from '@core/services';
import type { ShopItem } from '../types';

export const fetchShopItems = async (category?: string): Promise<ShopItem[]> => {
  const response = await apiClient.get<ShopItem[]>('/shop/items', { params: { category } });
  return response.data || [];
};

export const purchaseItem = async (itemId: string): Promise<void> => {
  await apiClient.post('/shop/purchase', { itemId });
};
