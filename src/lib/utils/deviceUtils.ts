/**
 * Device Utilities
 * Device identification and utilities
 */

import { Platform } from 'react-native';
import { keychainStorage } from '../../services/keychainStorage';

/**
 * Get or create device ID
 */
export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await keychainStorage.get('device_id');
    if (!deviceId) {
      // Generate secure device ID
      const { generateSecureKey } = require('../security/secureKeys');
      deviceId = generateSecureKey(32);
      await keychainStorage.set('device_id', deviceId);
    }
    return deviceId;
  } catch (error) {
    // Fallback
    return `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

export default {
  getDeviceId,
};
