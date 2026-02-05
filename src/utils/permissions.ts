/**
 * Permissions Utility
 * Provides consistent permission handling for Android
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';

export type PermissionType =
  | 'camera'
  | 'storage'
  | 'audio'
  | 'location'
  | 'contacts'
  | 'notifications';

interface PermissionConfig {
  title: string;
  message: string;
  buttonNeutral?: string;
  buttonNegative: string;
  buttonPositive: string;
}

const PERMISSION_CONFIGS: Record<PermissionType, PermissionConfig> = {
  camera: {
    title: 'Camera Permission',
    message: 'App needs access to your camera to take photos',
    buttonNeutral: 'Ask Me Later',
    buttonNegative: 'Cancel',
    buttonPositive: 'OK',
  },
  storage: {
    title: 'Storage Permission',
    message: 'App needs access to your storage to save and access files',
    buttonNeutral: 'Ask Me Later',
    buttonNegative: 'Cancel',
    buttonPositive: 'OK',
  },
  audio: {
    title: 'Microphone Permission',
    message: 'App needs access to your microphone to record audio',
    buttonNeutral: 'Ask Me Later',
    buttonNegative: 'Cancel',
    buttonPositive: 'OK',
  },
  location: {
    title: 'Location Permission',
    message: 'App needs access to your location',
    buttonNeutral: 'Ask Me Later',
    buttonNegative: 'Cancel',
    buttonPositive: 'OK',
  },
  contacts: {
    title: 'Contacts Permission',
    message: 'App needs access to your contacts',
    buttonNeutral: 'Ask Me Later',
    buttonNegative: 'Cancel',
    buttonPositive: 'OK',
  },
  notifications: {
    title: 'Notification Permission',
    message: 'App needs permission to send you notifications',
    buttonNeutral: 'Ask Me Later',
    buttonNegative: 'Cancel',
    buttonPositive: 'OK',
  },
};

const PERMISSION_MAP: Record<PermissionType, string> = {
  camera: PermissionsAndroid.PERMISSIONS.CAMERA,
  storage: PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  audio: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  location: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  contacts: PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
  notifications: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
};

/**
 * Check if permission is granted
 */
export const checkPermission = async (permission: PermissionType): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS handles permissions differently
  }

  try {
    const androidPermission = PERMISSION_MAP[permission];
    if (!androidPermission) {
      return false;
    }

    const result = await PermissionsAndroid.check(androidPermission);
    return result;
  } catch (error) {
    logger.warn('Error checking permission:', 'APP', error);
    return false;
  }
};

/**
 * Request permission
 */
export const requestPermission = async (
  permission: PermissionType,
  customConfig?: Partial<PermissionConfig>
): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS handles permissions differently
  }

  try {
    // Check if already granted
    const isGranted = await checkPermission(permission);
    if (isGranted) {
      return true;
    }

    const androidPermission = PERMISSION_MAP[permission];
    if (!androidPermission) {
      return false;
    }

    const config = { ...PERMISSION_CONFIGS[permission], ...customConfig };
    const result = await PermissionsAndroid.request(androidPermission, {
      title: config.title,
      message: config.message,
      buttonNeutral: config.buttonNeutral,
      buttonNegative: config.buttonNegative,
      buttonPositive: config.buttonPositive,
    });

    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    logger.warn('Error requesting permission:', 'APP', error);
    return false;
  }
};

/**
 * Request multiple permissions
 */
export const requestMultiplePermissions = async (
  permissions: PermissionType[],
  customConfigs?: Partial<Record<PermissionType, Partial<PermissionConfig>>>
): Promise<Record<PermissionType, boolean>> => {
  if (Platform.OS !== 'android') {
    // iOS handles permissions differently
    return permissions.reduce(
      (acc, perm) => {
        acc[perm] = true;
        return acc;
      },
      {} as Record<PermissionType, boolean>
    );
  }

  try {
    const androidPermissions = permissions
      .map(perm => PERMISSION_MAP[perm])
      .filter(Boolean) as string[];

    if (androidPermissions.length === 0) {
      return permissions.reduce(
        (acc, perm) => {
          acc[perm] = false;
          return acc;
        },
        {} as Record<PermissionType, boolean>
      );
    }

    const results = await PermissionsAndroid.requestMultiple(androidPermissions);

    return permissions.reduce(
      (acc, perm) => {
        const androidPermission = PERMISSION_MAP[perm];
        acc[perm] = androidPermission
          ? results[androidPermission] === PermissionsAndroid.RESULTS.GRANTED
          : false;
        return acc;
      },
      {} as Record<PermissionType, boolean>
    );
  } catch (error) {
    logger.warn('Error requesting multiple permissions:', 'APP', error);
    return permissions.reduce(
      (acc, perm) => {
        acc[perm] = false;
        return acc;
      },
      {} as Record<PermissionType, boolean>
    );
  }
};

/**
 * Show permission denied alert
 */
export const showPermissionDeniedAlert = (permission: PermissionType) => {
  const config = PERMISSION_CONFIGS[permission];
  Alert.alert('Permission Denied', `${config.message}. Please enable it in your device settings.`, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Open Settings',
      onPress: () => {
        if (Platform.OS === 'android') {
          PermissionsAndroid.openSettings();
        }
      },
    },
  ]);
};
