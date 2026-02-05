export interface ShopItem {
  id: string;
  name: string;
  category: 'avatar' | 'frame' | 'gems';
  price: number;
  currency: 'coins' | 'gems';
  image_url: string;
  owned: boolean;
}
