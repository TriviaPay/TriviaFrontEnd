/**
 * Navigation Types
 * Proper TypeScript types for React Navigation to avoid type casting
 */

import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Root Stack Navigator Param List
export type RootStackParamList = {
  Welcome: undefined;
  Login: { email?: string } | undefined;
  Signup: undefined;
  Main: undefined;
  Profile: undefined;
  // WinnersScreen: undefined; // Removed
  Shop: undefined;
};

// Main Stack Navigator Param List
export type MainStackParamList = {
  TabNavigator: undefined;
  Shop: undefined;
  Profile: undefined;
  // WinnersScreen: undefined; // Removed
  TriviaScreen: { mode?: 'free' | 'bronze' | 'silver' | 'gold' | 'platinum' } | undefined;
  FreeTriviaScreen: undefined;
  BronzeTriviaScreen: undefined;
  SilverTriviaScreen: undefined;
  TriviaSelectionScreen: undefined;
};

// Tab Navigator Param List
export type TabParamList = {
  Home: undefined;
  Leaderboard: undefined;
  Chats: undefined;
  Shop: undefined;
  Wallet: undefined;
};

// Chat Stack Navigator Param List
export type ChatStackParamList = {
  ChatsList: undefined;
  ChatDetail: { chatId?: string; userId?: string } | undefined;
  GroupInfo: { groupId?: string } | undefined;
  StoryViewer: { storyId?: string } | undefined;
};

// Updates Stack Navigator Param List
export type UpdatesStackParamList = {
  UpdatesScreen: undefined;
};

// Navigation Props
export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type MainNavigationProp = NativeStackNavigationProp<MainStackParamList>;
export type TabNavigationProp = BottomTabNavigationProp<TabParamList>;
export type ChatNavigationProp = NativeStackNavigationProp<ChatStackParamList>;
export type UpdatesNavigationProp = NativeStackNavigationProp<UpdatesStackParamList>;

// Composite Navigation Props for nested navigators
export type CompositeMainNavigationProp = CompositeNavigationProp<
  MainNavigationProp,
  TabNavigationProp
>;

export type CompositeTabNavigationProp = CompositeNavigationProp<
  TabNavigationProp,
  RootNavigationProp
>;

// Declare global navigation type for React Navigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList { }
  }
}
