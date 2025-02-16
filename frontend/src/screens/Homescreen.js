
'use client';

import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logoutWithAuth0 } from '../services/auth';
import { setUnauthenticated } from '../store/authSlice';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function HomeScreen() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const navigation = useNavigation();

  const handleLogout = async () => {
    try {
      await logoutWithAuth0();
      dispatch(setUnauthenticated());
      navigation.reset({
        index: 0,
        routes: [{ name: 'SignIn' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        <Animated.View 
          entering={FadeInDown.duration(1000)}
          className="p-5"
        >
          <View className="flex-row justify-between items-center mb-8">
            <View>
              <Text className="text-2xl font-bold text-gray-900">
                Welcome back,
              </Text>
              <Text className="text-lg text-gray-700">
                {user?.name || user?.email }
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              className="bg-gray-100 px-4 py-2 rounded-full"
            >
              <Text className="text-gray-900">Logout</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-gray-50 rounded-xl p-5 mb-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              Quick Stats
            </Text>
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-2xl font-bold text-gray-900">12</Text>
                <Text className="text-gray-600">Games</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-gray-900">324</Text>
                <Text className="text-gray-600">Points</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-gray-900">8</Text>
                <Text className="text-gray-600">Rank</Text>
              </View>
            </View>
          </View>

          <Text className="text-xl font-bold text-gray-900 mb-4">
            Recent Activity
          </Text>
          {[1, 2, 3].map((item) => (
            <Animated.View
              key={item}
              entering={FadeInDown.delay(item * 200)}
              className="bg-gray-50 p-4 rounded-xl mb-3 flex-row items-center"
            >
              <View className="w-10 h-10 bg-gray-200 rounded-full mr-4" />
              <View className="flex-1">
                <Text className="font-bold text-gray-900">Game #{item}</Text>
                <Text className="text-gray-600">2 hours ago</Text>
              </View>
              <Text className="font-bold text-gray-900">+25 pts</Text>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}