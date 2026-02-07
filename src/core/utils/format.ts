/**
 * Format Utilities
 * Common formatting functions
 */

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Format currency
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Format number with commas
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Format date
 */
export const formatDate = (date: Date | string, format: string = 'MMM DD, YYYY'): string => {
  return dayjs(date).format(format);
};

/**
 * Format relative time
 */
export const formatRelativeTime = (date: Date | string): string => {
  return dayjs(date).fromNow();
};

/**
 * Truncate string
 */
export const truncate = (str: string, length: number = 50): string => {
  if (str.length <= length) return str;
  return `${str.substring(0, length)}...`;
};

/**
 * Capitalize first letter
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
