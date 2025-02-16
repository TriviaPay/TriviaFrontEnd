
'use client';

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as Font from 'expo-font';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { store } from './src/store/store';
import { Auth0Provider } from 'react-native-auth0';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';
import EmailVerifiedScreen from './src/screens/EmailVerifiedScreen';
import HomeScreen from './src/screens/Homescreen';
import { AUTH0_CONFIG, AUTH0_REDIRECT_URI } from './src/services/auth0-config';
import { CardStyleInterpolators } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import "react-native-css-interop/jsx-runtime";
import "./global.css";


const Stack = createStackNavigator();

function AppNavigator() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  return (
    <Stack.Navigator
          screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 300,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 300,
            },
          },
        },
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      {isAuthenticated ? (
        <Stack.Group>
          <Stack.Screen name="Home" component={HomeScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          <Stack.Screen name="EmailVerified" component={EmailVerifiedScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
        'Poppins-Italic': require('./assets/fonts/Poppins-Italic.ttf'),
        'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#A200FF" />
      </View>
    );
  }

  return (
    <Auth0Provider
      domain={AUTH0_CONFIG.domain}
      clientId={AUTH0_CONFIG.clientId}
      redirectUri={AUTH0_REDIRECT_URI}
    >
      <Provider store={store}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </Provider>
    </Auth0Provider>
  );
}