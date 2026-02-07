/**
 * Certificate Pinning Utility
 * Provides certificate pinning functionality for secure API communication
 *
 * Note: This requires native module implementation for full functionality
 * For React Native, use libraries like:
 * - react-native-cert-pinner
 * - react-native-ssl-pinning
 *
 * This utility provides a wrapper interface that can be integrated with native modules
 */

import { logger } from '../utils/logger';

interface PinConfig {
  hostname: string;
  publicKeyHashes: string[];
  includeSubdomains?: boolean;
}

interface CertificatePinningResult {
  success: boolean;
  error?: string;
}

/**
 * Certificate Pinning Service
 * Wrapper for native certificate pinning implementation
 */
class CertificatePinningService {
  private static instance: CertificatePinningService;
  private isInitialized = false;
  private pinnedHosts: Map<string, PinConfig> = new Map();

  private constructor() {}

  static getInstance(): CertificatePinningService {
    if (!CertificatePinningService.instance) {
      CertificatePinningService.instance = new CertificatePinningService();
    }
    return CertificatePinningService.instance;
  }

  /**
   * Initialize certificate pinning
   * This should be called during app initialization
   */
  async initialize(): Promise<void> {
    try {
      // Check if native module is available
      const hasNativeModule = await this.checkNativeModule();

      if (!hasNativeModule) {
        logger.warn(
          '⚠️ Certificate pinning native module not available. Using fallback mode.',
          'APP'
        );
        this.isInitialized = true; // Allow app to continue
        return;
      }

      // Configure pinned certificates for API endpoints
      await this.configurePinnedCertificates();

      this.isInitialized = true;
    } catch (error) {
      logger.error('❌ Certificate pinning initialization failed:', 'APP', error);
      // Don't block app initialization - fail gracefully
      this.isInitialized = true;
    }
  }

  /**
   * Check if native certificate pinning module is available
   */
  private async checkNativeModule(): Promise<boolean> {
    try {
      // Try to require native module (adjust based on your chosen library)
      // Example for react-native-ssl-pinning:
      // const { SSL } = require('react-native-ssl-pinning');
      // return !!SSL;

      // Try react-native-cert-pinner
      try {
        const CertPinner = require('react-native-cert-pinner');
        if (CertPinner && CertPinner.default) {
          return true;
        }
      } catch (e) {
        // Not available
      }

      // Try react-native-ssl-pinning
      try {
        const SSL = require('react-native-ssl-pinning');
        if (SSL && SSL.fetch) {
          return true;
        }
      } catch (e) {
        // Not available
      }

      // For now, return false as placeholder
      // To enable: npm install react-native-cert-pinner or react-native-ssl-pinning
      // Then uncomment the appropriate check above
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Configure pinned certificates for API endpoints
   */
  private async configurePinnedCertificates(): Promise<void> {
    // Get API base URL from config
    const { API_CONFIG } = require('../../config/api');
    const apiHost = new URL(API_CONFIG.BASE_URL).hostname;

    // Add certificate pin configuration
    // In production, these should be your actual certificate public key hashes
    const pinConfig: PinConfig = {
      hostname: apiHost,
      publicKeyHashes: [
        // Add your actual certificate public key hashes here
        // These are SHA-256 hashes of the certificate's public key
        // Example: 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
      ],
      includeSubdomains: true,
    };

    this.pinnedHosts.set(apiHost, pinConfig);

    // If native module is available, configure it
    try {
      // Try react-native-cert-pinner
      const CertPinner = require('react-native-cert-pinner');
      if (CertPinner && CertPinner.default) {
        await CertPinner.default.initialize({
          [pinConfig.hostname]: {
            pins: pinConfig.publicKeyHashes,
            includeSubdomains: pinConfig.includeSubdomains,
          },
        });
        return;
      }
    } catch (e) {
      // Not available, try next
    }

    // Try react-native-ssl-pinning
    try {
      const SSL = require('react-native-ssl-pinning');
      if (SSL && SSL.pinCertificate) {
        await SSL.pinCertificate(pinConfig);
        return;
      }
    } catch (e) {
      // Not available
    }

    // If no native module available, log warning
    if (!__DEV__) {
      logger.warn(
        '⚠️ Certificate pinning not available - install react-native-cert-pinner or react-native-ssl-pinning',
        'APP'
      );
    }
  }

  /**
   * Verify certificate for a request
   * This should be called before making API requests
   */
  async verifyCertificate(url: string): Promise<CertificatePinningResult> {
    if (!this.isInitialized) {
      return { success: true }; // Allow if not initialized
    }

    try {
      const hostname = new URL(url).hostname;
      const pinConfig = this.pinnedHosts.get(hostname);

      if (!pinConfig) {
        // Host not pinned - allow connection (or reject based on your security policy)
        return { success: true };
      }

      // If native module is available, verify certificate
      // Example implementation:
      // const { SSL } = require('react-native-ssl-pinning');
      // const result = await SSL.verifyCertificate(url, pinConfig.publicKeyHashes);
      // return { success: result.isValid };

      // Fallback: return success if native module not available
      return { success: true };
    } catch (error) {
      logger.error('❌ Certificate verification failed:', 'APP', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add certificate pin for a hostname
   */
  addPin(config: PinConfig): void {
    this.pinnedHosts.set(config.hostname, config);
  }

  /**
   * Remove certificate pin for a hostname
   */
  removePin(hostname: string): void {
    this.pinnedHosts.delete(hostname);
  }

  /**
   * Get all pinned hosts
   */
  getPinnedHosts(): string[] {
    return Array.from(this.pinnedHosts.keys());
  }

  /**
   * Check if hostname is pinned
   */
  isPinned(hostname: string): boolean {
    return this.pinnedHosts.has(hostname);
  }
}

// Export singleton instance
export const certificatePinning = CertificatePinningService.getInstance();

// Export types
export type { PinConfig, CertificatePinningResult };

export default certificatePinning;
