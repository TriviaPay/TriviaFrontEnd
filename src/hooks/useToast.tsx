/**
 * Toast Notification Hook
 * Provides easy-to-use toast notifications throughout the app
 */

import { useState, useCallback } from 'react';
import Toast, { ToastType } from '../components/Toast';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

/**
 * Hook for showing toast notifications
 *
 * @example
 * ```tsx
 * const { showToast, hideToast, ToastComponent } = useToast();
 *
 * // Show success message
 * showToast('Operation successful!', 'success');
 *
 * // Show error message
 * showToast('Something went wrong', 'error');
 *
 * // In render:
 * return (
 *   <>
 *     {ToastComponent}
 *     <YourContent />
 *   </>
 * );
 * ```
 */
export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    visible: false,
  });

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3000) => {
      setToast({
        message,
        type,
        visible: true,
      });

      // Auto hide after duration
      if (duration > 0) {
        setTimeout(() => {
          hideToast();
        }, duration);
      }
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'success', duration);
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'error', duration);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'info', duration);
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => {
      showToast(message, 'warning', duration);
    },
    [showToast]
  );

  const ToastComponent = (
    <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={hideToast} />
  );

  return {
    showToast,
    hideToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    ToastComponent,
  };
};

export default useToast;
