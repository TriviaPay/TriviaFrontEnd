import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { logger } from '../../lib/utils/logger';

const { width } = Dimensions.get('window');

// Assets
const triviaLogo = require('../../../assets/home/logo.png');

interface BootSplashScreenProps {
  onAnimationComplete?: () => void;
}

/**
 * BootSplash Screen Component
 * Shows native bootsplash first, then Lottie animation (max 5 seconds), then proceeds to welcome screen
 */
const BootSplashScreen: React.FC<BootSplashScreenProps> = ({ onAnimationComplete }) => {
  const hasCalledComplete = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showLottie, setShowLottie] = useState(false);

  useEffect(() => {
    // Step 1: Keep native bootsplash visible briefly (500ms)
    // Step 2: Hide native bootsplash and show Lottie animation
    // Step 3: Complete after max 5 seconds total

    const showLottieTimeout = setTimeout(() => {
      // Hide native bootsplash and show Lottie after brief native bootsplash display
      BootSplash.hide({ fade: false }).catch(() => {
        // Silently fail if bootsplash is already hidden
      });
      setShowLottie(true);
    }, 500); // Show native bootsplash for 500ms first

    // Maximum 5 seconds total timeout - ensure we always proceed
    timeoutRef.current = setTimeout(() => {
      if (!hasCalledComplete.current) {
        logger.debug('BootSplashScreen: 5 second timeout reached, proceeding', 'API');
        hasCalledComplete.current = true;
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        // Ensure native bootsplash is hidden before proceeding
        BootSplash.hide({ fade: false }).catch(() => { });
        onAnimationComplete?.();
      }
    }, 5000); // 5 seconds total (500ms native + 4.5s Lottie max)

    return () => {
      clearTimeout(showLottieTimeout);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [onAnimationComplete]);

  const handleAnimationFinish = () => {
    if (!hasCalledComplete.current) {
      hasCalledComplete.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Ensure native bootsplash is hidden before proceeding
      BootSplash.hide({ fade: false }).catch(() => { });
      onAnimationComplete?.();
    }
  };

  // Always render container to prevent native bootsplash from showing again
  // When showLottie is false, just show transparent container (native bootsplash visible behind)
  // When showLottie is true, show Lottie animation
  if (!showLottie) {
    // Return transparent container - native bootsplash is visible behind it
    return <View style={styles.transparentContainer} />;
  }

  return (
    <View style={styles.container}>
      {/* Lottie Background Animation */}
      <LottieView
        ref={lottieRef}
        source={require('../../../assets/signup/Background.json')}
        autoPlay
        loop={false}
        style={styles.lottieAnimation}
        onAnimationFinish={handleAnimationFinish}
      />
      {/* Logo Overlay */}
      <View style={styles.logoContainer}>
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
  logoContainer: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    position: 'absolute',
    width: '100%',
  },
  logoImage: {
    height: width * 0.4,
    maxHeight: 200,
    maxWidth: 200,
    width: width * 0.4,
  },
  lottieAnimation: {
    height: '100%',
    position: 'absolute',
    width: '100%',
  },
  transparentContainer: {
    backgroundColor: '#1e90ff',
    flex: 1,
  },
});

export default BootSplashScreen;
