// Mock env vars - MUST be before any imports
process.env.DESCOPE_PROJECT_ID = 'test-descope-id';
process.env.ONESIGNAL_APP_ID = 'test-onesignal-id';
process.env.PUSHER_KEY = 'test-pusher-key';
process.env.PUSHER_CLUSTER = 'mt1';

// Mock react-native-community/netinfo - MUST be early
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  useNetInfo: jest.fn(() => ({ isConnected: true })),
}));

// Mock react-native-quick-crypto and get-random-values - MUST be early
jest.mock('react-native-get-random-values', () => ({}));
jest.mock('react-native-quick-crypto', () => ({
  randomBytes: (size: number) => new Uint8Array(size),
  createHash: () => ({
    update: jest.fn(),
    digest: jest.fn(() => 'hash'),
  }),
}));

// Mock both Loggers
const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  getInstance: jest.fn().mockReturnThis(),
  clearHistory: jest.fn(),
  getHistory: jest.fn(() => []),
};

jest.mock('../lib/utils/logger', () => ({
  logger: mockLogger,
  default: mockLogger,
}));

jest.mock('../core/services/Logger', () => ({
  logger: mockLogger,
  default: mockLogger,
}));

// Mock react-native-onesignal
jest.mock('react-native-onesignal', () => ({
  default: {
    setAppId: jest.fn(),
    promptForPushNotificationsWithUserResponse: jest.fn(),
    setNotificationOpenedHandler: jest.fn(),
    setNotificationWillShowInForegroundHandler: jest.fn(),
    setExternalUserId: jest.fn(),
    removeExternalUserId: jest.fn(),
    sendTag: jest.fn(),
    OneSignal: {
      setAppId: jest.fn(),
      promptForPushNotificationsWithUserResponse: jest.fn(),
      Notifications: {
        requestPermission: jest.fn(),
        addEventListener: jest.fn(),
      },
    },
  },
  OneSignal: {
    setAppId: jest.fn(),
    promptForPushNotificationsWithUserResponse: jest.fn(),
    Notifications: {
      requestPermission: jest.fn(),
      addEventListener: jest.fn(),
    },
  },
}));

// Mock API and Auth services
jest.mock('../services/apiService', () => ({
  apiService: {
    getRecentWinners: jest.fn(() => Promise.resolve({
      success: true,
      data: [
        { user_id: 1, username: 'winner1', money_awarded: 100 },
        { user_id: 2, username: 'winner2', money_awarded: 50 },
      ],
    })),
    getNextDraw: jest.fn(() => Promise.resolve({
      success: true,
      data: { next_draw_time: '2026-02-04T12:00:00Z', prize_pool: 1000 },
    })),
  },
}));

jest.mock('../services/authService', () => ({
  authService: {
    ensureValidToken: jest.fn(() => Promise.resolve('mock-token')),
    logout: jest.fn(() => Promise.resolve()),
    refreshAccessToken: jest.fn(() => Promise.resolve('new-token')),
  },
}));

jest.mock('../ads/InterstitialAdService', () => ({
  interstitialAdService: {
    showInterstitialAd: jest.fn(callback => {
      if (callback) callback();
      return true;
    }),
    loadAd: jest.fn(() => Promise.resolve()),
  },
}));

// Mock Redux state
const mockState = {
  auth: {
    isAuthenticated: true,
    isInitialized: true,
    user: { id: '1', email: 'test@test.com', username: 'testuser' },
    token: 'mock-token',
    isLoading: false,
  },
  app: {
    globalLoader: {
      isVisible: false,
      startTime: null,
      minDisplayTime: 1000,
    },
    theme: {
      primaryColor: '#2563EB',
      secondaryColor: '#03DAC6',
    }
  },
  dailyRewards: {
    rewards: [],
    currentDay: 1,
    showPopupOnAppOpen: false,
    isLoadingPopup: false,
    loading: false,
  },
  dailyBonus: { rewards: [], lastCollected: null },
  theme: { isDarkMode: false },
  shop: {
    userBalance: { gems: 100 },
    shopItems: {},
    loading: false,
    error: null,
    purchaseHistory: [],
  },
  sound: {
    soundEnabled: true,
    musicEnabled: true,
    notificationsEnabled: true,
    universalTapEnabled: true,
  },
  profile: {
    profile: {
      username: 'testuser',
      account_id: 1,
      total_gems: 100,
      total_trivia_coins: 500,
      is_subscribed: true,
      level: 5,
      profile_pic_url: 'https://ui-avatars.com/api/?name=User&size=128',
    },
    isLoading: false,
    error: null,
  }
};

