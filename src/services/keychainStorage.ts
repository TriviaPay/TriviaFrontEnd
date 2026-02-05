import * as Keychain from 'react-native-keychain';
import { encode as btoa, decode as atob } from 'base-64';
import { hashKey } from '../lib/security/secureKeys';
import { logger } from '../lib/utils/logger';

// Storage keys - using hashed keys for additional security
const USER_DATA_SERVICE = hashKey('TriviaPay_UserData');
const AUTH_TOKEN_SERVICE = hashKey('TriviaPay_AuthToken');
const REFRESH_TOKEN_SERVICE = hashKey('TriviaPay_RefreshToken');
const AUTH_STATE_SERVICE = hashKey('TriviaPay_AuthState');
const DEVICE_ID_SERVICE = hashKey('TriviaPay_DeviceId');

// Separate services for metadata to prevent conflicts
const AUTH_TOKEN_METADATA_SERVICE = hashKey('TriviaPay_AuthToken_Metadata');
const REFRESH_TOKEN_METADATA_SERVICE = hashKey('TriviaPay_RefreshToken_Metadata');

class KeychainStorage {
  // Store access token
  async storeAccessToken(token: string): Promise<boolean> {
    try {
      // Skip corruption check on normal writes for better performance
      // Only check if we encounter an error

      // For very long tokens, use smaller chunks
      if (token.length > 300) {
        logger.debug('Long token, using smaller chunked storage', 'AUTH_TOKEN');
        // Only clear corrupted data if we're using chunked storage
        await this.clearCorruptedTokenData('access_token').catch(() => {});
        return await this.storeChunkedToken('access_token', token);
      }

      // Use simple Keychain storage for shorter tokens
      await Keychain.setGenericPassword('trivia_access_token', token, {
        service: AUTH_TOKEN_SERVICE,
      });

      logger.debug('Access token stored successfully in Keychain', 'AUTH_TOKEN');
      return true;
    } catch (error) {
      logger.error('Error storing access token', 'AUTH_TOKEN', error);
      // Only clear corrupted data if we get an error
      try {
        await this.clearCorruptedTokenData('access_token').catch(() => {});
      } catch (clearError) {
        // Ignore clear errors
      }

      // If direct storage fails, try chunked storage as fallback
      try {
        logger.debug('Direct storage failed, trying chunked storage', 'AUTH_TOKEN');
        return await this.storeChunkedToken('access_token', token);
      } catch (fallbackError) {
        logger.error('Chunked storage also failed', 'AUTH_TOKEN', fallbackError);
        return false;
      }
    }
  }

  // Store chunked token for long JWT tokens with secure Base64 encoding
  private async storeChunkedToken(tokenType: string, token: string): Promise<boolean> {
    try {
      const chunkSize = 200; // Smaller chunks to avoid Keychain limits
      const chunks = [];

      // Split token into chunks
      for (let i = 0; i < token.length; i += chunkSize) {
        chunks.push(token.slice(i, i + chunkSize));
      }

      // Create metadata with validation
      const metadata = {
        totalChunks: chunks.length,
        tokenType,
        timestamp: Date.now(),
        version: '1.0', // Version for future compatibility
        checksum: this.generateChecksum(token), // Add integrity check
      };

      // Use appropriate service for token chunks
      const tokenService =
        tokenType === 'refresh_token' ? REFRESH_TOKEN_SERVICE : AUTH_TOKEN_SERVICE;

      // Base64 encode metadata for secure storage
      const metadataString = JSON.stringify(metadata);
      const encodedMetadata = btoa(metadataString);

      logger.debug(`Storing encoded metadata for ${tokenType}`, 'AUTH_TOKEN');

      // Store metadata with unique key: ${tokenType}_meta
      await Keychain.setGenericPassword(`${tokenType}_meta`, encodedMetadata, {
        service: `${tokenService}_meta`,
      });

      // Store each chunk as Base64 string with unique keys: ${tokenType}_chunk_${i}
      for (let i = 0; i < chunks.length; i++) {
        const encodedChunk = btoa(chunks[i]);
        await Keychain.setGenericPassword(`${tokenType}_chunk_${i}`, encodedChunk, {
          service: `${tokenService}_chunk_${i}`,
        });
      }

      logger.debug(`${tokenType} stored securely in ${chunks.length} chunks`, 'AUTH_TOKEN');
      return true;
    } catch (error) {
      logger.error(`Error storing chunked ${tokenType}`, 'AUTH_TOKEN', error);
      return false;
    }
  }

