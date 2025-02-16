'use client';

import React, { useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { InteractionManager } from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from "react-redux";
import { setAuthenticated } from "../store/authSlice";

// Custom email icon component using Views
const EmailIcon = () => (
  <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ 
      width: 28,
      height: 20,
      borderWidth: 2,
      borderColor: '#2DD4BF',
      borderRadius: 4,
      position: 'relative'
    }}>
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderLeftWidth: 14,
        borderRightWidth: 14,
        borderBottomWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#2DD4BF',
        transform: [{ rotate: '180deg' }]
      }} />
    </View>
  </View>
);

// Custom checkmark icon
const CheckIcon = () => (
  <View style={{ width: 16, height: 16, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: 8,
      height: 12,
      borderRightWidth: 2,
      borderBottomWidth: 2,
      borderColor: 'white',
      transform: [{ rotate: '45deg' }]
    }} />
  </View>
);

export default function EmailVerifiedScreen() {
  const navigation = useNavigation();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const messageScale = useSharedValue(0.8);
  const buttonOpacity = useSharedValue(0);
  const dispatch = useDispatch();

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.2),
      withSpring(1)
    );
    opacity.value = withSpring(1);
    
    messageScale.value = withTiming(1, {
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    
    buttonOpacity.value = withDelay(800, withSpring(1));

    // Auto-navigate after 2 seconds
    const timer = setTimeout(() => {
      handleContinue();
    }, 2000);

    return () => clearTimeout(timer);
  }, [buttonOpacity]); // Added buttonOpacity to dependencies

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const messageStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: messageScale.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [
      { translateY: withSpring(buttonOpacity.value * 0, { damping: 15 }) }
    ],
  }));


  const handleContinue = () => {
    dispatch(setAuthenticated(true));
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };
  

  return (
    <SafeAreaView className="flex-1">
      <ImageBackground
        source={require('../../assets/background.png')}
        className="flex-1 w-full h-full"
        resizeMode="cover"
      >
        <View className="flex-1 justify-center items-center p-6">
          <Animated.View style={iconStyle} className="mb-8">
            <View className="w-20 h-20 rounded-full bg-teal-500/20 items-center justify-center">
              <EmailIcon />
              <View className="absolute right-0 bottom-0 bg-teal-500 rounded-full p-1">
                <CheckIcon />
              </View>
            </View>
          </Animated.View>

          <Animated.View style={messageStyle}>
            <View className="bg-teal-500 rounded-2xl p-6 mb-8 max-w-[280px]">
              <Text className="text-2xl font-bold text-white mb-2">Verified</Text>
              <Text className="text-white/90 text-base">
              Woohoo!! You have successfully verified the account
              </Text>
            </View>
          </Animated.View>

          <Animated.View style={buttonStyle} className="w-full max-w-[280px]">
            <TouchableOpacity
              onPress={handleContinue}
              className="bg-gradient-to-r from-purple-500 to-purple-700 py-4 px-8 rounded-full items-center"
            >
              <Text className="text-white font-semibold text-lg bg-[#8a2be2] py-2 px-4 rounded-3xl">
                Continue To App
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}