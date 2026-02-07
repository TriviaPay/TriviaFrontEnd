/**
 * Message Encryptor/Decryptor
 * Handles encryption and decryption of messages using X25519
 */
import { encode as base64Encode, decode as base64Decode } from 'base-64';
import { getStoredKeys } from './keyManager';
// Note: claimPrekey removed - needs proper implementation with deviceId and prekeyId

// Simple encryption using X25519 shared secret
// Note: In production, use proper Signal Protocol or similar
// This is a simplified version for demonstration

/**
 * Derive shared secret from key pairs
 */
const deriveSharedSecret = (ourSecretKey: Uint8Array, theirPublicKey: Uint8Array): Uint8Array => {
  // Simplified: In production, use proper X25519 key exchange
  // This is a placeholder - implement proper key derivation
  const combined = new Uint8Array(ourSecretKey.length + theirPublicKey.length);
  combined.set(ourSecretKey, 0);
  combined.set(theirPublicKey, ourSecretKey.length);

  // Simple hash (in production, use proper KDF)
  return combined.slice(0, 32);
};

/**
 * Simple XOR encryption (placeholder - use proper AES in production)
 */
const encryptWithKey = (plaintext: string, key: Uint8Array): string => {
  const textBytes = new TextEncoder().encode(plaintext);
  const encrypted = new Uint8Array(textBytes.length);

  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ key[i % key.length];
  }

  return base64Encode(String.fromCharCode(...encrypted));
};

/**
 * Simple XOR decryption (placeholder - use proper AES in production)
 * React Native compatible - no TextDecoder dependency
 */
const decryptWithKey = (ciphertext: string, key: Uint8Array): string => {
  const decoded = base64Decode(ciphertext);
  const encrypted = new Uint8Array([...decoded].map(c => c.charCodeAt(0)));
  const decrypted = new Uint8Array(encrypted.length);

  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i % key.length];
  }

  // React Native compatible: Convert Uint8Array to string without TextDecoder
  return String.fromCharCode(...decrypted);
};

/**
 * Encrypt message for group (simpler encryption without prekey claiming)
 * For group messages, we use a simpler encryption scheme
 */
export const encryptGroupMessage = async (plaintext: string): Promise<string> => {
  try {
    // Get our stored keys
    const ourKeys = await getStoredKeys();
    if (!ourKeys) {
      throw new Error('No keys found. Please generate keys first.');
    }

    // Use identity key for group encryption (simplified approach)
    // In production, use proper group key management
    const groupKey = ourKeys.identityKeyPair.publicKey.slice(0, 32);

    // Encrypt message
    const ciphertext = encryptWithKey(plaintext, groupKey);

    // Return base64 encoded ciphertext
    return ciphertext;
  } catch (error) {
    const { logErrorSafely } = require('../security/errorSanitizer');
    logErrorSafely(error instanceof Error ? error : new Error('Unknown error'), 'E2EE_ENCRYPTION');
    throw error;
  }
};

/**
 * Encrypt message for recipient (DM messages)
 * Note: This function needs to be updated to properly fetch recipient's key bundle
 * For now, it's a placeholder that will need proper implementation
 */
export const encryptMessage = async (
  recipientUserId: string,
  plaintext: string
): Promise<string> => {
  try {
    // Get our stored keys
    const ourKeys = await getStoredKeys();
    if (!ourKeys) {
      throw new Error('No keys found. Please generate keys first.');
    }

    // Note: Prekey claiming implementation pending - using fallback method
    // The current implementation is incorrect - claimPrekey needs deviceId and prekeyId
    // For now, use a simplified encryption for DM messages
    const { logger } = require('../utils/logger');
    if (__DEV__) {
      logger.warn(
        'Using simplified encryption for DM (prekey claiming needs proper implementation)',
        'E2EE_ENCRYPTION'
      );
    }

    // Use identity key for encryption (simplified approach)
    // In production, fetch recipient's key bundle and use proper Signal Protocol
    const encryptionKey = ourKeys.identityKeyPair.publicKey.slice(0, 32);

    // Encrypt message
    const ciphertext = encryptWithKey(plaintext, encryptionKey);

    // Return base64 encoded ciphertext
    return ciphertext;
  } catch (error) {
    const { logErrorSafely } = require('../security/errorSanitizer');
    logErrorSafely(error instanceof Error ? error : new Error('Unknown error'), 'E2EE_ENCRYPTION');
    throw error;
  }
};

/**
 * Decrypt message from sender
 */
export const decryptMessage = async (senderUserId: string, ciphertext: string): Promise<string> => {
  try {
    // Get our stored keys
    const ourKeys = await getStoredKeys();
    if (!ourKeys) {
      throw new Error('No keys found. Please generate keys first.');
    }

    // In production, you would:
    // 1. Get sender's prekey bundle
    // 2. Derive shared secret using our prekey secret and sender's public key
    // 3. Decrypt the message

    // For now, simplified decryption (placeholder)
    // This assumes we have the shared secret somehow
    const sharedSecret = new Uint8Array(32).fill(0); // Placeholder

    const plaintext = decryptWithKey(ciphertext, sharedSecret);

    return plaintext;
  } catch (error) {
    const { logErrorSafely } = require('../security/errorSanitizer');
    logErrorSafely(error instanceof Error ? error : new Error('Unknown error'), 'E2EE_ENCRYPTION');
    throw error;
  }
};

/**
 * Encrypt image/file data
 */
export const encryptFile = async (
  recipientUserId: string,
  fileData: Uint8Array
): Promise<string> => {
  try {
    const fileBase64 = base64Encode(fileData);
    return await encryptMessage(recipientUserId, fileBase64);
  } catch (error) {
    const { logErrorSafely } = require('../security/errorSanitizer');
    logErrorSafely(error instanceof Error ? error : new Error('Unknown error'), 'E2EE_ENCRYPTION');
    throw error;
  }
};

/**
 * Decrypt image/file data
 */
export const decryptFile = async (
  senderUserId: string,
  ciphertext: string
): Promise<Uint8Array> => {
  try {
    const decryptedBase64 = await decryptMessage(senderUserId, ciphertext);
    return new Uint8Array([...base64Decode(decryptedBase64)].map(c => c.charCodeAt(0)));
  } catch (error) {
    const { logErrorSafely } = require('../security/errorSanitizer');
    logErrorSafely(error instanceof Error ? error : new Error('Unknown error'), 'E2EE_ENCRYPTION');
    throw error;
  }
};
