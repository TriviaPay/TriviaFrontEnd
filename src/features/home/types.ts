/**
 * Home Feature Types
 */

export interface RecentWinner {
  mode: string;
  position: number;
  username: string;
  user_id: number;
  money_awarded: number;
  submitted_at: string;
  profile_pic: string | null;
  badge_image_url: string | null;
  avatar_url: string | null;
  subscription_badges: Array<{
    id: string;
    name: string;
    image_url: string;
    subscription_type: string;
    price: number;
  }>;
  level: number;
  level_progress: string;
  draw_date: string;
}

export interface DailyReward {
  day: number;
  reward_type: 'coins' | 'gems';
  amount: number;
  claimed: boolean;
  locked: boolean;
}

export interface UserBalance {
  coins: number;
  gems: number;
  level: number;
  experience: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

export interface SubscriptionOffer {
  id: string;
  name: string;
  price: number;
  duration: number;
  features: string[];
  image_url: string;
}
