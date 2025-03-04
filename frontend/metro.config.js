// const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// /**
//  * Metro configuration
//  * https://reactnative.dev/docs/metro
//  *
//  * @type {import('metro-config').MetroConfig}
//  */
// const config = {};

// module.exports = mergeConfig(getDefaultConfig(__dirname), config);


const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

const customConfig = mergeConfig(defaultConfig, {
  transformer: {
    babelTransformerPath: require.resolve("react-native-css-transformer"),
  },
  resolver: {
    sourceExts: [...defaultConfig.resolver.sourceExts, "css"],
    assetExts: [...defaultConfig.resolver.assetExts, "png", "jpg", "jpeg", "gif", "mp3", "mp4", "wav", "ttf", "json","lottie"],
  },
});

// ✅ Apply Reanimated first, then NativeWind with global CSS
module.exports = withNativeWind(wrapWithReanimatedMetroConfig(customConfig), {
  input: "./global.css",
});
