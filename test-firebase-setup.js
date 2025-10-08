/**
 * Test Firebase setup and configuration
 */

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc } = require('firebase/firestore');
const { getDatabase, ref, set } = require('firebase/database');

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

async function testFirebaseSetup() {
  console.log('🧪 Testing Firebase setup...');
  console.log('Project ID:', firebaseConfig.projectId);
  console.log('Auth Domain:', firebaseConfig.authDomain);
  console.log('Database URL:', firebaseConfig.databaseURL);
  console.log('=====================================');
  
  try {
    // Initialize Firebase
    console.log('🔄 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');
    
    // Test Authentication
    console.log('🔄 Testing Authentication...');
    const auth = getAuth(app);
    console.log('✅ Auth service initialized');
    
    // Test Firestore
    console.log('🔄 Testing Firestore...');
    const firestore = getFirestore(app);
    console.log('✅ Firestore service initialized');
    
    // Test Realtime Database
    console.log('🔄 Testing Realtime Database...');
    const database = getDatabase(app);
    console.log('✅ Realtime Database service initialized');
    
    console.log('=====================================');
    console.log('🎉 All Firebase services initialized successfully!');
    console.log('=====================================');
    console.log('Next steps:');
    console.log('1. Enable Authentication in Firebase Console');
    console.log('2. Enable Firestore Database in Firebase Console');
    console.log('3. Enable Realtime Database in Firebase Console');
    console.log('4. Run the app again');
    
  } catch (error) {
    console.error('❌ Firebase setup test failed:', error);
    console.log('=====================================');
    console.log('Common issues:');
    console.log('1. Authentication not enabled in Firebase Console');
    console.log('2. Firestore Database not created');
    console.log('3. Realtime Database not created');
    console.log('4. Incorrect project configuration');
  }
}

// Run test
testFirebaseSetup();
