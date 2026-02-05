/**
 * Navigation Service
 * Global navigation utilities
 */

import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate to a route
 */
export const navigate = <RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
};

/**
 * Go back
 */
export const goBack = () => {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
};

/**
 * Reset navigation state
 */
export const reset = (routeName: keyof RootStackParamList) => {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: routeName }],
    });
  }
};

/**
 * Push a route
 */
export const push = <RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) => {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.push(name, params));
  }
};

/**
 * Pop to top
 */
export const popToTop = () => {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.popToTop());
  }
};

/**
 * Get current route name
 */
export const getCurrentRoute = () => {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute();
  }
  return undefined;
};
