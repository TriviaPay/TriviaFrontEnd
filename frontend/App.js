// import React from "react";
// import { View, Text } from "react-native";
// import "./global.css"
// export default function App() {
//   return (
//     <View className="flex-1 items-center justify-center bg-black w-full h-full">
//       <Text className="text-white text-2xl font-bold">Hello,Trivia!</Text>
//     </View>
//   );
// }


"use client";
import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Provider } from "react-redux";
import { store } from "./store/store";
import SignupScreen from "./screens/SignupScreen";
import LoginScreen from "./screens/LoginScreen";
import EmailVerificationScreen from "./screens/EmailVerificationScreen";
import PhoneVerificationScreen from "./screens/PhoneVerificationScreen";
import OtpVerificationScreen from "./screens/OtpVerificationScreen";
import HomeScreen from "./screens/HomeScreen";
import "./global.css"

// 1) Import the "firebase.js" so that initializeApp runs before you check getApps():
import { getApps } from "firebase/app";
import "./firebase"; // Just importing ensures initializeApp is called

const Stack = createNativeStackNavigator();

function AppContent() {
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // 2) Now getApps() should detect the initialized app
    const apps = getApps();
    console.log("Firebase Apps Array:", apps); // For debugging
    if (apps.length > 0) {
      setInitializing(false);
    }
  }, []);

  if (initializing) {
    return <Text>Loading...</Text>;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Signup"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen
          name="EmailVerification"
          component={EmailVerificationScreen}
        />
        <Stack.Screen
          name="PhoneVerification"
          component={PhoneVerificationScreen}
        />
        <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

// "use client";
// import React, { useEffect, useState } from "react";
// import { Text } from "react-native";
// import { Provider } from "react-redux";
// import { store } from "./store/store";

// import { NavigationContainer } from "@react-navigation/native";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";

// import SignupScreen from "./screens/SignupScreen";
// import LoginScreen from "./screens/LoginScreen";
// import EmailVerificationScreen from "./screens/EmailVerificationScreen";
// import HomeScreen from "./screens/HomeScreen"; // No phone screen

// import { getApps } from "firebase/app";
// import "./firebase"; // ensures initializeApp is called
// import "./global.css"; // optional tailwind/global styles

// const Stack = createNativeStackNavigator();

// function AppContent() {
//   const [initializing, setInitializing] = useState(true);

//   useEffect(() => {
//     const apps = getApps();
//     console.log("Firebase Apps Array:", apps);
//     if (apps.length > 0) {
//       setInitializing(false);
//     }
//   }, []);

//   if (initializing) {
//     return <Text style={{ flex: 1, textAlign: "center", marginTop: 100 }}>Loading...</Text>;
//   }

//   return (
//     <NavigationContainer>
//       <Stack.Navigator initialRouteName="Signup" screenOptions={{ headerShown: false }}>
//         <Stack.Screen name="Signup" component={SignupScreen} />
//         <Stack.Screen name="Login" component={LoginScreen} />
//         <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
//         <Stack.Screen name="Home" component={HomeScreen} />
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }

// export default function App() {
//   return (
//     <Provider store={store}>
//       <AppContent />
//     </Provider>
//   );
// }
