module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@app': './src/app',
          '@core': './src/core',
          '@features': './src/features',
          '@navigation': './src/navigation',
          '@store': './src/store',
          '@ui': './src/ui',
          '@config': './src/config',
          '@tests': './src/tests',
          '@assets': './assets',
        },
      },
    ],
    'react-native-reanimated/plugin', // Must be last
  ],
};

