import { baseApi } from './baseApi';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  country: string;
  amount_won?: number;
  profile_pic_url?: string | null;
  profile_pic_type?: 'avatar' | 'custom' | null;
  avatar_url?: string | null;
  badge_image_url?: string | null;
  level?: number;
  level_progress?: string;
  subscription_badges?: any[];
  user_id?: number; // User ID from API response (e.g., 6030295538)
}

interface LeaderboardResponse {
  draw_date: string;
  leaderboard: any[]; // Raw response
}

export const leaderboardApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getFreeLeaderboard: builder.query<LeaderboardEntry[], string>({
      query: drawDate => `/trivia/free-mode/leaderboard?draw_date=${encodeURIComponent(drawDate)}`,
      providesTags: ['Leaderboard'],
      transformResponse: (response: LeaderboardResponse) => {
        const leaderboardData = response.leaderboard || [];
        // Normalize data to match LeaderboardEntry format (copied from leaderboardSlice logic)
        return Array.isArray(leaderboardData)
          ? leaderboardData.map((entry: any, index: number) => ({
              ...entry,
              rank: entry.position || entry.rank || index + 1,
              profile_pic_url: entry.profile_pic || entry.profile_pic_url || null,
              profile_pic_type:
                entry.profile_pic_type ||
                (entry.profile_pic || entry.profile_pic_url
                  ? 'custom'
                  : entry.avatar_url
                    ? 'avatar'
                    : null),
              score: entry.amount_won || entry.amount || entry.score || 0,
              amount_won: entry.amount_won || entry.amount || entry.score || 0,
              username: entry.username || entry.name || 'Unknown',
              user_id: entry.user_id, // CRITICAL: Preserve user_id from API response for chat functionality
            }))
          : [];
      },
    }),
    getBronzeLeaderboard: builder.query<LeaderboardEntry[], string>({
      query: drawDate =>
        `/trivia/bronze-mode/leaderboard?draw_date=${encodeURIComponent(drawDate)}`,
      providesTags: ['Leaderboard'],
      transformResponse: (response: LeaderboardResponse) => {
        const leaderboardData = response.leaderboard || [];
        return Array.isArray(leaderboardData)
          ? leaderboardData.map((entry: any, index: number) => ({
              ...entry,
              rank: entry.position || entry.rank || index + 1,
              profile_pic_url: entry.profile_pic || entry.profile_pic_url || null,
              profile_pic_type:
                entry.profile_pic_type ||
                (entry.profile_pic || entry.profile_pic_url
                  ? 'custom'
                  : entry.avatar_url
                    ? 'avatar'
                    : null),
              score:
                entry.money_awarded ||
                entry.gems_awarded ||
                entry.amount_won ||
                entry.amount ||
                entry.score ||
                0,
              amount_won:
                entry.money_awarded ||
                entry.gems_awarded ||
                entry.amount_won ||
                entry.amount ||
                entry.score ||
                0,
              username: entry.username || entry.name || 'Unknown',
              user_id: entry.user_id, // CRITICAL: Preserve user_id from API response for chat functionality
            }))
          : [];
      },
    }),
    getSilverLeaderboard: builder.query<LeaderboardEntry[], string>({
      query: drawDate =>
        `/trivia/silver-mode/leaderboard?draw_date=${encodeURIComponent(drawDate)}`,
      providesTags: ['Leaderboard'],
      transformResponse: (response: LeaderboardResponse) => {
        const leaderboardData = response.leaderboard || [];
        return Array.isArray(leaderboardData)
          ? leaderboardData.map((entry: any, index: number) => ({
              ...entry,
              rank: entry.position || entry.rank || index + 1,
              profile_pic_url: entry.profile_pic || entry.profile_pic_url || null,
              profile_pic_type:
                entry.profile_pic_type ||
                (entry.profile_pic || entry.profile_pic_url
                  ? 'custom'
                  : entry.avatar_url
                    ? 'avatar'
                    : null),
              score: entry.money_awarded || entry.amount_won || entry.amount || entry.score || 0,
              amount_won:
                entry.money_awarded || entry.amount_won || entry.amount || entry.score || 0,
              username: entry.username || entry.name || 'Unknown',
              user_id: entry.user_id, // CRITICAL: Preserve user_id from API response for chat functionality
            }))
          : [];
      },
    }),
  }),
});

export const {
  useGetFreeLeaderboardQuery,
  useGetBronzeLeaderboardQuery,
  useGetSilverLeaderboardQuery,
} = leaderboardApi;
