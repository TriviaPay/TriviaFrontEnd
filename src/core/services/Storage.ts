/**
 * Storage Service
 * MMKV-based secure, fast local storage
 */

import { MMKV } from 'react-native-mmkv';
import { logger } from './Logger';

class StorageService {
  private storage: MMKV;

  constructor() {
    this.storage = new MMKV({
      id: 'triviacoin-storage',
      encryptionKey: this.getEncryptionKey(),
    });
  }

  /**
   * Get encryption key (in production, generate this securely)
   */
  private getEncryptionKey(): string {
    // TODO: In production, generate this from device keychain
    return 'triviacoin-secure-key-2024';
  }

  /**
   * Set string value
   */
  set(key: string, value: string): void {
    try {
      this.storage.set(key, value);
    } catch (error) {
      logger.error('Storage set error', 'STORAGE', { key, error });
      throw error;
    }
  }

  /**
   * Get string value
   */
  get(key: string): string | undefined {
    try {
      return this.storage.getString(key);
    } catch (error) {
      logger.error('Storage get error', 'STORAGE', { key, error });
      return undefined;
    }
  }

  /**
   * Set JSON value
   */
  setJSON<T>(key: string, value: T): void {
    try {
      const json = JSON.stringify(value);
      this.storage.set(key, json);
    } catch (error) {
      logger.error('Storage setJSON error', 'STORAGE', { key, error });
      throw error;
    }
  }

  /**
   * Get JSON value
   */
  getJSON<T>(key: string): T | undefined {
    try {
      const json = this.storage.getString(key);
      return json ? JSON.parse(json) : undefined;
    } catch (error) {
      logger.error('Storage getJSON error', 'STORAGE', { key, error });
      return undefined;
    }
  }

  /**
   * Set number value
   */
  setNumber(key: string, value: number): void {
    try {
      this.storage.set(key, value);
    } catch (error) {
      logger.error('Storage setNumber error', 'STORAGE', { key, error });
      throw error;
    }
  }

  /**
   * Get number value
   */
  getNumber(key: string): number | undefined {
    try {
      return this.storage.getNumber(key);
    } catch (error) {
      logger.error('Storage getNumber error', 'STORAGE', { key, error });
      return undefined;
    }
  }

  /**
   * Set boolean value
   */
  setBoolean(key: string, value: boolean): void {
    try {
      this.storage.set(key, value);
    } catch (error) {
      logger.error('Storage setBoolean error', 'STORAGE', { key, error });
      throw error;
    }
  }

  /**
   * Get boolean value
   */
  getBoolean(key: string): boolean | undefined {
    try {
      return this.storage.getBoolean(key);
    } catch (error) {
      logger.error('Storage getBoolean error', 'STORAGE', { key, error });
      return undefined;
    }
  }

  /**
   * Delete key
   */
  delete(key: string): void {
    try {
      this.storage.delete(key);
    } catch (error) {
      logger.error('Storage delete error', 'STORAGE', { key, error });
    }
  }

  /**
   * Check if key exists
   */
  contains(key: string): boolean {
    try {
      return this.storage.contains(key);
    } catch (error) {
      logger.error('Storage contains error', 'STORAGE', { key, error });
      return false;
    }
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    try {
      this.storage.clearAll();
      logger.info('Storage cleared', 'STORAGE');
    } catch (error) {
      logger.error('Storage clearAll error', 'STORAGE', error);
    }
  }

  /**
   * Get all keys
   */
  getAllKeys(): string[] {
    try {
      return this.storage.getAllKeys();
    } catch (error) {
      logger.error('Storage getAllKeys error', 'STORAGE', error);
      return [];
    }
  }
}

export const storage = new StorageService();
