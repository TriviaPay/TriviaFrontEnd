const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Ensure Metro can resolve TypeScript/TSX files from node_modules
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
    // Resolve nested dependencies properly
    extraNodeModules: {
      'readable-stream': require.resolve('readable-stream'),
      // Polyfill Node.js built-in 'stream' module for React Native
      'stream': require.resolve('readable-stream'),
    },
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // Performance optimization
      },
    }),
  },
  // Performance optimizations
  maxWorkers: 4,
  serializer: {
    // Ensure source maps are not generated for production release (can be overridden by CLI args if needed for crash reporting tools)
    processModuleFilter: (modules) => {
      // Additional filtering can happen here if needed
      return true;
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
