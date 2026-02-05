import { baseApi } from './baseApi';

// Types from profileSlice.ts
export interface Avatar {
  id: string;
  name: string;
  description?: string;
  is_premium: boolean;
  purchase_date?: string;
  url: string;
  mime_type: string;
}

export interface Frame {
  id: string;
  name: string;
  description?: string;
  is_premium: boolean;
  purchase_date?: string;
  url: string;
  mime_type: string;
}

export interface Badge {
  id: string;
  name: string;
  image_url: string;
}

export interface SubscriptionBadge {
  id: string;
  name: string;
  image_url: string;
  subscription_type: string;
  price: number;
}

export interface ProfileData {
  username: string;
  account_id: number;
  email: string;
  date_of_birth: string;
  gender: string;
  address1: string;
  address2: string;
  apt_number: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  profile_pic_url: string | null;
  profile_pic_type: 'avatar' | 'custom' | null;
  avatar: Avatar | null;
  frame: Frame | null;
  badge?: Badge | null;
  badge_id?: string | null;
  badge_image_url?: string | null;
  subscription_badges?: SubscriptionBadge[];
  total_gems?: number;
  total_trivia_coins?: number;
  level?: number;
  level_progress?: string;
  rank?: number | string;
}

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  mobile?: string;
  country_code?: string;
  email?: string;
  gender?: string;
  street_1?: string;
  street_2?: string;
  suite_or_apt_number?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  avatar_id?: string;
  frame_id?: string;
}

export interface UserProfile extends ProfileData {
  // Legacy interface compatibility if needed, but we should switch to ProfileData
}

export const profileApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getProfile: builder.query<ProfileData, void>({
      query: () => '/profile/summary',
      providesTags: ['Profile'],
      transformResponse: (response: any) => {
        // Handle wrapped response { data: ProfileData } vs direct ProfileData
        return (response?.data || response) as ProfileData;
      },
    }),
    getOwnedAvatars: builder.query<Avatar[], void>({
      query: () => '/cosmetics/avatars/owned',
      providesTags: ['Profile'],
      // Handle empty response or errors gracefully in queryFn if needed,
      // but fetchBaseQuery handles standard errors.
      // We can use transformResponse to ensure array.
      transformResponse: (response: any) => {
        if (!response) return [];
        return Array.isArray(response) ? response : response.data || [];
      },
    }),
    getOwnedFrames: builder.query<Frame[], void>({
      // Legacy implementation returns empty array, preserving that.
      // If backend has endpoint, we could use '/cosmetics/frames/owned'
      queryFn: () => ({ data: [] }),
      providesTags: ['Profile'],
    }),
    updateProfile: builder.mutation<ProfileData, ProfileUpdatePayload>({
      query: data => ({
        url: '/profile/extended-update', // Updated to match profileSlice logic
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Profile'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetProfileQuery,
  useGetOwnedAvatarsQuery,
  useGetOwnedFramesQuery,
  useUpdateProfileMutation,
} = profileApi;
