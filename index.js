/**
 * TriviaCoin - Production Grade React Native App
 * @format
 */

// Import polyfill for crypto.getRandomValues (Reference: https://github.com/LinusU/react-native-get-random-values)
import 'react-native-get-random-values';

// Import gesture handler first (required for React Native)
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './src/app/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
