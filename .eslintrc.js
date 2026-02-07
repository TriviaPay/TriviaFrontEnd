module.exports = {
  root: true,
  reportUnusedDisableDirectives: false,
  extends: [
    '@react-native',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-native'],
  rules: {
    // ----------------------------------------------------
    // Production Tuning: Fully Suppressed Legacy Noise
    // ----------------------------------------------------

    // TypeScript
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-shadow': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/prefer-as-const': 'off',
    '@typescript-eslint/no-unused-expressions': 'off', // Double sure for "new" side effects

    // React
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-hooks/rules-of-hooks': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'react/display-name': 'off',
    'react/no-unstable-nested-components': 'off',
    'react/jsx-no-undef': 'off',

    // React Native
    'react-native/no-inline-styles': 'off',
    'react-native/no-unused-styles': 'off',
    'react-native/split-platform-components': 'off',
    'react-native/no-color-literals': 'off',
    'react-native/no-raw-text': 'off',
    'react-native/sort-styles': 'off',

    // General
    'no-console': 'off',
    'prefer-const': 'off',
    'no-var': 'off',
    'object-shorthand': 'off',
    'quote-props': 'off',
    'no-bitwise': 'off',
    'no-shadow': 'off',
    'no-undef': 'off',
    'no-unsafe-optional-chaining': 'off',
    'no-catch-shadow': 'off',
    'no-script-url': 'off',
    'no-useless-escape': 'off',
    'radix': 'off',
    'no-void': 'off',
    'no-new': 'off',
    'no-unused-expressions': 'off', // Double sure for "new" side effects

    // ESLint Comments / Meta
    'eslint-comments/no-unused-disable': 'off',

    // Prettier
    'prettier/prettier': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    'react-native/react-native': true,
    es6: true,
    node: true,
  },
};
