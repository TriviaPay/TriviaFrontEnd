'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ImageBackground,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { resendVerificationCode, verifyEmailCode } from '../services/auth';

export default function VerifyEmailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { email } = route.params || {};
  const [code, setCode] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(59);
  const [resending, setResending] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRefs = useRef([]);
  
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        translateY.value = withSpring(-e.endCoordinates.height / 3);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        translateY.value = withSpring(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [translateY]); // Added translateY to dependencies

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => interval && clearInterval(interval);
  }, [timer]);

  const handleChange = (text, index) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const newCode = [...code];
    newCode[index] = cleaned;
    setCode(newCode);

    if (cleaned && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleConfirm = async () => {
    const enteredCode = code.join('');
    if (enteredCode.length < 4) {
      Alert.alert('Invalid Code', 'Please enter the 4-digit verification code.');
      return;
    }

    try {
      opacity.value = withTiming(0, { duration: 300 });
      const result = await verifyEmailCode(email, enteredCode);
      if (result) {
        navigation.replace('EmailVerified');
      }
    } catch (error) {
      opacity.value = withTiming(1, { duration: 300 });
      Alert.alert('Error', error.message || 'Verification failed. Try again.');
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await resendVerificationCode(email);
      setTimer(59);
    } catch (error) {
      Alert.alert('Error', 'Could not resend code. Try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1">
      <ImageBackground
        source={require('../../assets/background.png')}
        className="flex-1 w-full h-full"
      >
        <View className="absolute inset-0 bg-black/50 backdrop-blur-md" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <Animated.View style={containerStyle} className="flex-1 justify-center items-center px-6">
            <Text className="text-2xl font-bold text-white mb-2">
              Verify Your Email
            </Text>
            <Text className="text-base text-white/80 text-center mb-8">
              Enter the 4-digit code sent to {email}
            </Text>

            <View className="flex-row justify-evenly w-full mb-8">
              {code.map((value, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => (inputRefs.current[i] = ref)}
                  className="w-14 h-14 bg-white rounded-lg text-center text-2xl font-bold"
                  keyboardType="number-pad"
                  maxLength={1}
                  onChangeText={(text) => handleChange(text, i)}
                  value={value}
                />
              ))}
            </View>

            {timer > 0 ? (
              <Text className="text-red-500 mb-6">
                Code expires in {timer}s
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={resending}
                className="mb-6"
              >
                <Text className="text-blue-400 underline">
                  {resending ? 'Resending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleConfirm}
              className="bg-purple-600 w-full py-4 rounded-lg items-center"
            >
              <Text className="text-white font-bold text-lg">
                Confirm
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}