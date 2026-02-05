/**
 * useNetwork Hook
 * Monitor network connectivity
 */

import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export const useNetwork = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [networkType, setNetworkType] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? false);
      setNetworkType(state.type);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isConnected, networkType };
};
