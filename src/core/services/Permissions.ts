/**
 * Permissions Service
 * Cross-platform permission management
 */

import { Platform, PermissionsAndroid } from 'react-native';
import { logger } from './Logger';

type Permission = 'camera' | 'notifications' | 'storage';

class PermissionsService {
  /**
   * Request permission
   */
  async request(permission: Permission): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return this.requestIOS(permission);
    } else {
      return this.requestAndroid(permission);
    }
  }

  /**
   * Request iOS permission
   */
  private async requestIOS(permission: Permission): Promise<boolean> {
    // iOS permissions are handled via Info.plist and native prompts
    logger.info(`iOS permission requested: ${permission}`, 'PERMISSIONS');
    return true;
  }

  /**
   * Request Android permission
   */
  private async requestAndroid(permission: Permission): Promise<boolean> {
    try {
      const androidPermission = this.mapToAndroidPermission(permission);
      if (!androidPermission) return true;

      const granted = await PermissionsAndroid.request(androidPermission);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      logger.error(`Failed to request ${permission}`, 'PERMISSIONS', err);
      return false;
    }
  }

  /**
   * Map to Android permission constant
   */
  private mapToAndroidPermission(permission: Permission): string | null {
    const map: Record<Permission, string> = {
      camera: PermissionsAndroid.PERMISSIONS.CAMERA,
      notifications: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      storage: PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    };
    return map[permission] || null;
  }
}

export const permissions = new PermissionsService();
