export const DAILY_REWARDS = [
  { day: 1, type: 'diamond', value: 10, color: '#0066CC', claimed: false, enabled: true },
  { day: 2, type: 'diamond', value: 10, color: '#0066CC', claimed: false, enabled: false },
  { day: 3, type: 'diamond', value: 10, color: '#CC0066', claimed: false, enabled: false },
  { day: 4, type: 'diamond', value: 10, color: '#0066CC', claimed: false, enabled: false },
  { day: 5, type: 'diamond', value: 10, color: '#CC0066', claimed: false, enabled: false },
  { day: 6, type: 'diamond', value: 10, color: '#0066CC', claimed: false, enabled: false },
  { day: 7, type: 'diamonds', value: 30, color: '#CC0066', claimed: false, enabled: false },
];

export const getRewardIcon = (type: string) => {
  switch (type) {
    case 'diamond':
      return require('../../../assets/home/gem.png');
    case 'diamonds':
      return require('../../../assets/home/gem.png');
    default:
      return require('../../../assets/home/gem.png');
  }
};
