import { baseApi } from './baseApi';

/**
 * Daily Login API Response Types
 */
export interface DailyLoginStatusResponse {
  week_start_date: string;
  current_day: number;
  days_claimed: number[];
  days_remaining: number;
  total_gems_earned_this_week: number;
  day_status: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
}

export interface ClaimDailyLoginResponse {
  success: boolean;
  gems_earned: number;
  total_gems: number;
  week_start_date: string;
  current_day: number;
  days_claimed: number[];
  days_remaining: number;
}

/**
 * Daily Login API endpoints
 * Handles daily login reward operations
 */
export const dailyLoginApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    // Get daily login status
    getDailyLoginStatus: builder.query<DailyLoginStatusResponse, void>({
      query: () => ({
        url: '/daily-login',
        method: 'GET',
      }),
      providesTags: ['DailyLogin'],
      keepUnusedDataFor: 60, // Cache for 60 seconds
    }),

    // Claim daily login reward
    claimDailyLogin: builder.mutation<ClaimDailyLoginResponse, void>({
      query: () => ({
        url: '/daily-login',
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['DailyLogin', 'Wallet', 'WalletBalance'], // Invalidate daily login status and wallet balance
    }),
  }),
});

export const {
  useGetDailyLoginStatusQuery,
  useLazyGetDailyLoginStatusQuery,
  useClaimDailyLoginMutation,
} = dailyLoginApi;
