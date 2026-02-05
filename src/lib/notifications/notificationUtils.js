export const getNotificationIcon = type => {
  switch (type) {
    case 'reward':
      return '🎁';
    case 'challenge':
      return '🏆';
    case 'social':
      return '👥';
    case 'achievement':
      return '🌟';
    case 'system':
      return '⚙️';
    default:
      return '📣';
  }
};

export const getNotificationColor = (type, isDarkMode) => {
  switch (type) {
    case 'reward':
      return isDarkMode ? '#FFD700' : '#FFC107';
    case 'challenge':
      return isDarkMode ? '#FF5722' : '#FF9800';
    case 'social':
      return isDarkMode ? '#2196F3' : '#03A9F4';
    case 'achievement':
      return isDarkMode ? '#9C27B0' : '#BA68C8';
    case 'system':
      return isDarkMode ? '#607D8B' : '#78909C';
    default:
      return isDarkMode ? '#8A7CB8' : '#9575CD';
  }
};
