/**
 * Safe Value Utilities
 * Sanitizes API data to prevent React Native rendering crashes
 * Ensures all text and image values are in valid formats
 */

export const safeText = (value: any, fallback = ''): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
};

export const safeImageUri = (value: any): string | null => {
  if (!value) return null;

  // string
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  // { uri: string }
  if (typeof value === 'object' && typeof value.uri === 'string') {
    return value.uri.trim() || null;
  }

  // { image_url: string }
  if (typeof value === 'object' && typeof value.image_url === 'string') {
    return value.image_url.trim() || null;
  }

  return null;
};

export const isLottieFile = (url: string | null): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  const cleanUrl = lowerUrl.split('?')[0];
  return (
    cleanUrl.endsWith('.json') ||
    cleanUrl.endsWith('.lottie') ||
    cleanUrl.endsWith('.dotlottie') ||
    lowerUrl.includes('.json?') ||
    lowerUrl.includes('.json&') ||
    lowerUrl.includes('.lottie?') ||
    lowerUrl.includes('.lottie&') ||
    lowerUrl.includes('.dotlottie?') ||
    lowerUrl.includes('.dotlottie&') ||
    lowerUrl.includes('lottie') ||
    lowerUrl.includes('animation')
  );
};
