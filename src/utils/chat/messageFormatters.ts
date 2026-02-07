/**
 * Message Formatters - Utility functions for formatting messages
 * Single Responsibility: Format dates and times for chat messages
 */

export const formatTime = (date: Date | string): string => {
  let dateObj: Date;

  if (typeof date === 'string') {
    dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      logger.warn('⚠️ [formatTime] Invalid date string:', 'CHAT', date);
      dateObj = new Date();
    }
  } else {
    dateObj = date;
  }

  const localTimeString = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return localTimeString;
};

export const formatLastSeen = (dateString: string | null | undefined): string => {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} min ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: localTimeZone,
    });
  }
};
