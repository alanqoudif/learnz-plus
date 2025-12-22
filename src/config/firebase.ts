import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAo41EStVdJUwca8arKh0AWJyFx2AcAmco",
  authDomain: "learnzplus.firebaseapp.com",
  databaseURL: "https://learnzplus-default-rtdb.firebaseio.com",
  projectId: "learnzplus",
  storageBucket: "learnzplus.firebasestorage.app",
  messagingSenderId: "435695202976",
  appId: "1:435695202976:web:2e8a4bedfa5516f8860fc5",
  measurementId: "G-F3JNG5XVE6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with React Native persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error: any) {
  if (error?.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    console.warn('Failed to initialize auth with persistence, using getAuth (no persistence):', error?.message ?? error);
    auth = getAuth(app);
  }
}

export { auth };

// Initialize Firebase services
export const firestore = getFirestore(app);
export const database = getDatabase(app);
export const cloudFunctions = getFunctions(app);
export const storage = getStorage(app);

// Initialize Analytics only if supported (web environment with cookies/IndexedDB)
let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
isAnalyticsSupported().then((supported) => {
  if (supported) {
    analyticsInstance = getAnalytics(app);
  }
}).catch(() => {
  // Analytics not supported in this environment
  console.log('Firebase Analytics is not supported in this environment');
});

export const analytics = analyticsInstance;

export default app;

// Firestore collection names
export const COLLECTIONS = {
  TEACHERS: 'teachers',
  CLASSES: 'classes',
  STUDENTS: 'students',
  ATTENDANCE_SESSIONS: 'attendance_sessions',
  ATTENDANCE_RECORDS: 'attendance_records',
  USERS: 'users',
  SCHOOLS: 'schools',
  TEACHER_CODES: 'teacher_codes'
} as const;

// Realtime Database paths
export const REALTIME_PATHS = {
  ATTENDANCE_UPDATES: 'attendance_updates',
  NOTIFICATIONS: 'notifications'
} as const;