jest.mock('react-redux', () => ({
  Provider: ({ children }: any) => children,
  useSelector: jest.fn(fn => fn(mockState)),
  useDispatch: () => jest.fn(),
  useStore: jest.fn(() => ({
    getState: () => mockState,
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  })),
  shallowEqual: (a: any, b: any) => a === b,
}));

jest.mock('redux-persist', () => ({
  ...jest.requireActual('redux-persist'),
  persistStore: jest.fn().mockReturnValue({
    pause: jest.fn(),
    persist: jest.fn(),
    purge: jest.fn(),
    flush: jest.fn(),
  }),
  persistReducer: jest.fn().mockImplementation((config, reducer) => reducer),
}));

jest.mock('redux-persist/integration/react', () => ({
  PersistGate: ({ children }: any) => children,
}));

// Mock React Native modules
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('lottie-react-native', () => {
  const React = require('react');
  class LottieView extends React.Component {
    render() { return null; }
    play() { }
    pause() { }
    resume() { }
  }
  return LottieView;
});

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
  PanGestureHandler: 'PanGestureHandler',
  TapGestureHandler: 'TapGestureHandler',
  State: {},
}));

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  enableFreeze: jest.fn(),
  ScreenContainer: 'View',
  Screen: 'View',
  NativeScreen: 'View',
  NativeScreenContainer: 'View',
  ScreenStack: 'View',
  FullWindowOverlay: 'View',
}));

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve()),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve()),
  getGenericPasswordForOptions: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: class {
    constructor() { }
    set = jest.fn();
    getString = jest.fn();
    getNumber = jest.fn();
    getBoolean = jest.fn();
    delete = jest.fn();
    clearAll = jest.fn();
    getAllKeys = jest.fn(() => []);
  },
}));

// Mock AdMob
jest.mock('react-native-google-mobile-ads', () => ({
  BannerAd: () => null,
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
  TestIds: { BANNER: 'test-banner-id' },
  InterstitialAd: {
    createForAdRequest: () => ({
      load: jest.fn(),
      show: jest.fn(),
      addAdEventListener: jest.fn(),
    }),
  },
  RewardedAd: {
    createForAdRequest: () => ({
      load: jest.fn(),
      show: jest.fn(),
      addAdEventListener: jest.fn(),
    }),
  },
  AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
  RewardedAdEventType: { LOADED: 'loaded', EARNED_REWARD: 'earned_reward' },
}));

jest.mock('react-native-sound', () => {
  class Sound {
    static MAIN_BUNDLE = 'MAIN_BUNDLE';
    static setCategory = jest.fn();
    constructor(path: string, bundle: string, callback: (error?: any) => void) {
      setTimeout(() => callback(), 0);
    }
    play = jest.fn((callback) => callback(true));
    stop = jest.fn();
    release = jest.fn();
    setVolume = jest.fn();
    setNumberOfLoops = jest.fn();
  }
  return Sound;
});

jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-bootsplash', () => ({
  hide: jest.fn().mockResolvedValue(true),
  isVisible: jest.fn().mockResolvedValue(false),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
    SafeAreaInsetsContext: React.createContext(inset),
    SafeAreaFrameContext: React.createContext(frame),
    initialWindowMetrics: { frame, insets: inset },
  };
});

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock('@descope/react-native-sdk', () => ({
  AuthProvider: ({ children }: any) => children,
  useDescope: () => ({
    logout: jest.fn(),
    session: { token: 'mock-token' },
  }),
  useSession: () => ({
    session: { token: 'mock-token' },
    clearSession: jest.fn(),
    isAuthenticated: true,
    isSessionLoading: false,
  }),
}));

