import { baseApi } from './baseApi';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  gems: number;
  price: string | null;
  image: any;
  category: string;
  is_premium: boolean;
  badge: string | null;
  type: string;
  url?: string | null;
  image_url?: string | null;
}

export interface GemPackageItem {
  id: string;
  name: string;
  description: string;
  gems: number;
  price: string | null;
  image: any;
  url: string | null;
  image_url: string | null;
  category: string;
  type: string;
  is_premium: boolean;
  badge: string | null;
}

export interface UserGemsResponse {
  status: string;
  gems: number;
}

export interface PurchaseResponse {
  status: string;
  message: string;
  gems_spent?: number;
}

// Helper for extracting image URL from description
const extractImageUrlFromDescription = (description: string): string | null => {
  if (!description || typeof description !== 'string') return null;
  const imageMatch = description.match(/Image:\s*(https?:\/\/[^\s\)]+)/i);
  if (imageMatch && imageMatch[1]) return imageMatch[1].trim();
  const urlMatch = description.match(/(https?:\/\/[^\s\)]+)/i);
  if (urlMatch && urlMatch[1]) return urlMatch[1].trim();
  return null;
};

export const shopApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getUserGems: builder.query<number, void>({
      query: () => '/profile/gems',
      transformResponse: (response: UserGemsResponse) => response.gems,
      providesTags: ['Shop'],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),

    getCosmetics: builder.query<ShopItem[], void>({
      query: () => '/cosmetics/avatars?skip=0&limit=100',
      providesTags: ['Shop'],
      keepUnusedDataFor: 300, // Cache for 5 minutes
      transformResponse: (response: any[]) => {
        if (!Array.isArray(response)) return [];

        return response
          .filter(item => item && item.id && item.name) // Basic validation
          .map(item => {
            // Logic from shopCosmeticsSlice.ts
            const apiUrl =
              item.url ||
              item.image_url ||
              item.image?.url ||
              item.image?.uri ||
              (typeof item.image === 'string' ? item.image : null) ||
              null;
            const itemId = item.id ? String(item.id).trim() : '';
            const itemName = item.name ? String(item.name).trim() : 'Unknown Item';

            return {
              id: itemId,
              name: itemName,
              description: item.description || '',
              gems:
                typeof item.price_gems === 'number' && item.price_gems >= 0 ? item.price_gems : 0,
              price:
                item.price_usd && typeof item.price_usd === 'number' && item.price_usd > 0
                  ? item.price_usd.toFixed(2)
                  : null,
              image: apiUrl && typeof apiUrl === 'string' ? { uri: apiUrl } : null,
              url: apiUrl && typeof apiUrl === 'string' ? apiUrl : null,
              image_url: apiUrl && typeof apiUrl === 'string' ? apiUrl : null,
              category: 'cosmetics',
              type: 'avatar',
              is_premium: item.is_premium === true || false,
              badge: item.is_premium === true ? 'PREMIUM' : null,
            };
          });
      },
    }),

    getGemPackages: builder.query<GemPackageItem[], void>({
      query: () => '/store/gem-packages',
      providesTags: ['Shop'],
      keepUnusedDataFor: 300, // Cache for 5 minutes
      transformResponse: (response: any[]) => {
        if (!Array.isArray(response)) return [];
        return response
          .filter(item => item && item.id)
          .map(item => {
            // Logic from shopGemPackagesSlice.ts
            const description = item.description || '';
            const imageUrl = extractImageUrlFromDescription(description) || item.url || null;
            const itemId = item.id ? String(item.id).trim() : '';
            const gemsAmount = typeof item.gems_amount === 'number' ? item.gems_amount : 0;
            const itemName = item.name || `${gemsAmount.toLocaleString()} Gems`;

            return {
              id: itemId,
              name: itemName,
              description,
              gems: gemsAmount,
              price:
                item.price_usd && typeof item.price_usd === 'number' && item.price_usd > 0
                  ? item.price_usd.toFixed(2)
                  : null,
              image: imageUrl && typeof imageUrl === 'string' ? { uri: imageUrl } : null,
              url: imageUrl && typeof imageUrl === 'string' ? imageUrl : null,
              image_url: imageUrl && typeof imageUrl === 'string' ? imageUrl : null,
              category: 'store',
              type: 'gem',
              is_premium: false,
              badge: null,
            };
          });
      },
    }),

    purchaseItem: builder.mutation<
      PurchaseResponse,
      { itemId: string; itemType: 'avatar' | 'frame'; paymentMethod?: string }
    >({
      query: ({ itemId, itemType, paymentMethod = 'gems' }) => {
        const endpoint =
          itemType === 'avatar'
            ? `/cosmetics/avatars/buy/${itemId}`
            : `/cosmetics/frames/buy/${itemId}`;
        return {
          url: `${endpoint}?payment_method=${paymentMethod}`,
          method: 'POST',
        };
      },
      invalidatesTags: ['Shop', 'Profile'], // Invalidate gems (Shop) and user profile (Profile)
    }),
  }),
});

export const {
  useGetUserGemsQuery,
  useGetCosmeticsQuery,
  useGetGemPackagesQuery,
  usePurchaseItemMutation,
} = shopApi;
