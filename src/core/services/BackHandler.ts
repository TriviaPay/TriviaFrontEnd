/**
 * Back Handler Service
 * Android hardware back button management
 */

import { BackHandler as RNBackHandler, Alert } from 'react-native';
import { isAndroid } from '@core/utils';

class BackHandlerService {
  private listeners: Set<() => boolean> = new Set();
  private initialized = false;
  private subscription: { remove: () => void } | null = null;

  /**
   * Initialize back handler
   */
  init() {
    if (this.initialized || !isAndroid) return;

    // In RN 0.81.0, addEventListener returns a subscription object
    this.subscription = RNBackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
    this.initialized = true;
  }

  /**
   * Handle back press
   */
  private handleBackPress = (): boolean => {
    // Check custom listeners first
    for (const listener of this.listeners) {
      if (listener()) return true; // Handled
    }

    // Default: Show exit confirmation
    this.showExitConfirmation();
    return true;
  };

  /**
   * Show exit confirmation
   */
  private showExitConfirmation() {
    Alert.alert(
      'Exit App',
      'Are you sure you want to exit?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', onPress: () => RNBackHandler.exitApp() },
      ],
      { cancelable: true }
    );
  }

  /**
   * Add custom back handler
   */
  addListener(callback: () => boolean) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Cleanup
   */
  destroy() {
    if (!this.initialized) return;
    // In RN 0.81.0, use subscription.remove() instead of removeEventListener
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.listeners.clear();
    this.initialized = false;
  }
}

export const backHandler = new BackHandlerService();
