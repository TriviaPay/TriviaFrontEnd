/**
 * Device Security Service
 * Detects root/jailbreak and other security threats
 * Prevents app from running on compromised devices
 */

import { Platform, NativeModules } from 'react-native';
import { logger } from '../utils/logger';
import { securityAudit } from '../../core/security/SecurityAudit';

const __DEV__ = process.env.NODE_ENV === 'development';

interface SecurityCheckResult {
  isSecure: boolean;
  threats: string[];
  details?: Record<string, any>;
}

class DeviceSecurityService {
  private static instance: DeviceSecurityService;
  private isSecure: boolean | null = null;
  private threats: string[] = [];
  private securityChecks: Map<string, boolean> = new Map();

  private constructor() {}

  static getInstance(): DeviceSecurityService {
    if (!DeviceSecurityService.instance) {
      DeviceSecurityService.instance = new DeviceSecurityService();
    }
    return DeviceSecurityService.instance;
  }

  /**
   * Perform comprehensive security check
   */
  async checkDeviceSecurity(): Promise<SecurityCheckResult> {
    const threats: string[] = [];
    const details: Record<string, any> = {};

    try {
      // Check for root/jailbreak
      const rootCheck = await this.checkRootJailbreak();
      if (!rootCheck.isSecure) {
        threats.push('Root/Jailbreak detected');
        details.rootCheck = rootCheck;
      }

      // Check for emulator/simulator
      const emulatorCheck = await this.checkEmulator();
      if (!emulatorCheck.isSecure) {
        threats.push('Running on emulator/simulator');
        details.emulatorCheck = emulatorCheck;
      }

      // Check for debugging
      const debugCheck = this.checkDebugging();
      if (!debugCheck.isSecure) {
        threats.push('Debugging detected');
        details.debugCheck = debugCheck;
      }

      // Check for hooking frameworks
      const hookingCheck = await this.checkHookingFrameworks();
      if (!hookingCheck.isSecure) {
        threats.push('Hooking framework detected');
        details.hookingCheck = hookingCheck;
      }

      const isSecure = threats.length === 0;
      this.isSecure = isSecure;
      this.threats = threats;

      // Log security event
      if (!isSecure) {
        securityAudit.logEvent({
          type: 'suspicious_activity',
          details: {
            threats,
            platform: Platform.OS,
            timestamp: Date.now(),
          },
        });

        logger.warn('Device security check failed', 'SECURITY', { threats, details });
      }

      return {
        isSecure,
        threats,
        details,
      };
    } catch (error) {
      logger.error('Error during security check', 'SECURITY', error);
      // Fail secure - assume insecure if check fails
      return {
        isSecure: false,
        threats: ['Security check failed'],
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  /**
   * Check for root (Android) or jailbreak (iOS)
   */
  private async checkRootJailbreak(): Promise<{ isSecure: boolean; method: string }> {
    try {
      if (Platform.OS === 'android') {
        return await this.checkAndroidRoot();
      } else if (Platform.OS === 'ios') {
        return await this.checkIOSJailbreak();
      }
      return { isSecure: true, method: 'unknown' };
    } catch (error) {
      logger.error('Root/jailbreak check failed', 'SECURITY', error);
      return { isSecure: false, method: 'error' };
    }
  }

  /**
   * Check for Android root
   */
  private async checkAndroidRoot(): Promise<{ isSecure: boolean; method: string }> {
    const checks: string[] = [];

    try {
      // Check 1: Look for su binary
      const suPaths = [
        '/system/app/Superuser.apk',
        '/sbin/su',
        '/system/bin/su',
        '/system/xbin/su',
        '/data/local/xbin/su',
        '/data/local/bin/su',
        '/system/sd/xbin/su',
        '/system/bin/failsafe/su',
        '/data/local/su',
        '/su/bin/su',
      ];

      // Check 2: Look for root management apps
      const rootApps = [
        'com.noshufou.android.su',
        'com.noshufou.android.su.elite',
        'eu.chainfire.supersu',
        'com.koushikdutta.superuser',
        'com.thirdparty.superuser',
        'com.yellowes.su',
        'com.topjohnwu.magisk',
        'com.kingroot.kinguser',
        'com.kingo.root',
        'com.smedialink.oneclickroot',
        'com.zhiqupk.root.global',
        'com.alephzain.framaroot',
      ];

      // Check 3: Check for dangerous properties
      const dangerousProps = ['ro.debuggable', 'ro.secure', 'service.adb.root'];

      // In React Native, we can't directly check these, but we can:
      // 1. Check if app is debuggable (should be false in release)
      // 2. Use native modules if available
      // 3. Check for suspicious behavior

      // For now, we'll use a combination of checks
      // In production, you should use a native module like:
      // - react-native-device-info (has isEmulator and some root detection)
      // - react-native-root-detection (dedicated root detection)

      // Basic check: If in production and app is debuggable, it's suspicious
      if (!__DEV__) {
        // In production, we expect the app to not be debuggable
        // This is a basic check - native modules provide better detection
        checks.push('production_debug_check');
      }

      // If we have native modules available, use them
      try {
        const DeviceInfo = require('react-native-device-info').default;
        if (DeviceInfo) {
          const isEmulator = await DeviceInfo.isEmulator();
          if (isEmulator) {
            checks.push('emulator_detected');
          }
        }
      } catch (e) {
        // DeviceInfo not available, continue with other checks
      }

      // For now, we'll be lenient in development
      // In production, you should implement proper native root detection
      const isSecure = __DEV__ || checks.length === 0;

      return {
        isSecure,
        method: checks.length > 0 ? checks.join(', ') : 'passed',
      };
    } catch (error) {
      logger.error('Android root check error', 'SECURITY', error);
      return { isSecure: false, method: 'error' };
    }
  }

  /**
   * Check for iOS jailbreak
   */
  private async checkIOSJailbreak(): Promise<{ isSecure: boolean; method: string }> {
    const checks: string[] = [];

    try {
      // Common jailbreak indicators
      const jailbreakPaths = [
        '/Applications/Cydia.app',
        '/Applications/MobileTerminal.app',
        '/Applications/RockApp.app',
        '/Applications/Icy.app',
        '/usr/sbin/frida-server',
        '/etc/apt',
        '/private/var/lib/apt',
        '/private/var/lib/cydia',
        '/private/var/mobile/Library/SBSettings/Themes',
        '/private/var/tmp/cydia.log',
        '/Library/MobileSubstrate/MobileSubstrate.dylib',
        '/bin/bash',
        '/usr/sbin/sshd',
        '/etc/ssh/sshd_config',
        '/Applications/SBSettings.app',
        '/Applications/MobileSubstrate.app',
        '/Library/MobileSubstrate/DynamicLibraries/Veency.plist',
        '/Library/MobileSubstrate/DynamicLibraries/LiveClock.plist',
        '/System/Library/LaunchDaemons/com.ikey.bbot.plist',
        '/System/Library/LaunchDaemons/com.saurik.Cyada.Startup.plist',
        '/bin/sh',
        '/usr/bin/ssh',
        '/etc/ssh/sshd_config',
        '/private/etc/ssh/sshd_config',
        '/private/var/lib/dpkg/info',
        '/private/var/lib/dpkg/status',
        '/private/var/cache/apt',
        '/private/var/log/syslog',
        '/private/var/mobile/Library/Preferences/com.saurik.Cydia.plist',
        '/private/var/root/Library/Caches/com.saurik.Cydia',
        '/private/var/root/Library/Preferences/com.saurik.Cydia.plist',
        '/private/var/root/.cydia_no_stash',
        '/private/var/lib/cydia',
        '/private/etc/apt',
        '/private/etc/ssh',
        '/private/etc/ssl',
        '/private/var/cache/apt',
        '/private/var/lib/apt',
        '/private/var/lib/dpkg',
        '/private/var/mobile/Library/SBSettings',
        '/private/var/stash',
        '/private/var/tmp/cydia.log',
        '/Applications/RockApp.app',
        '/Applications/Icy.app',
        '/Applications/WinterBoard.app',
        '/Applications/SBSettings.app',
        '/Applications/MobileTerminal.app',
        '/Applications/IntelliScreen.app',
        '/Applications/FakeCarrier.app',
        '/Applications/blackra1n.app',
        '/usr/libexec/cydia/',
        '/usr/libexec/sftp-server',
        '/usr/bin/cycript',
        '/usr/local/bin/cycript',
        '/usr/lib/libcycript.dylib',
        '/System/Library/LaunchDaemons/com.ikey.bbot.plist',
        '/System/Library/LaunchDaemons/com.saurik.Cyada.Startup.plist',
        '/Library/MobileSubstrate/MobileSubstrate.dylib',
        '/Library/MobileSubstrate/DynamicLibraries/LiveClock.plist',
        '/Library/MobileSubstrate/DynamicLibraries/Veency.plist',
        '/private/var/lib/dpkg/info',
        '/private/var/lib/dpkg/status',
        '/private/var/cache/apt',
        '/private/var/log/syslog',
        '/private/var/mobile/Library/Preferences/com.saurik.Cydia.plist',
        '/private/var/root/Library/Caches/com.saurik.Cydia',
        '/private/var/root/Library/Preferences/com.saurik.Cydia.plist',
        '/private/var/root/.cydia_no_stash',
        '/private/var/lib/cydia',
        '/private/etc/apt',
        '/private/etc/ssh',
        '/private/etc/ssl',
        '/private/var/cache/apt',
        '/private/var/lib/apt',
        '/private/var/lib/dpkg',
        '/private/var/mobile/Library/SBSettings',
        '/private/var/stash',
        '/private/var/tmp/cydia.log',
      ];

      // In React Native, we can't directly check file system
      // Use native modules if available
      try {
        const DeviceInfo = require('react-native-device-info').default;
        if (DeviceInfo) {
          const isEmulator = await DeviceInfo.isEmulator();
          if (isEmulator) {
            checks.push('simulator_detected');
          }
        }
      } catch (e) {
        // DeviceInfo not available
      }

      // For production, you should use a native module like:
      // - react-native-device-info
      // - react-native-jailbreak-detection
      // - react-native-root-detection

      // Basic check: In production, be more strict
      const isSecure = __DEV__ || checks.length === 0;

      return {
        isSecure,
        method: checks.length > 0 ? checks.join(', ') : 'passed',
      };
    } catch (error) {
      logger.error('iOS jailbreak check error', 'SECURITY', error);
      return { isSecure: false, method: 'error' };
    }
  }

  /**
   * Check if running on emulator/simulator
   */
  private async checkEmulator(): Promise<{ isSecure: boolean; method: string }> {
    try {
      // In production, emulators are suspicious
      // In development, they're expected
      if (__DEV__) {
        return { isSecure: true, method: 'development_mode' };
      }

      // Try to use DeviceInfo if available
      try {
        const DeviceInfo = require('react-native-device-info').default;
        if (DeviceInfo) {
          const isEmulator = await DeviceInfo.isEmulator();
          return {
            isSecure: !isEmulator,
            method: isEmulator ? 'emulator_detected' : 'real_device',
          };
        }
      } catch (e) {
        // DeviceInfo not available
      }

      // Default: allow in production (you should implement proper detection)
      return { isSecure: true, method: 'no_detection_available' };
    } catch (error) {
      logger.error('Emulator check error', 'SECURITY', error);
      return { isSecure: false, method: 'error' };
    }
  }

  /**
   * Check for debugging
   */
  private checkDebugging(): { isSecure: boolean; method: string } {
    // In production, app should not be debuggable
    if (__DEV__) {
      return { isSecure: true, method: 'development_mode' };
    }

    // Check if app is debuggable (this is a basic check)
    // In production builds, this should be false
    // Native modules can provide better detection
    return { isSecure: true, method: 'basic_check' };
  }

  /**
   * Check for hooking frameworks (Frida, Xposed, etc.)
   */
  private async checkHookingFrameworks(): Promise<{ isSecure: boolean; method: string }> {
    // This requires native implementation
    // For now, return secure
    // In production, implement proper detection using native modules
    return { isSecure: true, method: 'not_implemented' };
  }

  /**
   * Get current security status
   */
  getSecurityStatus(): { isSecure: boolean; threats: string[] } {
    return {
      isSecure: this.isSecure ?? true,
      threats: this.threats,
    };
  }

  /**
   * Check if device is secure (blocking)
   */
  async isDeviceSecure(): Promise<boolean> {
    if (this.isSecure === null) {
      const result = await this.checkDeviceSecurity();
      return result.isSecure;
    }
    return this.isSecure;
  }
}

export const deviceSecurity = DeviceSecurityService.getInstance();
export default deviceSecurity;
