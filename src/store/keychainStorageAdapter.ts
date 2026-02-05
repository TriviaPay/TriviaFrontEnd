/**
 * Keychain Storage Adapter for Redux Persist
 * Replaces AsyncStorage with keychain storage
 */

/**
 * Keychain Storage Adapter for Redux Persist
 * Replaces AsyncStorage with keychain storage
 * Secure storage adapter with error sanitization
 */

import { keychainStorage } from '../services/keychainStorage';
import { logger } from '../lib/utils/logger';

export const keychainStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await keychainStorage.get(key);
    } catch (error) {
      logger.error('Error getting item from keychain adapter', 'STORAGE', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await keychainStorage.set(key, value);
    } catch (error) {
      logger.error('Error setting item in keychain adapter', 'STORAGE', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await keychainStorage.removeItem(key);
    } catch (error) {
      logger.error('Error removing item from keychain adapter', 'STORAGE', error);
    }
  },
};
