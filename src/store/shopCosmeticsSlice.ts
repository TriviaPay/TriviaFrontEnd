import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import authService from '../services/authService';
import { logger } from '../lib/utils/logger';
import { apiClient } from '../services/api/apiclient';

interface ShopItem {
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
}

interface ShopCosmeticsState {
  items: ShopItem[];
  status: string;
  error: string | null;
  lastFetched: number | null;
}

// Request deduplication for cosmetics
const cosmeticsInFlight = new Map<string, Promise<any>>();

export const fetchCosmetics = createAsyncThunk(
  'cosmetics/fetchAll',
  async (_, { rejectWithValue, getState }) => {
    try {
      // Check if there's already an in-flight request to prevent infinite loops
      const requestKey = 'cosmetics/all';
      const existingRequest = cosmeticsInFlight.get(requestKey);
      if (existingRequest) {
        return existingRequest;
      }

      // Check cache from Redux state - but always allow refetch if data is empty
      const rootState = getState() as any;
      const cosmeticsState = rootState?.cosmetics;
      const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache

      // Only use cache if we have valid data AND it's recent AND not empty
      // CRITICAL: Always fetch if items array is empty, even if status is succeeded
      if (
        cosmeticsState?.items &&
        Array.isArray(cosmeticsState.items) &&
        cosmeticsState.items.length > 0 &&
        cosmeticsState.status === 'succeeded'
      ) {
        // Check if cache is still fresh (within 2 minutes)
        const lastFetched = cosmeticsState.lastFetched || 0;
        const now = Date.now();
        if (lastFetched && now - lastFetched < CACHE_TTL) {
          // Cache is fresh and has data - return it
          return cosmeticsState.items;
        }
        // Cache is stale (older than 2 minutes) - continue to fetch fresh data
      }
      // If no items or status is not succeeded, always fetch

      // Create the request promise
      const requestPromise = (async () => {
        try {
          // Get the access token from authService
          const finalToken = await authService.getAccessToken();

          if (!finalToken) {
            logger.warn('No authentication token found for cosmetics fetch', 'SHOP');
            return [];
          }

          // Fetch both endpoints with timeout and individual error handling
          let avatars: any[] = [];
          let frames: any[] = [];

          // Fetch avatars - use profile API endpoint
          try {
            const avatarsResponse = await apiClient.get('/cosmetics/avatars?skip=0&limit=100');
            if (avatarsResponse && Array.isArray(avatarsResponse)) {
              avatars = avatarsResponse;
            } else if (avatarsResponse?.data && Array.isArray(avatarsResponse.data)) {
              avatars = avatarsResponse.data;
            }
          } catch (avatarError: any) {
            // Non-critical - avatars are optional, continue with empty array
            if (__DEV__) {
              logger.warn('Error fetching avatars (non-critical)', 'SHOP', avatarError?.message);
            }
            avatars = [];
          }

          // frames endpoint removed - skip frames fetch
          frames = [];

          // If both failed, return empty array instead of throwing
          if (avatars.length === 0 && frames.length === 0) {
            logger.debug('No avatars or frames found', 'SHOP');
            return [];
          }

          // Transform avatars with proper type tagging
          const transformedAvatars = (Array.isArray(avatars) ? avatars : [])
            .filter(item => {
              try {
                const hasId =
                  item?.id !== null && item?.id !== undefined && String(item.id).trim() !== '';
                const hasName =
                  item?.name !== null &&
                  item?.name !== undefined &&
                  String(item.name).trim() !== '';
                return item && typeof item === 'object' && hasId && hasName;
              } catch (error) {
                return false;
              }
            })
            .map(item => {
              try {
                // Extract URL from all possible fields
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
                    typeof item.price_gems === 'number' && item.price_gems >= 0
                      ? item.price_gems
                      : 0,
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
              } catch (error) {
                logger.error('Error transforming avatar item', 'SHOP', error);
                return null;
              }
            })
            .filter(item => item !== null && item.id && item.name);

          // Transform frames with proper type tagging
          const transformedFrames = (Array.isArray(frames) ? frames : [])
            .filter(item => {
              try {
                const hasId =
                  item?.id !== null && item?.id !== undefined && String(item.id).trim() !== '';
                const hasName =
                  item?.name !== null &&
                  item?.name !== undefined &&
                  String(item.name).trim() !== '';
                return item && typeof item === 'object' && hasId && hasName;
              } catch (error) {
                return false;
              }
            })
            .map(item => {
              try {
                // Extract URL from all possible fields
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
                    typeof item.price_gems === 'number' && item.price_gems >= 0
                      ? item.price_gems
                      : 0,
                  price:
                    item.price_usd && typeof item.price_usd === 'number' && item.price_usd > 0
                      ? item.price_usd.toFixed(2)
                      : null,
                  image: apiUrl && typeof apiUrl === 'string' ? { uri: apiUrl } : null,
                  url: apiUrl && typeof apiUrl === 'string' ? apiUrl : null,
                  image_url: apiUrl && typeof apiUrl === 'string' ? apiUrl : null,
                  category: 'cosmetics',
                  type: 'frame',
                  is_premium: item.is_premium === true || false,
                  badge: item.is_premium === true ? 'PREMIUM' : null,
                };
              } catch (error) {
                logger.error('Error transforming frame item', 'SHOP', error);
                return null;
              }
            })
            .filter(item => item !== null && item.id && item.name);

          // Combine transformed items
          const allItems = [...transformedAvatars, ...transformedFrames];

          logger.debug(
            `Fetched ${transformedAvatars.length} avatars and ${transformedFrames.length} frames`,
            'SHOP'
          );

          return allItems;
        } catch (error: any) {
          logger.error('Error fetching cosmetics', 'SHOP', error);
          return []; // Return empty array on error, don't break UI
        } finally {
          // Remove from in-flight requests when done
          cosmeticsInFlight.delete(requestKey);
        }
      })();

      // Store the promise for deduplication
      cosmeticsInFlight.set(requestKey, requestPromise);

      return await requestPromise;
    } catch (error: any) {
      cosmeticsInFlight.delete('cosmetics/all');
      logger.error('Fetch cosmetics error', 'SHOP', error);
      return []; // Return empty array on error, don't break UI
    }

    /* OLD DISABLED CODE - Kept for reference
    try {
    // Check if there's already an in-flight request
    const requestKey = 'cosmetics/all';
    const existingRequest = cosmeticsInFlight.get(requestKey);
    if (existingRequest) {
      return existingRequest;
    }
    
    // Create the request promise
    const requestPromise = (async () => {
      try {
        // Get the access token from authService
        const finalToken = await authService.getAccessToken();
        
        if (!finalToken) {
            throw new Error('No authentication token found');
        }

    const headers: any = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${finalToken}`
    };

    // Add timeout to prevent infinite loading - reduced to 15 seconds for faster failure
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 15000); // 15 second timeout
    });

    // Fetch avatars endpoint with timeout
    let avatarsResponse: Response | null = null;
    
    try {
    const fetchPromises = Promise.all([
        fetch('https://trivia-back-end.vercel.app/cosmetics/avatars?skip=0&limit=100', { headers })
    ]);

      const responses = await Promise.race([
        fetchPromises,
        timeoutPromise
    ]) as [Response];

      avatarsResponse = responses[0];
    } catch (fetchError: any) {
      // If fetch fails, return empty array instead of crashing
      logger.error('Error fetching cosmetics', 'SHOP', fetchError);
      // Return empty array so UI doesn't hang
      return [];
    }

    // Handle non-OK responses - don't throw, just log and continue with empty arrays
    // Suppress warnings for 404s as they're expected when endpoints don't exist
    if (!avatarsResponse || !avatarsResponse.ok) {
        if (avatarsResponse?.status !== 404) {
            logger.warn(`Avatars request failed: ${avatarsResponse?.status || 'no response'}`, 'SHOP');
        }
        // Continue with empty array instead of throwing
    }
    
    // If request failed, return empty array instead of throwing
    // Suppress warning for 404s as they're expected
    if (!avatarsResponse || !avatarsResponse.ok) {
        const is404 = avatarsResponse?.status === 404;
        if (!is404) {
            logger.warn('Cosmetics endpoint failed, returning empty array', 'SHOP');
        }
        return [];
    }

    // Parse response with error handling - never throw, always return something
    let avatars: any[] = [];
    let frames: any[] = []; // frames endpoint removed, always empty
    
    try {
      if (avatarsResponse && avatarsResponse.ok) {
      const avatarsData = await avatarsResponse.json();
      avatars = Array.isArray(avatarsData) ? avatarsData : [];
      }
    } catch (error) {
      logger.error('Error parsing avatars response', 'SHOP', error);
      avatars = []; // Continue with empty array
    }

    // Never throw - if both are invalid, return empty array
    // This prevents the app from hanging or crashing
    if (!Array.isArray(avatars) && !Array.isArray(frames)) {
        logger.warn('Invalid API response format, returning empty array', 'SHOP');
        return [];
    }

    // Transform avatars with proper type tagging
    // CRITICAL: Include ALL avatars, not just premium ones
    const transformedAvatars = (Array.isArray(avatars) ? avatars : [])
      .filter(item => {
        // Strict validation - include items with required fields (removed is_premium requirement)
        try {
          const hasId = item.id !== null && 
                 item.id !== undefined &&
                       String(item.id).trim() !== '';
          const hasName = item.name !== null && 
                 item.name !== undefined &&
                 String(item.name).trim() !== '';
          const hasUrl = !!(item.url || item.image_url || item.image?.url || item.image?.uri || (typeof item.image === 'string' ? item.image : null));
          
          const isValid = item && 
                         typeof item === 'object' &&
                         hasId &&
                         hasName;
          
          if (!isValid && __DEV__) {
            logger.warn('Avatar filtered out', 'SHOP', {
              hasId,
              hasName,
              hasUrl,
              name: item?.name,
              id: item?.id
            });
          }
          
          return isValid;
        } catch (error) {
          logger.error('Error validating avatar item', 'SHOP', error, item);
          return false;
        }
      })
      .map(item => {
        try {
          // Ensure we use the actual URL from API response - check ALL possible fields
          // CRITICAL: Check all possible URL fields to ensure we get the Lottie URL
          const apiUrl = item.url || 
                       item.image_url || 
                       item.image?.url || 
                       item.image?.uri ||
                       (typeof item.image === 'string' ? item.image : null) ||
                       null;
          
          // Safely extract item properties with defaults
          const itemId = item.id ? String(item.id).trim() : '';
          const itemName = item.name ? String(item.name).trim() : 'Unknown Item';
          
          if (apiUrl && __DEV__) {
            const urlPreview = typeof apiUrl === 'string' ? apiUrl.substring(0, 150) : String(apiUrl);
            const isLottie = urlPreview.toLowerCase().includes('.json') || urlPreview.toLowerCase().includes('lottie');
            
          } else if (!apiUrl && __DEV__) {
            logger.warn(`No URL found for avatar: ${itemName}`, 'SHOP', {
              hasUrl: !!item.url,
              hasImageUrl: !!item.image_url,
              hasImageUrlField: !!item.image?.url,
              hasImageUri: !!item.image?.uri,
              hasImageString: typeof item.image === 'string',
              itemKeys: Object.keys(item)
            });
          }
          
          return {
            id: itemId,
            name: itemName,
            description: item.description || '',
            gems: typeof item.price_gems === 'number' && item.price_gems >= 0 ? item.price_gems : 0,
            price: item.price_usd && typeof item.price_usd === 'number' && item.price_usd > 0 ? item.price_usd.toFixed(2) : null,
            image: apiUrl && typeof apiUrl === 'string' ? { uri: apiUrl } : null,
            url: apiUrl && typeof apiUrl === 'string' ? apiUrl : null,
            image_url: apiUrl && typeof apiUrl === 'string' ? apiUrl : null, // Add image_url field too
            category: 'cosmetics',
            type: 'avatar', // Properly tag as avatar
            is_premium: item.is_premium === true || false, // Keep is_premium field but don't filter by it
            badge: item.is_premium === true ? 'PREMIUM' : null
          };
        } catch (error) {
          logger.error('Error transforming avatar item', 'SHOP', error, item);
          return null; // Return null for invalid items
        }
      })
      .filter(item => item !== null && item.id && item.name); // Remove any null items from transformation errors

    // Transform frames with proper type tagging
    // CRITICAL: Include ALL frames, not just premium ones
    const transformedFrames = (Array.isArray(frames) ? frames : [])
      .filter(item => {
        // Strict validation - include items with required fields (removed is_premium requirement)
        try {
          const hasId = item.id !== null && 
                 item.id !== undefined &&
                       String(item.id).trim() !== '';
          const hasName = item.name !== null && 
                 item.name !== undefined &&
                 String(item.name).trim() !== '';
          const hasUrl = !!(item.url || item.image_url || item.image?.url || item.image?.uri || (typeof item.image === 'string' ? item.image : null));
          
          const isValid = item && 
                         typeof item === 'object' &&
                         hasId &&
                         hasName;
          
          if (!isValid && __DEV__) {
            logger.warn('Frame filtered out', 'SHOP', {
              hasId,
              hasName,
              hasUrl,
              name: item?.name,
              id: item?.id
            });
          }
          
          return isValid;
        } catch (error) {
          logger.error('Error validating frame item', 'SHOP', error, item);
          return false;
        }
      })
      .map(item => {
        try {
          // Ensure we use the actual URL from API response - check ALL possible fields
          // CRITICAL: Check all possible URL fields to ensure we get the Lottie URL
          const apiUrl = item.url || 
                       item.image_url || 
                       item.image?.url || 
                       item.image?.uri ||
                       (typeof item.image === 'string' ? item.image : null) ||
                       null;
          
          // Safely extract item properties with defaults
          const itemId = item.id ? String(item.id).trim() : '';
          const itemName = item.name ? String(item.name).trim() : 'Unknown Item';
          
          if (apiUrl && __DEV__) {
            const urlPreview = typeof apiUrl === 'string' ? apiUrl.substring(0, 150) : String(apiUrl);

          } else if (!apiUrl && __DEV__) {
            logger.warn(`No URL found for frame: ${itemName}`, 'SHOP', {
              hasUrl: !!item.url,
              hasImageUrl: !!item.image_url,
              hasImageUrlField: !!item.image?.url,
              hasImageUri: !!item.image?.uri,
              hasImageString: typeof item.image === 'string',
              itemKeys: Object.keys(item)
            });
          }
          
          return {
            id: itemId,
            name: itemName,
            description: item.description || '',
            gems: typeof item.price_gems === 'number' && item.price_gems >= 0 ? item.price_gems : 0,
            price: item.price_usd && typeof item.price_usd === 'number' && item.price_usd > 0 ? item.price_usd.toFixed(2) : null,
            image: apiUrl && typeof apiUrl === 'string' ? { uri: apiUrl } : null,
            url: apiUrl && typeof apiUrl === 'string' ? apiUrl : null,
            image_url: apiUrl && typeof apiUrl === 'string' ? apiUrl : null, // Add image_url field too
            category: 'cosmetics',
            type: 'frame', // Properly tag as frame
            is_premium: item.is_premium === true || false, // Keep is_premium field but don't filter by it
            badge: item.is_premium === true ? 'PREMIUM' : null
          };
        } catch (error) {
          logger.error('Error transforming frame item', 'SHOP', error, item);
          return null; // Return null for invalid items
        }
      })
      .filter(item => item !== null && item.id && item.name); // Remove any null items from transformation errors

    // Combine transformed items
    const allItems = [...transformedAvatars, ...transformedFrames];

    // Log summary with details
    const avatarsWithUrls = transformedAvatars.filter(item => item.url).length;
    const framesWithUrls = transformedFrames.filter(item => item.url).length;
    const avatarsLottie = transformedAvatars.filter(item => item.url && (item.url.toLowerCase().includes('.json') || item.url.toLowerCase().includes('lottie'))).length;
    const framesLottie = transformedFrames.filter(item => item.url && (item.url.toLowerCase().includes('.json') || item.url.toLowerCase().includes('lottie'))).length;

    // Log all avatar names for debugging
    if (__DEV__) {
      logger.debug('All avatars', 'SHOP', transformedAvatars.map(a => `${a.name}${a.url ? ' (has URL)' : ' (no URL)'}`));
    }
    
        return allItems;
      } finally {
        // Remove from in-flight requests when done
        cosmeticsInFlight.delete(requestKey);
      }
    })();
    
    // Store the promise for deduplication
    cosmeticsInFlight.set(requestKey, requestPromise);
    
    return await requestPromise;
    } catch (error: any) {
      cosmeticsInFlight.delete('cosmetics/all');
      logger.error('API Error', 'SHOP', error);
      return rejectWithValue(error.message || 'Failed to fetch cosmetics');
    }
    */
  }
);

const shopCosmeticsSlice = createSlice({
  name: 'cosmetics',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
    lastFetched: null,
  } as ShopCosmeticsState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchCosmetics.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCosmetics.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.lastFetched = Date.now(); // Track when data was fetched
        // Ensure payload is an array before setting, and validate items
        if (Array.isArray(action.payload)) {
          // Additional validation - filter out any invalid items
          state.items = action.payload.filter(
            item => item && typeof item === 'object' && item.id && item.name
          );
        } else {
          state.items = [];
        }
      })
      .addCase(fetchCosmetics.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || 'Unknown error occurred';
        // Keep existing items if fetch fails, don't clear them
        state.items = state.items || [];
      });
  },
});

export default shopCosmeticsSlice.reducer;