  // Get access token
  async getAccessToken(): Promise<string | null> {
    try {
      // First try chunked storage
      const chunkedToken = await this.getChunkedToken('access_token');
      if (chunkedToken) {
        logger.debug('Access token retrieved from chunks', 'AUTH_TOKEN');
        return chunkedToken;
      }

      // Fallback to simple Keychain storage
      const credentials = await Keychain.getGenericPassword({
        service: AUTH_TOKEN_SERVICE,
      });
      if (credentials) {
        logger.debug('Access token retrieved successfully', 'AUTH_TOKEN');
        return credentials.password;
      }
      logger.debug('No access token found', 'AUTH_TOKEN');
      return null;
    } catch (error) {
      logger.error('Error getting access token', 'AUTH_TOKEN', error);
      // If there's a parsing error, try to clear corrupted data
      if (error instanceof SyntaxError) {
        logger.debug('Syntax error detected, clearing corrupted access token data', 'AUTH_TOKEN');
        await this.clearCorruptedTokenData('access_token');
      }
      return null;
    }
  }

  // Get chunked token with secure validation
  private async getChunkedToken(tokenType: string): Promise<string | null> {
    try {
      // Use appropriate service for token chunks
      const tokenService =
        tokenType === 'refresh_token' ? REFRESH_TOKEN_SERVICE : AUTH_TOKEN_SERVICE;

      // Get metadata with unique key: ${tokenType}_meta
      const metadataCredentials = await Keychain.getGenericPassword({
        service: `${tokenService}_meta`,
      });

      if (!metadataCredentials) {
        // If metadata exists but credentials don't, clear corrupted chunks
        // Silent - expected when user is not logged in
        // logger.warn(`Missing metadata credentials for ${tokenType}, clearing corrupted data`, 'AUTH_TOKEN');
        await this.clearCorruptedTokenData(tokenType);
        return null;
      }

      let metadata;
      try {
        // Decode Base64 metadata
        const encodedMetadata = metadataCredentials.password;
        const metadataString = atob(encodedMetadata);

        logger.debug(`Retrieving metadata for ${tokenType}`, 'AUTH_TOKEN');

        // Parse JSON metadata
        metadata = JSON.parse(metadataString);

        // Validate metadata structure
        if (
          !metadata.totalChunks ||
          !metadata.tokenType ||
          !metadata.timestamp ||
          !metadata.version
        ) {
          throw new Error('Metadata missing required fields');
        }

        // Validate token type matches
        if (metadata.tokenType !== tokenType) {
          throw new Error(`Token type mismatch: expected ${tokenType}, got ${metadata.tokenType}`);
        }

        logger.debug(`Valid metadata for ${tokenType}`, 'AUTH_TOKEN');
      } catch (parseError) {
        logger.warn(`Corrupted metadata for ${tokenType}, clearing`, 'AUTH_TOKEN', parseError);
        // Clear corrupted metadata and all chunks
        await this.clearCorruptedTokenData(tokenType);
        logger.debug(
          `Corrupted ${tokenType} metadata cleared, user will need to login again`,
          'AUTH_TOKEN'
        );
        return null;
      }

      const chunks = [];
      let missingChunks = false;

      // Retrieve all chunks with unique keys: ${tokenType}_chunk_${i}
      for (let i = 0; i < metadata.totalChunks; i++) {
        try {
          const chunkCredentials = await Keychain.getGenericPassword({
            service: `${tokenService}_chunk_${i}`,
          });

          if (chunkCredentials) {
            // Decode Base64 chunk
            try {
              const decodedChunk = atob(chunkCredentials.password);
              chunks.push(decodedChunk);
            } catch (decodeError) {
              logger.error(`Error decoding chunk ${i} for ${tokenType}`, 'AUTH_TOKEN', decodeError);
              missingChunks = true;
              break;
            }
          } else {
            logger.warn(`Missing chunk ${i} for ${tokenType}`, 'AUTH_TOKEN');
            missingChunks = true;
            break;
          }
        } catch (error) {
          logger.error(`Error retrieving chunk ${i} for ${tokenType}`, 'AUTH_TOKEN', error);
          missingChunks = true;
          break;
        }
      }

      // If chunks are missing, clear corrupted data
      if (missingChunks || chunks.length !== metadata.totalChunks) {
        logger.warn(
          `Missing or incomplete chunks for ${tokenType}: expected ${metadata.totalChunks}, got ${chunks.length}`,
          'AUTH_TOKEN'
        );
        await this.clearCorruptedTokenData(tokenType);
        return null;
      }

      // Reconstruct token
      const reconstructedToken = chunks.join('');

      // Validate token integrity
      if (!this.validateTokenIntegrity(reconstructedToken, metadata)) {
        logger.warn(`Token integrity validation failed for ${tokenType}`, 'AUTH_TOKEN');
        await this.clearCorruptedTokenData(tokenType);
        return null;
      }

      logger.debug(`${tokenType} retrieved and validated successfully`, 'AUTH_TOKEN');
      return reconstructedToken;
    } catch (error) {
      logger.error(`Error retrieving chunked ${tokenType}`, 'AUTH_TOKEN', error);
      return null;
    }
  }

