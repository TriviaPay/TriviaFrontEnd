# TriviaCoin - Production-Grade React Native App

> A complete re-architecture of TriviaPay built with Clean Architecture principles, SOLID design, and enterprise-level best practices.

## 🏗️ Architecture Overview

TriviaCoin follows **Clean Architecture** with a feature-based modular structure, ensuring:
- ✅ **Separation of Concerns** - Each layer has a single responsibility
- ✅ **Testability** - All business logic is isolated and testable
- ✅ **Scalability** - Easy to add new features without touching existing code
- ✅ **Maintainability** - Code is organized, documented, and follows best practices

### Architecture Layers

```
┌─────────────────────────────────────────────────┐
│                  Presentation                    │
│         (Screens, Components, UI)                │
├─────────────────────────────────────────────────┤
│              Application Logic                   │
│      (State Management, Navigation, Hooks)       │
├─────────────────────────────────────────────────┤
│              Domain Logic                        │
│        (Business Rules, Use Cases)               │
├─────────────────────────────────────────────────┤
│              Infrastructure                      │
│     (API Clients, Storage, External Services)    │
└─────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
triviacoin/
├── android/                  # Android native code
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml  # Deep linking configured
│   │   │   └── res/
│   │   └── build.gradle
│   ├── build.gradle
│   └── gradle.properties
├── ios/                      # iOS native code
│   ├── TriviaCoin/
│   │   ├── Info.plist       # Deep linking & universal links
│   │   └── AppDelegate.swift
│   └── Podfile
├── assets/                   # Static assets
│   ├── animations/          # Lottie animations
│   ├── images/              # Images and icons
│   ├── sounds/              # Sound effects
│   └── fonts/               # Custom fonts
├── src/
│   ├── app/                 # App bootstrap & providers
│   │   ├── App.tsx         # Main app component
│   │   ├── Providers.tsx   # All context providers
│   │   ├── RootNavigator.tsx  # Root navigation
│   │   └── ErrorBoundary.tsx  # Error handling
│   ├── core/               # Shared domain logic
│   │   ├── errors/         # Error classes & handler
│   │   │   ├── AppError.ts
│   │   │   └── ErrorHandler.ts
│   │   ├── hooks/          # Reusable hooks
│   │   │   ├── useAppState.ts
│   │   │   ├── useNetwork.ts
│   │   │   ├── useSafeArea.ts
│   │   │   ├── useMounted.ts
│   │   │   └── useDebounce.ts
│   │   ├── services/       # Core services
│   │   │   ├── Logger.ts
│   │   │   ├── Storage.ts  # MMKV storage
│   │   │   └── ApiClient.ts
│   │   ├── utils/          # Utility functions
│   │   │   ├── platform.ts
│   │   │   ├── validation.ts
│   │   │   └── format.ts
│   │   └── types/          # Shared types
│   ├── features/           # Feature modules (micro-frontends)
│   │   ├── auth/           # Authentication feature
│   │   │   ├── api/        # Auth API calls
│   │   │   ├── components/ # Auth-specific components
│   │   │   ├── hooks/      # Auth-specific hooks
│   │   │   ├── screens/    # Auth screens
│   │   │   ├── state/      # Auth state management
│   │   │   ├── types.ts    # Auth types
│   │   │   └── index.ts    # Public API
│   │   ├── wallet/         # Wallet & payments
│   │   ├── trivia/         # Trivia gameplay
│   │   ├── payments/       # Payment processing
│   │   ├── rewards/        # Rewards & shop
│   │   ├── profile/        # User profile
│   │   ├── chat/           # Live & private chat
│   │   └── daily-bonus/    # Daily bonus system
│   ├── navigation/         # Navigation configuration
│   │   ├── types.ts        # Typed navigation params
│   │   ├── routes.ts       # Route definitions
│   │   └── NavigationService.ts  # Navigation utilities
│   ├── store/              # Redux state management
│   │   ├── slices/         # Redux slices
│   │   │   ├── authSlice.ts
│   │   │   ├── userSlice.ts
│   │   │   └── appSlice.ts
│   │   ├── hooks.ts        # Typed Redux hooks
│   │   └── index.ts        # Store configuration
│   ├── ui/                 # Design system
│   │   ├── tokens/         # Design tokens
│   │   │   ├── colors.ts
│   │   │   ├── spacing.ts
│   │   │   ├── typography.ts
│   │   │   ├── borderRadius.ts
│   │   │   └── shadows.ts
│   │   ├── theme/          # Theme configuration
│   │   │   └── theme.ts
│   │   └── components/     # Reusable UI components
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Text.tsx
│   │       └── Screen.tsx
│   ├── config/             # App configuration
│   │   └── env.ts          # Environment config
│   └── tests/              # Test utilities
│       ├── setup.ts
│       ├── mocks/
│       ├── unit/
│       └── integration/
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── jest.config.js          # Jest config
├── babel.config.js         # Babel config
├── metro.config.js         # Metro bundler config
├── .eslintrc.js            # ESLint rules
└── .prettierrc.js          # Prettier rules
```

