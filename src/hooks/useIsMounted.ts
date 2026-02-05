/**
 * useIsMounted Hook
 * Prevents state updates on unmounted components
 *
 * Usage:
 * const isMounted = useIsMounted();
 * if (isMounted()) {
 *   setState(value);
 * }
 */

import { useRef, useEffect } from 'react';

export const useIsMounted = (): (() => boolean) => {
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return () => isMountedRef.current;
};

export default useIsMounted;
