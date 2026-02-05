import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import authService from '../services/authService';
import { logger } from '../lib/utils/logger';
import { apiClient } from '../services/api/apiclient';

interface GemPackageItem {
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

interface ShopGemPackagesState {
  items: GemPackageItem[];
  status: string;
  error: string | null;
  lastFetched: number | null;
}

// Request deduplication for gem packages
const gemPackagesInFlight = new Map<string, Promise<any>>();

// Helper function to extract image URL from description
const extractImageUrlFromDescription = (description: string): string | null => {
  if (!description || typeof description !== 'string') {
    return null;
  }

  // Look for "Image: <url>" pattern - case insensitive
  const imageMatch = description.match(/Image:\s*(https?:\/\/[^\s\)]+)/i);
  if (imageMatch && imageMatch[1]) {
    return imageMatch[1].trim();
  }

  // Also check for just a URL starting with http/https in the description
  const urlMatch = description.match(/(https?:\/\/[^\s\)]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].trim();
  }

  return null;
};

export const fetchGemPackages = createAsyncThunk(
  'gemPackages/fetchAll',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Check if there's already an in-flight request to prevent infinite loops
      const requestKey = 'gemPackages/all';
      const existingRequest = gemPackagesInFlight.get(requestKey);
      if (existingRequest) {
        return existingRequest;
      }

      // Check cache from Redux state - but always allow refetch if data is empty
      const rootState = getState() as any;
      const gemPackagesState = rootState?.gemPackages;
      const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache

      // Only use cache if we have valid data AND it's recent AND not empty
      if (
        gemPackagesState?.items &&
        Array.isArray(gemPackagesState.items) &&
        gemPackagesState.items.length > 0 &&
        gemPackagesState.status === 'succeeded'
      ) {
        // Check if cache is still fresh (within 2 minutes)
        const lastFetched = gemPackagesState.lastFetched || 0;
        const now = Date.now();
        if (lastFetched && now - lastFetched < CACHE_TTL) {
          // Cache is fresh and has data - return it
          return gemPackagesState.items;
        }
      }

      // Create the request promise
      const requestPromise = (async () => {
        try {
          // Get the access token from authService
          const finalToken = await authService.getAccessToken();

          if (!finalToken) {
            logger.warn('No authentication token found for gem packages fetch', 'SHOP');
            return [];
          }

          // Fetch gem packages from store API endpoint
          let gemPackages: any[] = [];

          try {
            const gemPackagesResponse = await apiClient.get('/store/gem-packages');
            if (gemPackagesResponse && Array.isArray(gemPackagesResponse)) {
              gemPackages = gemPackagesResponse;
            } else if (gemPackagesResponse?.data && Array.isArray(gemPackagesResponse.data)) {
              gemPackages = gemPackagesResponse.data;
            }
          } catch (gemPackagesError: any) {
            // Non-critical - log error but continue with empty array
            if (__DEV__) {
              logger.warn(
                'Error fetching gem packages (non-critical)',
                'SHOP',
                gemPackagesError?.message
              );
            }
            gemPackages = [];
          }

          if (gemPackages.length === 0) {
            logger.debug('No gem packages found', 'SHOP');
            return [];
          }

          // Transform gem packages to match ShopItem format
          const transformedGemPackages = (Array.isArray(gemPackages) ? gemPackages : [])
            .filter(item => {
              try {
                const hasId =
                  item?.id !== null && item?.id !== undefined && String(item.id).trim() !== '';
                return item && typeof item === 'object' && hasId;
              } catch (error) {
                return false;
              }
            })
            .map(item => {
              try {
                // Extract image URL from description field
                const description = item.description || '';
                const imageUrl = extractImageUrlFromDescription(description) || item.url || null;

                const itemId = item.id ? String(item.id).trim() : '';
                const gemsAmount = typeof item.gems_amount === 'number' ? item.gems_amount : 0;

                // Create name from gems amount if not provided
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
              } catch (error) {
                logger.error('Error transforming gem package item', 'SHOP', error);
                return null;
              }
            })
            .filter(item => item !== null && item.id);

          logger.debug(`Fetched ${transformedGemPackages.length} gem packages`, 'SHOP');

          return transformedGemPackages;
        } catch (error: any) {
          logger.error('Error fetching gem packages', 'SHOP', error);
          return []; // Return empty array on error, don't break UI
        } finally {
          // Remove from in-flight requests when done
          gemPackagesInFlight.delete(requestKey);
        }
      })();

      // Store the promise for deduplication
      gemPackagesInFlight.set(requestKey, requestPromise);

      return await requestPromise;
    } catch (error: any) {
      gemPackagesInFlight.delete('gemPackages/all');
      logger.error('Fetch gem packages error', 'SHOP', error);
      return []; // Return empty array on error, don't break UI
    }
  }
);

const shopGemPackagesSlice = createSlice({
  name: 'gemPackages',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
    lastFetched: null,
  } as ShopGemPackagesState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchGemPackages.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchGemPackages.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.lastFetched = Date.now();
        // Ensure payload is an array before setting, and validate items
        if (Array.isArray(action.payload)) {
          state.items = action.payload.filter(
            item => item && typeof item === 'object' && item.id && item.name
          );
        } else {
          state.items = [];
        }
      })
      .addCase(fetchGemPackages.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || 'Unknown error occurred';
        // Keep existing items if fetch fails, don't clear them
        state.items = state.items || [];
      });
  },
});

export default shopGemPackagesSlice.reducer;
