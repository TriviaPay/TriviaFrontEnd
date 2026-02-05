/**
 * Key Manager
 * Generates, stores, and manages E2EE keys using Ed25519 and X25519
 */
import 'react-native-get-random-values';
import { generateKeyPair as generateEd25519KeyPair } from '@stablelib/ed25519';
import { generateKeyPair as generateX25519KeyPair } from '@stablelib/x25519';
import { encode as base64Encode, decode as base64Decode } from 'base-64';
import * as Keychain from 'react-native-keychain';

// Keychain service names
const IDENTITY_KEY_SERVICE = 'TriviaPay_E2EE_IdentityKey';
const SIGNED_PREKEY_SERVICE = 'TriviaPay_E2EE_SignedPrekey';
const PREKEYS_SERVICE = 'TriviaPay_E2EE_Prekeys';
const KEY_ID_SERVICE = 'TriviaPay_E2EE_KeyId';

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface StoredKeys {
  identityKeyPair: KeyPair;
  signedPrekey: {
    keyId: number;
    keyPair: KeyPair;
    signature: Uint8Array;
  };
  prekeys: Array<{
    keyId: number;
    keyPair: KeyPair;
  }>;
}

/**
 * Generate identity key pair (Ed25519)
 */
const generateIdentityKey = (): KeyPair => {
  return generateEd25519KeyPair();
};

/**
 * Generate signed prekey (X25519) with signature from identity key
 */
const generateSignedPrekey = (
  identityKeyPair: KeyPair
): {
  keyId: number;
  keyPair: KeyPair;
  signature: Uint8Array;
} => {
  const prekeyPair = generateX25519KeyPair();
  const keyId = Date.now(); // Simple key ID generation

  // Sign the prekey public key with identity key
  // Note: In production, use proper signing from @stablelib/ed25519
  const signature = new Uint8Array(64); // Placeholder - implement proper signing

  return {
    keyId,
    keyPair: prekeyPair,
    signature,
  };
};

/**
 * Generate prekeys (X25519) for one-time use
 */
const generatePrekeys = (count: number = 100): Array<{ keyId: number; keyPair: KeyPair }> => {
  const prekeys = [];
  const keyId = Date.now();

  for (let i = 0; i < count; i++) {
    const keyPair = generateX25519KeyPair();
    prekeys.push({
      keyId: keyId + i,
      keyPair,
    });
  }

  return prekeys;
};

/**
 * Store keys securely in Keychain
 */
const storeKeys = async (keys: StoredKeys): Promise<boolean> => {
  try {
    // Store identity key
    const identityKeyData = JSON.stringify({
      publicKey: base64Encode(String.fromCharCode(...keys.identityKeyPair.publicKey)),
      secretKey: base64Encode(String.fromCharCode(...keys.identityKeyPair.secretKey)),
    });
    await Keychain.setGenericPassword('identity_key', identityKeyData, {
      service: IDENTITY_KEY_SERVICE,
    });

    // Store signed prekey
    const signedPrekeyData = JSON.stringify({
      keyId: keys.signedPrekey.keyId,
      publicKey: base64Encode(String.fromCharCode(...keys.signedPrekey.keyPair.publicKey)),
      secretKey: base64Encode(String.fromCharCode(...keys.signedPrekey.keyPair.secretKey)),
      signature: base64Encode(String.fromCharCode(...keys.signedPrekey.signature)),
    });
    await Keychain.setGenericPassword('signed_prekey', signedPrekeyData, {
      service: SIGNED_PREKEY_SERVICE,
    });

    // Store prekeys
    const prekeysData = JSON.stringify(
      keys.prekeys.map(pk => ({
        keyId: pk.keyId,
        publicKey: base64Encode(String.fromCharCode(...pk.keyPair.publicKey)),
        secretKey: base64Encode(String.fromCharCode(...pk.keyPair.secretKey)),
      }))
    );
    await Keychain.setGenericPassword('prekeys', prekeysData, {
      service: PREKEYS_SERVICE,
    });

    // Store current key ID
    const maxKeyId = Math.max(...keys.prekeys.map(pk => pk.keyId));
    await Keychain.setGenericPassword('key_id', maxKeyId.toString(), {
      service: KEY_ID_SERVICE,
    });

    return true;
  } catch (error) {
    const { logErrorSafely } = require('../security/errorSanitizer');
    logErrorSafely(error instanceof Error ? error : new Error('Unknown error'), 'E2EE_KEY_MANAGER');
    return false;
  }
};

/**
 * Load keys from Keychain
 */