  // Store refresh token
  async storeRefreshToken(token: string): Promise<boolean> {
    try {
      // Skip corruption check on normal writes for better performance
      // Only check if we encounter an error

      // For long tokens, use chunked storage
      if (token.length > 300) {
        logger.debug('Long refresh token, using chunked storage', 'AUTH_TOKEN');
        // Only clear corrupted data if we're using chunked storage
        await this.clearCorruptedTokenData('refresh_token').catch(() => {});
        return await this.storeChunkedToken('refresh_token', token);
      }

      // Use simple Keychain storage for shorter tokens
      await Keychain.setGenericPassword('trivia_refresh_token', token, {
        service: REFRESH_TOKEN_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
        authenticationPrompt: 'Authenticate to access your account',
      });

      logger.debug('Refresh token stored successfully in Keychain', 'AUTH_TOKEN');
      return true;
    } catch (error) {
      logger.error('Error storing refresh token', 'AUTH_TOKEN', error);
      // Only clear corrupted data if we get an error
      try {
        await this.clearCorruptedTokenData('refresh_token').catch(() => {});
      } catch (clearError) {
        // Ignore clear errors
      }

      // If direct storage fails, try chunked storage as fallback
      try {
        logger.debug('Direct storage failed, trying chunked storage', 'AUTH_TOKEN');
        return await this.storeChunkedToken('refresh_token', token);
      } catch (fallbackError) {
        logger.error('Chunked storage also failed', 'AUTH_TOKEN', fallbackError);
        return false;
      }
    }
  }

