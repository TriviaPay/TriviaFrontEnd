export interface DailyBonus {
  day: number;
  reward: number;
  claimed: boolean;
  claimDate?: string;
}
