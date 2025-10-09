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

// Add Node.js core modules resolution
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Exclude problematic Node.js modules
config.resolver.blockList = [
  /node_modules\/ws\/lib\/stream\.js$/,
];

module.exports = config;