  // Get refresh token
  async getRefreshToken(): Promise<string | null> {
    try {
      // First try chunked storage
      const chunkedToken = await this.getChunkedToken('refresh_token');
      if (chunkedToken) {
        logger.debug('Refresh token retrieved from chunks', 'AUTH_TOKEN');
        return chunkedToken;
      }

      // Fallback to simple Keychain storage
      const credentials = await Keychain.getGenericPassword({
        service: REFRESH_TOKEN_SERVICE,
      });
      if (credentials) {
        logger.debug('Refresh token retrieved successfully', 'AUTH_TOKEN');
        return credentials.password;
      }
      logger.debug('No refresh token found', 'AUTH_TOKEN');
      return null;
    } catch (error) {
      logger.error('Error getting refresh token', 'AUTH_TOKEN', error);
      // If there's a parsing error, try to clear corrupted data
      if (error instanceof SyntaxError) {
        logger.debug('Syntax error detected, clearing corrupted refresh token data', 'AUTH_TOKEN');
        await this.clearCorruptedTokenData('refresh_token');
      }
      return null;
    }
  }

  // Store user data
  async storeUserData(userData: any): Promise<boolean> {
    const userDataString = JSON.stringify(userData);

    try {
      // Try to clear any existing data first
      try {
        await Keychain.resetGenericPassword({ service: USER_DATA_SERVICE });
      } catch (clearError) {
        // Ignore clear errors
      }

      // Try with different service name to avoid alias conflicts
      await Keychain.setGenericPassword('trivia_user', userDataString, {
        service: 'TriviaPay_UserData_New',
      });
      logger.debug('User data stored successfully in Keychain', 'API');
      return true;
    } catch (error) {
      logger.error('Error storing user data', 'API', error);

      // Try with even simpler approach - no service
      try {
        await Keychain.setGenericPassword('trivia_user', userDataString);
        logger.debug('User data stored successfully in Keychain (no service)', 'API');
        return true;
      } catch (fallbackError) {
        logger.error('Fallback storage also failed', 'API', fallbackError);
        return false;
      }
    }
  }

  // Get user data
  async getUserData(): Promise<any | null> {
    try {
      // Try new service name first
      let credentials = await Keychain.getGenericPassword({ service: 'TriviaPay_UserData_New' });
      if (credentials) {
        logger.debug('User data retrieved from new service', 'API');
        return JSON.parse(credentials.password);
      }

      // Fallback to old service name
      credentials = await Keychain.getGenericPassword({ service: USER_DATA_SERVICE });
      if (credentials) {
        logger.debug('User data retrieved from old service', 'API');
        return JSON.parse(credentials.password);
      }

      return null;
    } catch (error) {
      logger.error('Error getting user data', 'API', error);
      return null;
    }
  }

  // Store auth state
  async storeAuthState(authState: any): Promise<boolean> {
    try {
      const authStateString = JSON.stringify(authState);
      await Keychain.setGenericPassword('trivia_auth_state', authStateString, {
        service: AUTH_STATE_SERVICE,
      });
      logger.debug('Auth state stored successfully in Keychain', 'AUTH_TOKEN');
      return true;
    } catch (error) {
      logger.error('Error storing auth state', 'AUTH_TOKEN', error);
      return false;
    }
  }

  // Get auth state
  async getAuthState(): Promise<any | null> {
    try {
      const credentials = await Keychain.getGenericPassword({ service: AUTH_STATE_SERVICE });
      if (credentials) {
        return JSON.parse(credentials.password);
      }
      return null;
    } catch (error) {
      logger.error('Error getting auth state', 'AUTH_TOKEN', error);
      return null;
    }
  }

