import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider, useSelector } from 'react-redux';
import { store } from './src/store/store';
import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import OtpScreen from './src/screens/OtpScreen'; 
import HomeScreen from './src/screens/HomeScreen';
import { enableScreens } from 'react-native-screens'; 
import "react-native-gesture-handler";
import "react-native-reanimated";
import './global.css';


enableScreens(); 

const Stack = createNativeStackNavigator();

const Navigation = () => {
  const { isAuthenticated } = useSelector(state => state.auth);

  useEffect(() => {
    const handleDeepLink = ({ url }) => {
      console.log('Deep link URL:', url);
    };

    Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('Initial URL:', url);
      }
    });

    return () => {
      Linking.removeEventListener('url', handleDeepLink);
    };
  }, []);

  return (
    <Stack.Navigator 
      initialRouteName={isAuthenticated ? "Home" : "Auth"}
      screenOptions={{ 
        headerShown: false,
        animation: 'fade' 
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Navigation />
      </NavigationContainer>
    </Provider>
  );
};

export default App;