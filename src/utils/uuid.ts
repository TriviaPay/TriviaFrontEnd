/**
 * UUID Generator Utility
 * Simple UUID v4 generator for React Native
 */

export const generateUUID = (): string => {
  // For React Native, we'll use a simple UUID v4 implementation
  // In production, consider using react-native-uuid or similar library
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