  // Clear all stored data (optimized for speed)
  async clearAll(): Promise<boolean> {
    try {
      // Parallelize all clear operations for better performance
      const clearPromises = [
        // Clear main services
        Keychain.resetGenericPassword({ service: AUTH_TOKEN_SERVICE }).catch(() => {}),
        Keychain.resetGenericPassword({ service: REFRESH_TOKEN_SERVICE }).catch(() => {}),
        Keychain.resetGenericPassword({ service: USER_DATA_SERVICE }).catch(() => {}),
        Keychain.resetGenericPassword({ service: 'TriviaPay_UserData_New' }).catch(() => {}),
        Keychain.resetGenericPassword({ service: AUTH_STATE_SERVICE }).catch(() => {}),
        // Clear metadata services
        Keychain.resetGenericPassword({ service: `${AUTH_TOKEN_SERVICE}_meta` }).catch(() => {}),
        Keychain.resetGenericPassword({ service: `${REFRESH_TOKEN_SERVICE}_meta` }).catch(() => {}),
        // Clear legacy service names
        Keychain.resetGenericPassword({ service: 'TriviaPay_UserData' }).catch(() => {}),
        Keychain.resetGenericPassword({ service: 'TriviaPay_AuthToken' }).catch(() => {}),
        Keychain.resetGenericPassword({ service: 'TriviaPay_RefreshToken' }).catch(() => {}),
        Keychain.resetGenericPassword({ service: 'TriviaPay_AuthState' }).catch(() => {}),
      ];

      // Clear all possible chunks in parallel (up to 20 chunks each)
      for (let i = 0; i < 20; i++) {
        clearPromises.push(
          Keychain.resetGenericPassword({ service: `${AUTH_TOKEN_SERVICE}_chunk_${i}` }).catch(
            () => {}
          ),
          Keychain.resetGenericPassword({ service: `${REFRESH_TOKEN_SERVICE}_chunk_${i}` }).catch(
            () => {}
          )
        );
      }

      // Wait for all clear operations to complete
      await Promise.all(clearPromises);
      logger.debug('All Keychain data cleared successfully', 'AUTH_TOKEN');
      return true;
    } catch (error) {
      logger.error('Error clearing Keychain data', 'AUTH_TOKEN', error);
      return false;
    }
  }

