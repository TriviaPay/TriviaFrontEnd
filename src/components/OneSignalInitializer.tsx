/**
 * OneSignal Initializer Component
 * Registers OneSignal device with backend when user is authenticated
 */

import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { registerDeviceWithBackend } from '../services/oneSignalService';
import { logger } from '../lib/utils/logger';

/**
 * Component that automatically registers OneSignal device with backend
 * when user becomes authenticated
 */
const OneSignalInitializer: React.FC = () => {
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const hasRegisteredRef = useRef<boolean>(false);

  useEffect(() => {
    // Only register ONCE when user becomes authenticated
    // Prevent duplicate registrations
    if (isAuthenticated && token && !hasRegisteredRef.current) {
      hasRegisteredRef.current = true;
      registerDeviceWithBackend().catch((error: any) => {
        logger.warn(
          '⚠️ OneSignal device registration failed (non-critical):',
          'APP',
          error.message
        );
        // Reset on error to allow retry
        hasRegisteredRef.current = false;
      });
    } else if (!isAuthenticated) {
      // Reset when user logs out to allow re-registration on next login
      hasRegisteredRef.current = false;
    }
  }, [isAuthenticated, token]);

  // This component doesn't render anything
  return null;
};

export default OneSignalInitializer;