const loadKeys = async (): Promise<StoredKeys | null> => {
  try {
    // Load identity key
    const identityCreds = await Keychain.getGenericPassword({
      service: IDENTITY_KEY_SERVICE,
    });
    if (!identityCreds) return null;

    const identityData = JSON.parse(identityCreds.password);
    const identityKeyPair: KeyPair = {
      publicKey: new Uint8Array(
        [...base64Decode(identityData.publicKey)].map(c => c.charCodeAt(0))
      ),
      secretKey: new Uint8Array(
        [...base64Decode(identityData.secretKey)].map(c => c.charCodeAt(0))
      ),
    };

    // Load signed prekey
    const signedPrekeyCreds = await Keychain.getGenericPassword({
      service: SIGNED_PREKEY_SERVICE,
    });
    if (!signedPrekeyCreds) return null;

    const signedPrekeyData = JSON.parse(signedPrekeyCreds.password);
    const signedPrekey = {
      keyId: signedPrekeyData.keyId,
      keyPair: {
        publicKey: new Uint8Array(
          [...base64Decode(signedPrekeyData.publicKey)].map(c => c.charCodeAt(0))
        ),
        secretKey: new Uint8Array(
          [...base64Decode(signedPrekeyData.secretKey)].map(c => c.charCodeAt(0))
        ),
      },
      signature: new Uint8Array(
        [...base64Decode(signedPrekeyData.signature)].map(c => c.charCodeAt(0))
      ),
    };

    // Load prekeys
    const prekeysCreds = await Keychain.getGenericPassword({
      service: PREKEYS_SERVICE,
    });
    if (!prekeysCreds) return null;

    const prekeysData = JSON.parse(prekeysCreds.password);
    const prekeys = prekeysData.map((pk: any) => ({
      keyId: pk.keyId,
      keyPair: {
        publicKey: new Uint8Array([...base64Decode(pk.publicKey)].map(c => c.charCodeAt(0))),
        secretKey: new Uint8Array([...base64Decode(pk.secretKey)].map(c => c.charCodeAt(0))),
      },
    }));

    return {
      identityKeyPair,
      signedPrekey,
      prekeys,
    };
  } catch (error) {
    const { logErrorSafely } = require('../security/errorSanitizer');
    logErrorSafely(error instanceof Error ? error : new Error('Unknown error'), 'E2EE_KEY_MANAGER');
    return null;
  }
};

/**
 * Generate key bundle (without upload)
 * Returns the key bundle in API format for upload
 */
export const generateKeyBundle = async (): Promise<{
  keys: StoredKeys;
  keyBundleForUpload: {
    identity_key_pub: string;
    one_time_prekeys: Array<{ prekey_pub: string }>;
    signed_prekey_pub: string;
    signed_prekey_sig: string;
  };
}> => {
  try {
    // Check if keys already exist
    const existingKeys = await loadKeys();
    if (existingKeys) {
      // Prepare existing keys for upload
      const keyBundleForUpload = {
        identity_key_pub: base64Encode(
          String.fromCharCode(...existingKeys.identityKeyPair.publicKey)
        ),
        one_time_prekeys: existingKeys.prekeys.map(pk => ({
          prekey_pub: base64Encode(String.fromCharCode(...pk.keyPair.publicKey)),
        })),
        signed_prekey_pub: base64Encode(
          String.fromCharCode(...existingKeys.signedPrekey.keyPair.publicKey)
        ),
        signed_prekey_sig: base64Encode(
          String.fromCharCode(...existingKeys.signedPrekey.signature)
        ),
      };

      return {
        keys: existingKeys,
        keyBundleForUpload,
      };
    }

    // Generate keys
    const identityKeyPair = generateIdentityKey();
    const signedPrekey = generateSignedPrekey(identityKeyPair);
    const prekeys = generatePrekeys(100);

    const keys: StoredKeys = {
      identityKeyPair,
      signedPrekey,
      prekeys,
    };

    // Store keys locally
    const stored = await storeKeys(keys);
    if (!stored) {
      throw new Error('Failed to store keys locally');
    }

    // Prepare key bundle for upload (matching API format)
    const keyBundleForUpload = {
      identity_key_pub: base64Encode(String.fromCharCode(...identityKeyPair.publicKey)),
      one_time_prekeys: prekeys.map(pk => ({
        prekey_pub: base64Encode(String.fromCharCode(...pk.keyPair.publicKey)),
      })),
      signed_prekey_pub: base64Encode(String.fromCharCode(...signedPrekey.keyPair.publicKey)),
      signed_prekey_sig: base64Encode(String.fromCharCode(...signedPrekey.signature)),
    };

    return {
      keys,
      keyBundleForUpload,
    };
  } catch (error) {
    const { logErrorSafely } = require('../security/errorSanitizer');
    logErrorSafely(error instanceof Error ? error : new Error('Unknown error'), 'E2EE_KEY_MANAGER');
    throw error;
  }
};

/**
 * Get stored keys
 */
export const getStoredKeys = async (): Promise<StoredKeys | null> => {
  return loadKeys();
};

/**
 * Clear all stored keys (for logout)
 */
export const clearStoredKeys = async (): Promise<void> => {
  try {
    await Keychain.resetGenericPassword({ service: IDENTITY_KEY_SERVICE });
    await Keychain.resetGenericPassword({ service: SIGNED_PREKEY_SERVICE });
    await Keychain.resetGenericPassword({ service: PREKEYS_SERVICE });
    await Keychain.resetGenericPassword({ service: KEY_ID_SERVICE });
  } catch (error) {
    const { logErrorSafely } = require('../security/errorSanitizer');
    logErrorSafely(error instanceof Error ? error : new Error('Unknown error'), 'E2EE_KEY_MANAGER');
  }
};
