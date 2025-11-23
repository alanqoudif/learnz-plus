import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAo41EStVdJUwca8arKh0AWJyFx2AcAmco",
  authDomain: "learnzplus.firebaseapp.com",
  projectId: "learnzplus",
  storageBucket: "learnzplus.firebasestorage.app",
  messagingSenderId: "435695202976",
  appId: "1:435695202976:web:2e8a4bedfa5516f8860fc5",
  measurementId: "G-F3JNG5XVE6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const database = getDatabase(app);
export const analytics = getAnalytics(app);
export const cloudFunctions = getFunctions(app);
export const storage = getStorage(app);

export default app;

// Firestore collection names
export const COLLECTIONS = {
  TEACHERS: 'teachers',
  CLASSES: 'classes',
  STUDENTS: 'students',
  ATTENDANCE_SESSIONS: 'attendance_sessions',
  ATTENDANCE_RECORDS: 'attendance_records',
  USERS: 'users',
  SCHOOLS: 'schools'
} as const;

// Realtime Database paths
export const REALTIME_PATHS = {
  ATTENDANCE_UPDATES: 'attendance_updates',
  NOTIFICATIONS: 'notifications'
} as const;
