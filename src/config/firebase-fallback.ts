import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDD_lR7JkQdhQHdtp5MV-0w1vYMSaXgZx8",
  authDomain: "ttttt-13caf.firebaseapp.com",
  projectId: "ttttt-13caf",
  storageBucket: "ttttt-13caf.firebasestorage.app",
  messagingSenderId: "631411675079",
  appId: "1:631411675079:web:565983e33c61b69ecc53e2",
  measurementId: "G-DMB83S5H0H",
  databaseURL: "https://ttttt-13caf-default-rtdb.firebaseio.com"
};

// Initialize Firebase with error handling
let app;
let auth;
let firestore;
let database;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize services with error handling
  try {
    auth = getAuth(app);
  } catch (error) {
    console.warn('⚠️ Firebase Auth not available:', error.message);
  }
  
  try {
    firestore = getFirestore(app);
  } catch (error) {
    console.warn('⚠️ Firestore not available:', error.message);
  }
  
  try {
    database = getDatabase(app);
  } catch (error) {
    console.warn('⚠️ Realtime Database not available:', error.message);
  }
  
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn('⚠️ Analytics not available:', error.message);
  }
  
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.log('Please check your Firebase configuration and ensure services are enabled in Firebase Console');
}

export { auth, firestore, database, analytics };
export default app;

// Firestore collection names
export const COLLECTIONS = {
  TEACHERS: 'teachers',
  CLASSES: 'classes',
  STUDENTS: 'students',
  ATTENDANCE_SESSIONS: 'attendance_sessions',
  ATTENDANCE_RECORDS: 'attendance_records'
} as const;

// Realtime Database paths
export const REALTIME_PATHS = {
  ATTENDANCE_UPDATES: 'attendance_updates',
  NOTIFICATIONS: 'notifications'
} as const;
