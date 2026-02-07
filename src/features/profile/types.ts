export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  frame_url?: string;
  level: number;
  experience: number;
  totalWins: number;
  totalGamesPlayed: number;
}
