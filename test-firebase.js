/**
 * Test script to verify Firebase connection and basic functionality
 */

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');
const { getDatabase, ref, set, get } = require('firebase/database');

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

async function testFirebaseConnection() {
  console.log('🧪 Testing Firebase connection...');
  
  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const database = getDatabase(app);
    
    console.log('✅ Firebase initialized successfully');
    
    // Test Firestore connection
    console.log('🔄 Testing Firestore connection...');
    const testCollection = collection(firestore, 'test');
    const testDoc = await addDoc(testCollection, {
      message: 'Firebase connection test',
      timestamp: new Date()
    });
    console.log('✅ Firestore test document created:', testDoc.id);
    
    // Test Realtime Database connection
    console.log('🔄 Testing Realtime Database connection...');
    const testRef = ref(database, 'test');
    await set(testRef, {
      message: 'Realtime Database test',
      timestamp: Date.now()
    });
    console.log('✅ Realtime Database test data written');
    
    // Test reading from Realtime Database
    const snapshot = await get(testRef);
    if (snapshot.exists()) {
      console.log('✅ Realtime Database test data read:', snapshot.val());
    }
    
    console.log('🎉 All Firebase services are working correctly!');
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
  }
}

// Run test
testFirebaseConnection();