## 🚀 Tech Stack

### Core
- **React Native**: 0.81.0
- **TypeScript**: 4.8.4 (Strict mode)
- **React**: 19.1.0

### State Management
- **Redux Toolkit**: 2.2.0 - Global state
- **React Query**: 5.0.0 - Server state
- **Redux Persist**: 6.0.0 - State persistence

### Navigation
- **React Navigation**: 6.x
  - Native Stack Navigator
  - Bottom Tabs Navigator
  - Typed routes & params

### Data & Storage
- **MMKV**: 2.10.2 - Fast encrypted storage
- **Axios**: 1.12.2 - HTTP client

### UI & Animation
- **Reanimated**: 3.19.0 - 60fps animations
- **Lottie**: 7.3.0 - Complex animations
- **Fast Image**: 8.6.3 - Optimized images

### Authentication & Security
- **Descope SDK**: 0.8.1 - Auth provider
- **Crypto Libraries**: ed25519, x25519

### Payments
- **Stripe**: 0.57.0 - Payment processing

### Utilities
- **Day.js**: 1.11.18 - Date formatting
- **NetInfo**: 11.1.0 - Network status

### Developer Tools
- **ESLint**: Strict linting
- **Prettier**: Code formatting
- **Jest**: Unit & integration testing
- **Testing Library**: Component testing

## 🎯 SOLID Principles Implementation

### Single Responsibility Principle (S)
- Each module/component has one clear purpose
- Services are focused on single tasks
- Screens only handle presentation logic

### Open/Closed Principle (O)
- Feature modules can be extended without modifying core
- Plugin architecture for new features
- Configuration-driven behavior

### Liskov Substitution Principle (L)
- Proper interface inheritance
- Type safety with TypeScript
- Predictable component behavior

### Interface Segregation Principle (I)
- Small, focused interfaces
- No "god interfaces"
- Feature-specific types

### Dependency Inversion Principle (D)
- Depend on abstractions, not concretions
- Dependency injection pattern
- Mockable services for testing

## 🔥 Key Features

### Clean Architecture
- **Feature-based modules**: Each feature is self-contained
- **Clear boundaries**: No cross-feature imports
- **Dependency injection**: Services injected, not imported
- **Testable**: Business logic isolated from UI

### Performance
- ✅ MMKV for fast storage (10x faster than AsyncStorage)
- ✅ React Query for optimized server state
- ✅ Reanimated for smooth 60fps animations
- ✅ Memoization everywhere it matters
- ✅ FlatList virtualization
- ✅ Image optimization with FastImage

### Type Safety
- ✅ Strict TypeScript mode
- ✅ Typed navigation params
- ✅ Typed Redux hooks
- ✅ No `any` types allowed

### Error Handling
- ✅ Global Error Boundary
- ✅ Feature-level error boundaries
- ✅ Network error normalization
- ✅ User-friendly error messages
- ✅ Sentry integration ready

