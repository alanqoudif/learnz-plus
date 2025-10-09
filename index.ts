// Polyfills for React Native
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { Buffer } from '@craftzdog/react-native-buffer';
import { registerRootComponent } from 'expo';

// Make Buffer globally available
global.Buffer = Buffer;

// Polyfill for stream module
import { Readable, Writable, Duplex, Transform } from 'readable-stream';
global.stream = { Readable, Writable, Duplex, Transform };

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
