/**
 * Request Signing Service
 * Signs API requests to prevent tampering and replay attacks
 * Implements HMAC-based request signing
 */

import { createHmac } from 'react-native-quick-crypto';
import { getDeviceId } from '../utils/deviceUtils';
import { keychainStorage } from '../../services/keychainStorage';
import { logger } from '../utils/logger';

const __DEV__ = process.env.NODE_ENV === 'development';

interface SignedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

class RequestSigningService {
  private static instance: RequestSigningService;
  private deviceId: string | null = null;
  private readonly SIGNATURE_HEADER = 'X-Request-Signature';
  private readonly TIMESTAMP_HEADER = 'X-Request-Timestamp';
  private readonly NONCE_HEADER = 'X-Request-Nonce';
  private readonly REQUEST_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): RequestSigningService {
    if (!RequestSigningService.instance) {
      RequestSigningService.instance = new RequestSigningService();
    }
    return RequestSigningService.instance;
  }

  /**
   * Initialize request signing
   */
  async initialize(): Promise<void> {
    try {
      // Get or create device ID
      this.deviceId = await this.getOrCreateDeviceId();
    } catch (error) {
      logger.error('Request signing initialization failed', 'SECURITY', error);
    }
  }

  /**
   * Get or create device ID
   */
  private async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await keychainStorage.get('device_id');
      if (!deviceId) {
        // Generate secure device ID
        const { generateSecureKey } = require('./secureKeys');
        deviceId = generateSecureKey(32);
        await keychainStorage.set('device_id', deviceId);
      }
      return deviceId;
    } catch (error) {
      logger.error('Failed to get device ID', 'SECURITY', error);
      // Fallback to timestamp-based ID (less secure)
      return `${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
  }

  /**
   * Sign a request
   */
  async signRequest(
    url: string,
    method: string,
    headers: Record<string, string> = {},
    body?: string
  ): Promise<SignedRequest> {
    try {
      const timestamp = Date.now();
      const nonce = this.generateNonce();

      // Get signing key (device-specific)
      const signingKey = await this.getSigningKey();

      // Create signature payload
      const payload = this.createSignaturePayload(url, method, headers, body, timestamp, nonce);

      // Generate HMAC signature
      const signature = this.generateSignature(payload, signingKey);

      // Add signature headers
      const signedHeaders = {
        ...headers,
        [this.SIGNATURE_HEADER]: signature,
        [this.TIMESTAMP_HEADER]: timestamp.toString(),
        [this.NONCE_HEADER]: nonce,
      };

      return {
        url,
        method,
        headers: signedHeaders,
        body,
        timestamp,
        nonce,
        signature,
      };
    } catch (error) {
      logger.error('Request signing failed', 'SECURITY', error);
      // Return unsigned request if signing fails (fallback)
      return {
        url,
        method,
        headers,
        body,
        timestamp: Date.now(),
        nonce: this.generateNonce(),
        signature: '',
      };
    }
  }

  /**
   * Verify request signature
   */
  async verifyRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: string,
    timestamp?: number,
    nonce?: string,
    signature?: string
  ): Promise<boolean> {
    try {
      if (!signature || !timestamp || !nonce) {
        return false;
      }

      // Check timestamp (prevent replay attacks)
      const now = Date.now();
      if (Math.abs(now - timestamp) > this.REQUEST_TIMEOUT) {
        logger.warn('Request timestamp expired', 'SECURITY');
        return false;
      }

      // Get signing key
      const signingKey = await this.getSigningKey();

      // Recreate signature payload
      const payload = this.createSignaturePayload(url, method, headers, body, timestamp, nonce);

      // Verify signature
      const expectedSignature = this.generateSignature(payload, signingKey);

      // Constant-time comparison to prevent timing attacks
      return this.constantTimeCompare(signature, expectedSignature);
    } catch (error) {
      logger.error('Request verification failed', 'SECURITY', error);
      return false;
    }
  }

  /**
   * Create signature payload
   */
  private createSignaturePayload(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: string | undefined,
    timestamp: number,
    nonce: string
  ): string {
    // Normalize URL (remove query params for signing, they're included in body if POST)
    const urlObj = new URL(url);
    const normalizedUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

    // Sort headers for consistent signing
    const sortedHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key]}`)
      .join('\n');

    // Create payload
    const payloadParts = [
      method.toUpperCase(),
      normalizedUrl,
      sortedHeaders,
      body || '',
      timestamp.toString(),
      nonce,
    ];

    return payloadParts.join('\n');
  }

  /**
   * Generate HMAC signature
   */
  private generateSignature(payload: string, key: string): string {
    try {
      const hmac = createHmac('sha256', key);
      hmac.update(payload);
      return hmac.digest('hex');
    } catch (error) {
      logger.error('Signature generation failed', 'SECURITY', error);
      return '';
    }
  }

  /**
   * Get signing key (device-specific)
   */
  private async getSigningKey(): Promise<string> {
    try {
      let signingKey = await keychainStorage.get('request_signing_key');
      if (!signingKey) {
        // Generate new signing key
        const { generateSecureKey } = require('./secureKeys');
        signingKey = generateSecureKey(64);
        await keychainStorage.set('request_signing_key', signingKey);
      }
      return signingKey;
    } catch (error) {
      logger.error('Failed to get signing key', 'SECURITY', error);
      // Fallback (less secure)
      return this.deviceId || 'fallback_key';
    }
  }

  /**
   * Generate nonce
   */
  private generateNonce(): string {
    const { generateSecureKey } = require('./secureKeys');
    return generateSecureKey(16);
  }

  /**
   * Constant-time string comparison (prevents timing attacks)
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

export const requestSigning = RequestSigningService.getInstance();
export default requestSigning;
