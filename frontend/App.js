"use client";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import * as Font from "expo-font";
import { Provider, useSelector } from "react-redux";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { store } from "./src/store/store";
import { Auth0Provider } from "react-native-auth0";
import SignInScreen from "./src/screens/SignInScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import HomeScreen from "./src/screens/Homescreen";
import "react-native-css-interop/jsx-runtime";
import "./global.css";

import { AUTH0_CONFIG } from "./src/services/auth0-config";

const Stack = createStackNavigator();

function Navigation() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Home" component={HomeScreen} />
      ) : (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        "Poppins-Regular": require("./assets/fonts/Poppins-Regular.ttf"),
        "Poppins-Italic": require("./assets/fonts/Poppins-Italic.ttf"),
        "Poppins-Bold": require("./assets/fonts/Poppins-Bold.ttf"),
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#A200FF" />
      </View>
    );
  }

  return (
    <Auth0Provider
      domain={AUTH0_CONFIG.domain}
      clientId={AUTH0_CONFIG.clientId}
      // If using the hook, also specify your redirectUri:
      redirectUri="triviapay://dev-82x6ztlibtkrc5bt.us.auth0.com/ios/com.triviapay.app/callback"
    >
      <Provider store={store}>
        <NavigationContainer>
          <Navigation />
        </NavigationContainer>
      </Provider>
    </Auth0Provider>
  );
}