  // Clear specific service
  async clearService(service: string): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({ service });
      logger.debug(`Cleared Keychain service: ${service}`, 'API');
      return true;
    } catch (error) {
      logger.error(`Error clearing Keychain service ${service}`, 'API', error);
      return false;
    }
  }

  // Remove access token
  async removeAccessToken(): Promise<boolean> {
    try {
      // Remove from Keychain
      await Keychain.resetGenericPassword({ service: AUTH_TOKEN_SERVICE });
      logger.debug('Access token removed from Keychain', 'AUTH_TOKEN');
      return true;
    } catch (error) {
      logger.error('Error removing access token', 'AUTH_TOKEN', error);
      return false;
    }
  }

  // Remove refresh token
  async removeRefreshToken(): Promise<boolean> {
    try {
      // Remove from Keychain
      await Keychain.resetGenericPassword({ service: REFRESH_TOKEN_SERVICE });
      logger.debug('Refresh token removed from Keychain', 'AUTH_TOKEN');
      return true;
    } catch (error) {
      logger.error('Error removing refresh token', 'AUTH_TOKEN', error);
      return false;
    }
  }

  // Remove specific item
  async removeItem(key: string): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({ service: key });
      logger.debug(`Item removed: ${key}`, 'API');
      return true;
    } catch (error) {
      logger.error(`Error removing item ${key}`, 'API', error);
      return false;
    }
  }

  // Nuclear option - clear everything (optimized for speed)
  async nuclearClear(): Promise<boolean> {
    try {
      logger.debug('Nuclear clear - removing ALL possible data', 'AUTH_TOKEN');

      // Clear all possible service names in parallel
      const services = [
        'TriviaPay_UserData',
        'TriviaPay_UserData_New',
        'TriviaPay_AuthToken',
        'TriviaPay_RefreshToken',
        'TriviaPay_AuthState',
        'TriviaPay_UserData_Old',
        'TriviaPay_AuthToken_Old',
        'TriviaPay_RefreshToken_Old',
        'TriviaPay_AuthState_Old',
        'redux_persist_root',
        'root',
        'persist:root',
        AUTH_TOKEN_SERVICE,
        REFRESH_TOKEN_SERVICE,
        USER_DATA_SERVICE,
        AUTH_STATE_SERVICE,
        `${AUTH_TOKEN_SERVICE}_meta`,
        `${REFRESH_TOKEN_SERVICE}_meta`,
      ];

      const clearPromises = services.map(service =>
        Keychain.resetGenericPassword({ service }).catch(() => {})
      );

      // Clear all possible chunk patterns in parallel
      for (let i = 0; i < 20; i++) {
        clearPromises.push(
          Keychain.resetGenericPassword({ service: `TriviaPay_AuthToken_chunk_${i}` }).catch(
            () => {}
          ),
          Keychain.resetGenericPassword({ service: `TriviaPay_RefreshToken_chunk_${i}` }).catch(
            () => {}
          ),
          Keychain.resetGenericPassword({ service: `${AUTH_TOKEN_SERVICE}_chunk_${i}` }).catch(
            () => {}
          ),
          Keychain.resetGenericPassword({ service: `${REFRESH_TOKEN_SERVICE}_chunk_${i}` }).catch(
            () => {}
          )
        );
      }

      // Wait for all clear operations to complete
      await Promise.all(clearPromises);
      logger.debug('Nuclear clear completed', 'AUTH_TOKEN');
      return true;
    } catch (error) {
      logger.error('Nuclear clear failed', 'AUTH_TOKEN', error);
      return false;
    }
  }

  // Generic set method for storing any key-value pair
  async set(key: string, value: string): Promise<boolean> {
    try {
      await Keychain.setGenericPassword(key, value, {
        service: `TriviaPay_Generic_${key}`,
      });
      logger.debug(`Key ${key} stored successfully`, 'API');
      return true;
    } catch (error) {
      logger.error(`Error storing key ${key}`, 'API', error);
      return false;
    }
  }

  // Generic get method for retrieving any key-value pair
  async get(key: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: `TriviaPay_Generic_${key}`,
      });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      logger.error(`Error getting key ${key}`, 'API', error);
      return null;
    }
  }

  // Clear corrupted token data with secure cleanup
  private async clearCorruptedTokenData(tokenType: string): Promise<void> {
    try {
      logger.debug(`Clearing corrupted ${tokenType} data`, 'AUTH_TOKEN');

      // Use appropriate service for token chunks
      const tokenService =
        tokenType === 'refresh_token' ? REFRESH_TOKEN_SERVICE : AUTH_TOKEN_SERVICE;

      // Clear metadata with unique key: ${tokenType}_meta
      try {
        await Keychain.resetGenericPassword({
          service: `${tokenService}_meta`,
        });
      } catch (error) {
        // Ignore errors when clearing non-existent data
      }

      // Clear all possible chunks with unique keys: ${tokenType}_chunk_${i}
      for (let i = 0; i < 20; i++) {
        try {
          await Keychain.resetGenericPassword({
            service: `${tokenService}_chunk_${i}`,
          });
        } catch (error) {
          // Ignore errors for chunks that don't exist
        }
      }

      // Also clear the main service to ensure complete cleanup
      try {
        await Keychain.resetGenericPassword({
          service: tokenService,
        });
      } catch (error) {
        // Ignore errors when clearing non-existent data
      }

      logger.debug(`Cleared corrupted ${tokenType} data`, 'AUTH_TOKEN');
    } catch (error) {
      logger.error(`Error clearing corrupted ${tokenType} data`, 'AUTH_TOKEN', error);
    }
  }

  // Generate simple checksum for token integrity
  private generateChecksum(token: string): string {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Validate token integrity and metadata
  private validateTokenIntegrity(token: string, metadata: any): boolean {
    try {
      // Check if token is not empty
      if (!token || token.length === 0) {
        logger.warn('Token is empty', 'AUTH_TOKEN');
        return false;
      }

      // Check if token length matches expected (basic validation)
      if (token.length < 10) {
        logger.warn('Token appears to be too short', 'AUTH_TOKEN');
        return false;
      }

      // Validate checksum if available
      if (metadata.checksum && metadata.checksum !== this.generateChecksum(token)) {
        logger.warn('Token checksum validation failed', 'AUTH_TOKEN');
        return false;
      }

      // Check token age (optional - tokens older than 30 days might be suspicious)
      if (metadata.timestamp && Date.now() - metadata.timestamp > 30 * 24 * 60 * 60 * 1000) {
        logger.warn('Token is older than 30 days', 'AUTH_TOKEN');
        return false;
      }

      return true;
    } catch (error) {
      logger.warn('Token integrity validation failed', 'AUTH_TOKEN', error);
      return false;
    }
  }

  // Public method to check if tokens are stored securely
  async validateStoredTokens(): Promise<{ accessToken: boolean; refreshToken: boolean }> {
    try {
      const accessToken = await this.getAccessToken();
      const refreshToken = await this.getRefreshToken();

      return {
        accessToken: !!accessToken,
        refreshToken: !!refreshToken,
      };
    } catch (error) {
      logger.error('Error validating stored tokens', 'AUTH_TOKEN', error);
      return { accessToken: false, refreshToken: false };
    }
  }

  // Public method to clear all corrupted data
  async clearAllCorruptedData(): Promise<void> {
    try {
      logger.debug('Clearing all corrupted keychain data', 'AUTH_TOKEN');

      // Clear corrupted access token data
      await this.clearCorruptedTokenData('access_token');

      // Clear corrupted refresh token data
      await this.clearCorruptedTokenData('refresh_token');

      // Clear any legacy metadata services
      try {
        await Keychain.resetGenericPassword({ service: AUTH_TOKEN_METADATA_SERVICE });
        await Keychain.resetGenericPassword({ service: REFRESH_TOKEN_METADATA_SERVICE });
      } catch (error) {
        // Ignore errors when clearing non-existent data
      }

      // Clear any other corrupted data
      await this.clearAll();

      logger.debug('All corrupted data cleared', 'AUTH_TOKEN');
    } catch (error) {
      logger.error('Error clearing corrupted data', 'AUTH_TOKEN', error);
    }
  }

  // Public method to clear all data and start fresh
  async clearAllData(): Promise<void> {
    try {
      logger.debug('Clearing all keychain data to start fresh', 'AUTH_TOKEN');

      // Clear all token data
      await this.clearAllCorruptedData();

      // Clear user data
      try {
        await Keychain.resetGenericPassword({ service: USER_DATA_SERVICE });
        await Keychain.resetGenericPassword({ service: 'TriviaPay_UserData_New' });
      } catch (error) {
        // Ignore errors when clearing non-existent data
      }

      // Clear auth state
      try {
        await Keychain.resetGenericPassword({ service: AUTH_STATE_SERVICE });
      } catch (error) {
        // Ignore errors when clearing non-existent data
      }

      logger.debug('All keychain data cleared - ready for fresh start', 'AUTH_TOKEN');
    } catch (error) {
      logger.error('Error clearing all data', 'AUTH_TOKEN', error);
    }
  }

  // Store device ID
  async storeDeviceId(deviceId: string): Promise<boolean> {
    try {
      await Keychain.setGenericPassword('device_id', deviceId, {
        service: DEVICE_ID_SERVICE,
      });
      logger.debug('Device ID stored successfully', 'API');
      return true;
    } catch (error) {
      logger.error('Error storing device ID', 'API', error);
      return false;
    }
  }

  // Get device ID
  async getDeviceId(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: DEVICE_ID_SERVICE,
      });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      logger.error('Error getting device ID', 'API', error);
      return null;
    }
  }

  // Clear device ID
  async clearDeviceId(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: DEVICE_ID_SERVICE });
      logger.debug('Device ID cleared', 'API');
    } catch (error) {
      logger.error('Error clearing device ID', 'API', error);
    }
  }
}

export const keychainStorage = new KeychainStorage();
export default KeychainStorage;