// Mock lazy screen loader
jest.mock('../utils/lazyScreenLoader', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    createLazyScreen: jest.fn(() => (props: any) => React.createElement(View, props)),
    withLazyScreen: jest.fn((comp: any) => comp),
  };
});

// Mock feature screens
const mockScreen = (name: string) => {
  const React = require('react');
  const { View } = require('react-native');
  return () => React.createElement(View, { testID: name });
};

jest.mock('../features/profile/screens/ProfileScreen', () => mockScreen('ProfileScreen'));
jest.mock('../features/shop/screens/ShopScreen', () => mockScreen('ShopScreen'));
jest.mock('../features/home/screens/UpdatesScreen', () => mockScreen('UpdatesScreen'));
jest.mock('../features/leaderboard/screens/LeaderboardScreen', () => mockScreen('LeaderboardScreen'));
jest.mock('../features/wallet/screens/WalletScreen', () => mockScreen('WalletScreen'));
jest.mock('../features/trivia/screens/FreeTriviaScreen', () => mockScreen('FreeTriviaScreen'));
jest.mock('../features/chat/screens/ChatsScreen', () => mockScreen('ChatsScreen'));
jest.mock('../features/chat/screens/ChatDetailScreen', () => mockScreen('ChatDetailScreen'));
jest.mock('../features/chat/screens/GroupInfoScreen', () => mockScreen('GroupInfoScreen'));
jest.mock('../features/chat/screens/StoryViewerScreen', () => mockScreen('StoryViewerScreen'));
jest.mock('../features/trivia/screens/TriviaScreen', () => mockScreen('TriviaScreen'));
jest.mock('../features/trivia/screens/BronzeTriviaScreen', () => mockScreen('BronzeTriviaScreen'));
jest.mock('../features/trivia/screens/SilverTriviaScreen', () => mockScreen('SilverTriviaScreen'));
jest.mock('../features/trivia/screens/TriviaSelectionScreen', () => mockScreen('TriviaSelectionScreen'));
jest.mock('../features/settings/screens/SettingsScreen', () => mockScreen('SettingsScreen'));

// Mock Initializers and UI fragments
jest.mock('../components/GlobalLoader', () => () => null);
jest.mock('../components/ChatInitializer', () => () => null);
jest.mock('../components/OneSignalInitializer', () => () => null);
jest.mock('../components/daily-bonus/daily-bonus-popup', () => () => null);
jest.mock('../components/AdBanner', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => React.createElement(View);
});

// Mock API slices
jest.mock('../store/api/baseApi', () => ({
  baseApi: {
    injectEndpoints: jest.fn().mockReturnThis(),
    reducerPath: 'api',
    reducer: (state = {}) => state,
    middleware: (store: any) => (next: any) => (action: any) => next(action),
  },
}));

const mockApi = {
  injectEndpoints: jest.fn().mockReturnThis(),
  useQuery: jest.fn(() => ({ data: {}, isLoading: false })),
  useMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
};

jest.mock('../store/api/profileApi', () => ({
  ...mockApi,
  useGetProfileQuery: jest.fn(() => ({ data: mockState.profile.profile, isLoading: false })),
  profileApi: mockApi,
}));

jest.mock('../store/api/dailyLoginApi', () => ({
  ...mockApi,
  useGetDailyLoginStatusQuery: jest.fn(() => ({ data: {}, isLoading: false })),
  dailyLoginApi: mockApi,
}));

// Mock Audio
jest.mock('../lib/audio/sound-manager', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
    playSound: jest.fn().mockResolvedValue(undefined),
    playNotification: jest.fn(),
    stopContinuousBackgroundMusic: jest.fn(),
    startContinuousBackgroundMusic: jest.fn(),
  },
}));

