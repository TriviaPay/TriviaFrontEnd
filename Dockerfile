# Multi-stage Dockerfile for React Native Android Build
# Stage 1: Build Environment
FROM reactnativecommunity/react-native-android:latest AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Set environment variables for build
ARG ENV=production
ENV ENV=$ENV

# Run the build command
# This creates the release APK
RUN cd android && ./gradlew assembleRelease

# Stage 2: Artifact Export
FROM alpine:latest AS artifact
WORKDIR /artifacts
COPY --from=builder /app/android/app/build/outputs/apk/release/app-release.apk ./triviacoin-release.apk

# Container will exit, but the artifact can be extracted using --output
CMD ["ls", "-l"]
