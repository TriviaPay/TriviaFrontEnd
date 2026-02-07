/**
 * Secure Key Generation Utilities
 * Generates secure random keys for keychain storage
 */

import 'react-native-get-random-values';
import { randomBytes } from 'react-native-quick-crypto';
import { encode as base64Encode } from 'base-64';

/**
 * Generate secure random key for keychain storage
 */
export function generateSecureKey(length: number = 32): string {
  try {
    const bytes = randomBytes(length);
    // Convert Uint8Array to base64 using base-64 library (React Native compatible)
    const uint8Array = new Uint8Array(bytes);
    // Convert to string first, then encode to base64
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    return base64Encode(binaryString);
  } catch (error) {
    const { logger } = require('../utils/logger');
    logger.error('Error generating secure key', 'SECURITY', error);
    // Fallback: Try alternative method
    try {
      const crypto = require('react-native-quick-crypto');
      const fallbackBytes = crypto.randomBytes(length);
      const uint8Array = new Uint8Array(fallbackBytes);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      return base64Encode(binaryString);
    } catch (fallbackError) {
      // If all crypto methods fail, throw error instead of using insecure fallback
      throw new Error('Secure key generation failed: No secure random source available');
    }
  }
}

/**
 * Generate secure random service name
 */
export function generateSecureServiceName(prefix: string): string {
  const randomSuffix = generateSecureKey(16);
  return `${prefix}_${randomSuffix}`;
}

/**
 * Hash key for storage (one-way)
 */
export function hashKey(key: string): string {
  try {
    const crypto = require('react-native-quick-crypto');
    const hash = crypto.createHash('sha256');
    hash.update(key);
    return hash.digest('hex');
  } catch (error) {
    const { logger } = require('../utils/logger');
    logger.error('Error hashing key', 'SECURITY', error);
    // Fallback: Try alternative crypto method
    try {
      const crypto = require('react-native-quick-crypto');
      const hash = crypto.createHash('sha256');
      hash.update(key);
      return hash.digest('hex');
    } catch (fallbackError) {
      // If all crypto methods fail, throw error
      throw new Error('Key hashing failed: No secure hash function available');
    }
  }
}
