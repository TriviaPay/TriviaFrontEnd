import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

// Hooks
import { useStandardResponsive } from '../../../hooks/useStandardResponsive';

import SafeScreenWrapper from '../../../core/components/SafeScreenWrapper';

// Theme
import { typography } from '../../../theme/typography';

// Assets - TODO: Copy actual assets from TriviaPay
const triviaLogo = require('../../../../assets/home/logo.png');
const playButton = require('../../../../assets/signup/signup.png');

const WelcomeScreen = () => {
  const navigation = useNavigation<any>();

  // Responsive hook - single source of truth
  const {
    scaleFont,
    scaleWidth,
    scaleHeight,
    getVerticalSpacing,
    getHorizontalSpacing,
    width: screenWidth,
  } = useStandardResponsive();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Add safety check for animations
    try {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      // Set values directly if animation fails
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
    }
  }, []);

  const handleGetStarted = () => {
    navigation.navigate('Signup');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };



  return (
    <LinearGradient
      colors={['#6C5CE7', '#8E44AD']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeScreenWrapper
        statusBarStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <View
          style={{
            flex: 1,
            paddingTop: 0,
            paddingBottom: getVerticalSpacing(2),
            paddingHorizontal: getHorizontalSpacing(3),
          }}
        >
          {/* Main Content */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
                alignItems: 'center',
                marginBottom: getVerticalSpacing(5),
              }}
            >
              <Image
                source={triviaLogo}
                style={{
                  width: scaleWidth(screenWidth * 0.7),
                  height: scaleHeight(screenWidth * 0.7),
                  maxWidth: scaleWidth(300),
                  maxHeight: scaleHeight(300),
                }}
                resizeMode="contain"
              />
            </Animated.View>

            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                alignItems: 'center',
              }}
            >
              <Text
                style={[
                  typography.h1,
                  {
                    color: 'white',
                    fontSize: scaleFont(28),
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: getVerticalSpacing(2),
                  },
                ]}
                allowFontScaling={true}
              >
                Play Trivia, Earn Rewards
              </Text>
              <Text
                style={[
                  typography.body,
                  {
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: scaleFont(16),
                    textAlign: 'center',
                    marginBottom: getVerticalSpacing(5),
                    maxWidth: scaleWidth(screenWidth * 0.8),
                  },
                ]}
                allowFontScaling={true}
              >
                Test your knowledge with daily questions, real rewards & unlimited fun.!
              </Text>
            </Animated.View>
          </View>

          {/* Footer Buttons */}
          <View style={{ marginBottom: getVerticalSpacing(2.5) }}>
            <TouchableOpacity
              onPress={handleGetStarted}
              style={{
                alignItems: 'center',
                marginBottom: getVerticalSpacing(2),
              }}
            >
              <Image
                source={playButton}
                style={{
                  width: scaleWidth(screenWidth * 0.6),
                  height: scaleHeight(60),
                  maxWidth: scaleWidth(250),
                  maxHeight: scaleHeight(60),
                }}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              style={{
                alignItems: 'center',
              }}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: 'white',
                    fontSize: scaleFont(12),
                  },
                ]}
                allowFontScaling={true}
              >
                Already have an account? Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeScreenWrapper>
    </LinearGradient>
  );
};

export default WelcomeScreen;
