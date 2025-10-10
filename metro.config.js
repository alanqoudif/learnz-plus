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

// Exclude problematic Node.js modules and optimize bundle
config.resolver.blockList = [
  /node_modules\/ws\/lib\/stream\.js$/,
  /node_modules\/.*\/test\//,
  /node_modules\/.*\/tests\//,
  /node_modules\/.*\/__tests__\//,
  /node_modules\/.*\/\.git\//,
  /node_modules\/.*\/\.github\//,
  /node_modules\/.*\/docs\//,
  /node_modules\/.*\/examples\//,
];

// Optimize transformer for better performance
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Increase timeout for large bundles
config.transformer.asyncRequireModulePath = require.resolve('metro-runtime/src/modules/asyncRequire');

module.exports = config;