### Testing
- ✅ Jest configured
- ✅ Testing Library setup
- ✅ Mock utilities
- ✅ 70% coverage threshold

## 📱 Deep Linking

### Android
Deep linking configured in `AndroidManifest.xml`:
- Custom scheme: `triviacoin://callback`
- Universal links: `https://triviacoin.com/app/*`
- Auto-verify enabled

### iOS
Deep linking configured in `Info.plist`:
- Custom scheme: `triviacoin://`
- Universal links: `applinks:triviacoin.com`
- Associated domains enabled

## 🔧 Development Setup

### Prerequisites
- Node.js >= 16
- npm >= 8
- Xcode (for iOS)
- Android Studio (for Android)

### Installation

```bash
# Navigate to project
cd C:\Integration\triviacoin

# Install dependencies
npm install

# iOS only - Install pods
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### Development Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format

# Testing
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests

# Validation (type-check + lint + test)
npm run validate

# Clean build
npm run clean
npm run clean:android
npm run clean:ios
```

## 🏛️ Feature Module Pattern

Each feature follows this structure:

```
feature/
├── api/                  # API calls for this feature
│   └── featureApi.ts
├── components/           # Feature-specific components
│   └── FeatureComponent.tsx
├── hooks/                # Feature-specific hooks
│   └── useFeature.ts
├── screens/              # Feature screens
│   └── FeatureScreen.tsx
├── state/                # Feature state (if needed)
│   └── featureSlice.ts
├── types.ts              # Feature types
└── index.ts              # Public API (only export what's needed)
```

### Adding a New Feature

1. Create feature directory: `src/features/my-feature/`
2. Add required subdirectories
3. Implement feature logic
4. Add types to `types.ts`
5. Export public API in `index.ts`
6. Add feature slice to store
7. Add feature routes to navigation

## 🎨 Design System

### Using Design Tokens

```typescript
import { colors, spacing, typography } from '@ui/tokens';

// In styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary[500],
    padding: spacing.md,
    fontSize: typography.fontSize.lg,
  },
});
```

### Using Components

```typescript
import { Button, Card, Text, Screen } from '@ui/components';

<Screen>
  <Card>
    <Text variant="h2">Title</Text>
    <Text variant="body">Description</Text>
    <Button variant="primary" size="lg" onPress={handlePress}>
      Action
    </Button>
  </Card>
</Screen>
```

## 📊 State Management Strategy

### Global State (Redux)
- Authentication state
- User profile
- App settings

### Server State (React Query)
- API data fetching
- Caching
- Background refetching

### Local State (useState)
- Component-specific UI state
- Form inputs
- Temporary data

### Persistent State (MMKV)
- Auth tokens
- User preferences
- Offline data

## 🔐 Security

- ✅ Encrypted storage with MMKV
- ✅ Secure token management
- ✅ HTTPS only in production
- ✅ Input validation
- ✅ Sanitized error messages
- ✅ No sensitive data in logs

## 🚢 Production Checklist

Before deploying to production:

- [ ] Update API endpoints in `src/config/env.ts`
- [ ] Configure Sentry DSN
- [ ] Update Descope project IDs
- [ ] Set up Stripe production keys
- [ ] Generate Android release keystore
- [ ] Configure iOS signing certificates
- [ ] Enable ProGuard/R8 for Android
- [ ] Test deep linking on both platforms
- [ ] Run full test suite
- [ ] Perform security audit

## 📝 Code Style

- Use functional components
- Prefer hooks over classes
- Use TypeScript strictly
- Follow ESLint rules
- Format with Prettier
- Write self-documenting code
- Add comments for complex logic

## 🤝 Contributing

1. Follow the existing architecture
2. Maintain SOLID principles
3. Write tests for new features
4. Update documentation
5. Run `npm run validate` before committing

## 📄 License

Private - All rights reserved

## 👥 Team

Built with ❤️ by the TriviaCoin team

---

**Note**: This is a complete re-architecture of TriviaPay with production-grade quality, clean architecture, and enterprise-level best practices.

