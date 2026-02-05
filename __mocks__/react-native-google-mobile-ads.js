// Jest mock for react-native-google-mobile-ads
// Provides the minimal API used in the app so tests don’t crash.

export const RewardedAd = {
    // Mock load() returns a resolved promise.
    load: jest.fn(() => Promise.resolve()),
    // Mock show() returns a resolved promise.
    show: jest.fn(() => Promise.resolve()),
};

export const TestIds = {
    // Use test IDs that the app can reference.
    REWARDED: 'ca-app-pub-3940256099942544/5224354917',
};

export const RewardedAdEventType = {
    // Event types used in the code (no‑op functions).
    LOADED: 'loaded',
    EARNED_REWARD: 'earnedReward',
    CLOSED: 'closed',
    FAILED_TO_LOAD: 'failedToLoad',
};

// Mock the MobileAds singleton used for initialization.
export const MobileAds = {
    initialize: jest.fn(() => Promise.resolve()),
    setRequestConfiguration: jest.fn(),
};
