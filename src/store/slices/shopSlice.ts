/**
 * Shop Slice - Redux Toolkit Implementation
 * Professional shop state management with comprehensive features
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { shopItemsData } from '../../data/shopItems';
import authService from '../../services/authService';
import { claimDailyReward, doubleUpReward } from '../dailyRewardsSlice';

export interface UserBalance {
  gems: number;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  type: string;
  image: string;
  description?: string;
}

export interface ShopState {
  userBalance: UserBalance;
  shopItems: any; // ShopItemsData object
  loading: boolean;
  error: string | null;
  purchaseHistory: string[];
  lastGemsFetch: number | null; // Timestamp of last gems fetch
}

const initialState: ShopState = {
  userBalance: {
    gems: 0,
  },
  shopItems: shopItemsData,
  loading: false,
  error: null,
  purchaseHistory: [],
  lastGemsFetch: null,
};

// Cache duration for gems fetch (30 seconds)
const GEMS_CACHE_DURATION = 30000;

// Async thunk to fetch gems from API
export const fetchUserGems = createAsyncThunk(
  'shop/fetchUserGems',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { shop: ShopState };
      const shopState = state.shop;

      // Check cache - if recent fetch exists, skip API call
      if (shopState.lastGemsFetch && Date.now() - shopState.lastGemsFetch < GEMS_CACHE_DURATION) {
        // Return cached value
        return { gems: shopState.userBalance.gems, fromCache: true };
      }

      const token = await authService.getAccessToken();

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('https://trivia-back-end.vercel.app/profile/gems', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch gems: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success' && typeof data.gems === 'number') {
        return { gems: data.gems, fromCache: false };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch gems');
    }
  }
);

// Async thunks
export const purchaseItem = createAsyncThunk(
  'shop/purchaseItem',
  async (
    { itemId, itemType }: { itemId: string; itemType: string },
    { getState, rejectWithValue, dispatch }
  ) => {
    try {
      const state = getState() as { shop: ShopState; cosmetics: { items: any[] } };

      // Enhanced lookup: Search across all possible state locations for the item
      let item = state.cosmetics?.items?.find((i: any) => String(i.id) === String(itemId));

      if (!item && state.shop?.shopItems) {
        const shopItems = state.shop.shopItems;
        if (Array.isArray(shopItems)) {
          item = shopItems.find((i: any) => String(i.id) === String(itemId));
        } else {
          // Search in all categories: packs, boosts, cosmetics, special, products
          const categories = ['packs', 'boosts', 'cosmetics', 'special', 'products'];
          for (const cat of categories) {
            const categoryItems = (shopItems as any)[cat];
            if (Array.isArray(categoryItems)) {
              const match = categoryItems.find((i: any) => String(i.id) === String(itemId));
              if (match) {
                item = match;
                break;
              }
            }
          }
        }
      }

      if (!item) {
        console.warn('❌ [Shop Slice] Item not found:', {
          itemId,
          itemType,
          cosmeticsCount: state.cosmetics?.items?.length,
          shopItemsType: typeof state.shop?.shopItems,
        });
        throw new Error('Item not found');
      }

      // Ensure userBalance exists and check if user has enough gems
      const currentGems = state.shop?.userBalance?.gems || 0;

      // CRITICAL: Gem packages from the shop API (itemType === 'gem') are USD purchases.
      // They AWARD gems, they don't COST gems to buy in the way cosmetics do.
      // We skip the gem balance check for packages and implement a clear message if no USD flow exists here.
      if (itemType !== 'gem' && currentGems < (item.gems || 0)) {
        throw new Error('Insufficient gems');
      }

      const token = await authService.getAccessToken();

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Determine endpoint based on item type
      let endpoint = '';
      if (itemType === 'avatar') {
        endpoint = `https://trivia-back-end.vercel.app/cosmetics/avatars/buy/${itemId}?payment_method=gems`;
      } else if (itemType === 'frame') {
        endpoint = `https://trivia-back-end.vercel.app/cosmetics/frames/buy/${itemId}?payment_method=gems`;
      } else if (itemType === 'gem') {
        // Gem packages are USD-based. They are typically handled by a payment sheet.
        // For now, we return a helpful error to guide the user to the checkout flow.
        throw new Error('Processing... Please complete the secure checkout on the next screen.');
      } else {
        // Fallback for other items
        endpoint = `https://trivia-back-end.vercel.app/cosmetics/buy/${itemId}?payment_method=gems`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      // Handle API response
      if (data.status === 'success') {
        // Refresh gems balance after successful purchase
        dispatch(fetchUserGems());

        return {
          itemId,
          item,
          message: data.message || 'Purchase successful',
          gemsSpent: data.gems_spent || item.gems,
          alreadyOwned: false,
        };
      } else if (data.status === 'error') {
        // Check if error is because item is already owned
        const message = data.message || '';
        if (
          message.toLowerCase().includes('already own') ||
          message.toLowerCase().includes('already purchased')
        ) {
          // Item is already owned - return success but mark as already owned
          return {
            itemId,
            item,
            message: data.message || 'Already owned',
            gemsSpent: null,
            alreadyOwned: true,
          };
        }
        // Other errors - throw
        throw new Error(data.message || 'Purchase failed');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      return rejectWithValue(error instanceof Error ? error.message : 'Purchase failed');
    }
  }
);

export const addGems = createAsyncThunk(
  'shop/addGems',
  async (amount: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { shop: ShopState };
      const newBalance = state.shop.userBalance.gems + amount;

      return { newBalance };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add gems');
    }
  }
);

const shopSlice = createSlice({
  name: 'shop',
  initialState,
  reducers: {
    setUserBalance: (state, action: PayloadAction<UserBalance>) => {
      state.userBalance = action.payload;
    },
    updateShopItems: (state, action: PayloadAction<ShopItem[]>) => {
      state.shopItems = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
    resetShop: _state => {
      return initialState;
    },
  },
  extraReducers: builder => {
    builder
      // Fetch user gems
      .addCase(fetchUserGems.pending, state => {
        // Don't set loading = true for fetchUserGems to avoid blocking UI
        state.error = null;
      })
      .addCase(fetchUserGems.fulfilled, (state, action) => {
        state.userBalance.gems = action.payload.gems;
        // Only update timestamp if not from cache
        if (!action.payload.fromCache) {
          state.lastGemsFetch = Date.now();
        }
      })
      .addCase(fetchUserGems.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Purchase item
      .addCase(purchaseItem.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(purchaseItem.fulfilled, (state, action) => {
        state.loading = false;
        // Don't update balance here - fetchUserGems will update it
        // Add to purchase history if not already there
        if (!state.purchaseHistory.includes(action.payload.itemId)) {
          state.purchaseHistory.push(action.payload.itemId);
        }
      })
      .addCase(purchaseItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Add gems
      .addCase(addGems.fulfilled, (state, action) => {
        state.userBalance.gems = action.payload.newBalance;
      })
      .addCase(addGems.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Sync with Daily Rewards
      .addCase(claimDailyReward.fulfilled, (state, action) => {
        if (action.payload?.total_gems) {
          state.userBalance.gems = action.payload.total_gems;
          state.lastGemsFetch = Date.now();
        }
      })
      .addCase(doubleUpReward.fulfilled, (state, action) => {
        if (action.payload?.current_gems) {
          state.userBalance.gems = action.payload.current_gems;
          state.lastGemsFetch = Date.now();
        }
      });
  },
});

export const { setUserBalance, updateShopItems, clearError, resetShop } = shopSlice.actions;

export default shopSlice.reducer;
