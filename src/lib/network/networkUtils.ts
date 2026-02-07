/**
 * Network Utility Functions
 * Handles network status checking and connectivity issues
 */

export interface NetworkStatus {
  isConnected: boolean;
  connectionType?: string;
  isInternetReachable?: boolean;
}

/**
 * Check if the device has internet connectivity
 */
export async function checkInternetConnectivity(): Promise<boolean> {
  try {
    // Try to fetch a simple endpoint with a short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache',
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Get network status information
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  const isConnected = await checkInternetConnectivity();

  return {
    isConnected,
    connectionType: 'unknown', // Could be enhanced with react-native-netinfo
    isInternetReachable: isConnected,
  };
}

/**
 * Wait for network connectivity with timeout
 */
export async function waitForConnectivity(timeoutMs: number = 10000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await checkInternetConnectivity()) {
      return true;
    }

    // Wait 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return false;
}

/**
 * Enhanced error message for network issues
 */
export function getNetworkErrorMessage(error: Error): string {
  if (error.name === 'AbortError') {
    return 'Request timeout - please check your internet connection and try again';
  }

  if (error.message.includes('Network request failed')) {
    return 'Network error - please check your internet connection';
  }

  if (error.message.includes('fetch')) {
    return 'Unable to connect to server - please check your internet connection';
  }

  return error.message || 'Network error occurred';
}
