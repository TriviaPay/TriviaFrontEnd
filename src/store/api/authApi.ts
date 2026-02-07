import { baseApi } from './baseApi';

/**
 * Auth API endpoints
 * Handles authentication operations
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    // Login
    login: builder.mutation<
      { success: boolean; user: any; token: string; refreshToken?: string },
      { email: string; password: string }
    >({
      query: credentials => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth', 'Profile'],
    }),

    // Signup
    signup: builder.mutation<
      { success: boolean; user: any; token: string },
      { email: string; password: string; username: string }
    >({
      query: data => ({
        url: '/auth/signup',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    // Refresh token
    refreshToken: builder.mutation<{ success: boolean; token: string }, { refreshToken: string }>({
      query: data => ({
        url: '/auth/refresh',
        method: 'POST',
        body: data,
      }),
    }),

    // Logout
    logout: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'Profile', 'Trivia', 'Chat', 'Wallet'],
    }),

    // Validate session
    validateSession: builder.query<{ valid: boolean; user?: any }, void>({
      query: () => '/auth/validate',
      providesTags: ['Auth'],
      keepUnusedDataFor: 300, // Cache for 5 minutes
    }),
  }),
});

export const {
  useLoginMutation,
  useSignupMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useValidateSessionQuery,
} = authApi;
