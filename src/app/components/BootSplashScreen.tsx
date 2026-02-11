import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import RNBootSplash from 'react-native-bootsplash';
import { logger } from '@core/services/Logger';

const { width } = Dimensions.get('window');

// Assets - Logo exists at assets/home/logo.png
const triviaLogo = require('../../../assets/home/logo.png');

interface BootSplashScreenProps {
  onAnimationComplete?: () => void;
  maxDuration?: number; // Maximum duration before forcing completion (default 4s)
}

/**
 * BootSplash Screen Component
 * Shows native bootsplash first, then Lottie animation (max 5 seconds), then proceeds to welcome screen
 * OPTIMIZED: Ensures smooth animation with minimum display time
 */
const BootSplashScreen: React.FC<BootSplashScreenProps> = ({
  onAnimationComplete,
  maxDuration = 4000,
}) => {
  const hasCalledComplete = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showLottie, setShowLottie] = useState(false);

  useEffect(() => {
    // Step 1: Keep native bootsplash visible briefly (500ms)
    // Step 2: Hide native bootsplash and show Lottie animation
    // Step 3: Complete after max duration or animation finish (whichever comes first, with minimum enforced)

    const showLottieTimeout = setTimeout(() => {
      // Hide native bootsplash and show Lottie after brief native bootsplash display
      RNBootSplash.hide({ fade: true }).catch(() => {
        // Silently fail if bootsplash is already hidden
      });
      setShowLottie(true);
    }, 100); // Show native bootsplash for only 100ms for faster transition

    // Maximum duration timeout
    timeoutRef.current = setTimeout(() => {
      if (!hasCalledComplete.current) {
        logger.info('BootSplashScreen: max duration reached, proceeding', 'APP');
        hasCalledComplete.current = true;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        // Ensure native bootsplash is hidden before proceeding
        RNBootSplash.hide({ fade: false }).catch(() => { });
        onAnimationComplete?.();
      }
    }, maxDuration);

    return () => {
      clearTimeout(showLottieTimeout);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [onAnimationComplete, maxDuration]);

  // Always render container to prevent native bootsplash from showing again
  // When showLottie is false, just show transparent container (native bootsplash visible behind)
  // When showLottie is true, show Lottie animation
  if (!showLottie) {
    // Return transparent container - native bootsplash is visible behind it
    return <View style={styles.transparentContainer} />;
  }

  return (
    <View style={styles.container}>
      {/* Logo Overlay */}
      <View style={styles.logoLoaderContainer}>
        <Image source={triviaLogo} style={styles.logoImage} resizeMode="contain" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#1e90ff',
    flex: 1,
    justifyContent: 'center',
  },
  logoLoaderContainer: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    position: 'absolute',
    width: '100%',
  },
  logoImage: {
    height: width * 0.45,
    maxHeight: 220,
    maxWidth: 220,
    width: width * 0.45,
    marginBottom: 20, // Space between logo and loader
  },
  transparentContainer: {
    backgroundColor: '#1e90ff',
    flex: 1,
  },
});

export default BootSplashScreen;
