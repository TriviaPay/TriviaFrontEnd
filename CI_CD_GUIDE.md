# CI/CD Build Guide - Triviacoin

This guide explains how to build production-ready Android and iOS artifacts using the newly implemented infrastructure.

## 1. Android Builds (Dockerized)

The easiest way to build the Android APK/Bundle is using Docker, which ensures a consistent build environment.

### Using Docker Compose
```bash
# Build the release APK
docker-compose up --build
```
The resulting APK will be saved in the `./build-artifacts` directory.

### Using Dockerfile Directly
```bash
# Build the image
docker build -t triviacoin-android .

# Extract the APK
docker run --rm triviacoin-android cat /artifacts/triviacoin-release.apk > triviacoin-release.apk
```

## 2. iOS Builds

iOS builds require a macOS environment with Xcode.

### Preparation
```bash
npm install
cd ios && pod install && cd ..
```

### Build Command
```bash
npx react-native build-ios --mode Release
```
Alternatively, use the configuration provided in `.detoxrc.js` for CI-specific builds.

## 3. Environment Variable Injection

The build system is configured to use `react-native-config`. You must provide the correct `.env` file during the build.

- **Development**: `.env.development`
- **Staging**: `.env.staging`
- **Production**: `.env.production`

For Android, you can specify the env file using:
```bash
ENVFILE=.env.production ./gradlew assembleRelease
```

## 4. Automated Testing in CI

Professional testing is integrated into the pipeline:

### Unit & UI Tests
```bash
npm run test
```

### End-to-End (Detox)
```bash
# Build for E2E
npm run detox:build:release

# Run E2E tests
npm run test:e2e:release
```

## 5. Artifact Storage

Ensure that `*.apk` and `*.ipa` files are uploaded as "Artifacts" in your CI provider (GitHub Actions, GitLab CI, Jenkins, etc.) for distribution.
