import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

interface GlobalLoaderProps {
  transparent?: boolean;
  forceShow?: boolean;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({ transparent = false, forceShow = false }) => {
  const { isVisible, startTime, minDisplayTime } = useSelector(
    (state: RootState) => state.app?.globalLoader || { isVisible: false, startTime: null, minDisplayTime: 300 }
  );

  const [shouldShowState, setShouldShowState] = useState(false);
  const shouldShow = forceShow || shouldShowState;
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible) {
      setShouldShowState(true);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    } else {
      const elapsed = startTime ? Date.now() - startTime : minDisplayTime;
      const remaining = Math.max(0, minDisplayTime - elapsed);

      if (remaining > 0) {
        hideTimerRef.current = setTimeout(() => {
          setShouldShowState(false);
          hideTimerRef.current = null;
        }, remaining);
      } else {
        setShouldShowState(false);
      }
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [isVisible, startTime, minDisplayTime]);

  if (!shouldShow) {
    return null;
  }

  return (
    <View style={[styles.overlay, transparent && { backgroundColor: 'transparent' }]}>
      <View style={styles.lottieContainer}>
        <LottieView
          source={require('../../assets/animations/LoadingBar.json')}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  lottieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a7aca', // Match app theme blue
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  lottie: {
    width: 200,
    height: 200,
  },
});

export default GlobalLoader;
