const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add polyfills for React Native
config.resolver.alias = {
  ...config.resolver.alias,
  'crypto': 'react-native-crypto',
  'stream': 'readable-stream',
  'buffer': '@craftzdog/react-native-buffer',
};

// Ensure proper handling of polyfills
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