jest.mock('../lib/audio/AudioManagerSafe', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(undefined),
    initializeInBackground: jest.fn(),
    playBackgroundMusic: jest.fn().mockResolvedValue(undefined),
    stopBackgroundMusic: jest.fn().mockResolvedValue(undefined),
    playSound: jest.fn().mockResolvedValue(undefined),
    isSoundEnabled: true,
  },
}));

// Mock Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    canGoBack: jest.fn(() => true),
    dispatch: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    setOptions: jest.fn(),
    isFocused: jest.fn(() => true),
  }),
  useRoute: () => ({ params: {} }),
  useIsFocused: () => true,
  useFocusEffect: (callback: any) => callback(),
}));

jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    createNativeStackNavigator: jest.fn(() => ({
      Navigator: ({ children, initialRouteName }: any) => {
        const React = require('react');
        const childrenArray = React.Children.toArray(children);
        let index = 0;
        if (initialRouteName) {
          index = childrenArray.findIndex((child: any) => child.props.name === initialRouteName);
          if (index === -1) index = 0;
        }
        const activeChild = childrenArray[index];
        return activeChild || null;
      },
      Screen: ({ component: Component, children, name }: any) => {
        const React = require('react');
        return React.createElement(View, { testID: `StackScreen_${name}` },
          Component ? React.createElement(Component) : (typeof children === 'function' ? children() : children)
        );
      },
      Group: ({ children }: any) => children,
    })),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    createBottomTabNavigator: jest.fn(() => ({
      Navigator: ({ children, initialRouteName, tabBar }: any) => {
        const React = require('react');
        const childrenArray = React.Children.toArray(children);
        const [activeIndex, setActiveIndex] = React.useState(() => {
          const idx = initialRouteName ? childrenArray.findIndex((c: any) => c.props.name === initialRouteName) : 0;
          return idx === -1 ? 0 : idx;
        });

        const mockState = {
          index: activeIndex,
          routes: childrenArray.map((c: any) => ({ name: c.props.name, key: c.props.name })),
        };

        const descriptors = {};
        childrenArray.forEach((c: any) => {
          (descriptors as any)[c.props.name] = { options: c.props.options || {} };
        });

        const activeChild = childrenArray[activeIndex];

        const mockNavigation = {
          navigate: jest.fn((name: string) => {
            const newIndex = childrenArray.findIndex((c: any) => c.props.name === name);
            if (newIndex !== -1) setActiveIndex(newIndex);
          }),
          emit: jest.fn(() => ({ defaultPrevented: false })),
        };

        return React.createElement(View, { style: { flex: 1 } },
          tabBar ? tabBar({ state: mockState, descriptors, navigation: mockNavigation }) : null,
          activeChild
        );
      },
      Screen: ({ component: Component, children, name }: any) => {
        const React = require('react');
        return React.createElement(View, { testID: `TabScreen_${name}`, style: { flex: 1 } },
          Component ? React.createElement(Component) : (typeof children === 'function' ? children() : children)
        );
      },
    })),
  };
});

// Mock Pusher
jest.mock('@pusher/pusher-websocket-react-native', () => {
  const mockPusher = {
    init: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue({
      bind: jest.fn(),
      unbind: jest.fn(),
    }),
    unsubscribe: jest.fn().mockResolvedValue(undefined),
    getSocketId: jest.fn().mockResolvedValue('mock-socket-id'),
  };
  return {
    Pusher: { getInstance: () => mockPusher },
  };
});

// Provide global Platform
(global as any).Platform = { OS: 'ios', select: (opts: any) => opts.ios };

// Provide global performance polyfill
if (!(global as any).performance) {
  (global as any).performance = {
    now: () => Date.now(),
  };
}

// Fix for React 18/19 and testing-library
(global as any).IS_REACT_ACT_ENVIRONMENT = true;
