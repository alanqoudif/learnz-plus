/**
 * Comprehensive Firebase diagnostic tool
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

async function diagnoseFirebase() {
  console.log('🔍 Firebase Diagnostic Tool');
  console.log('=====================================');
  console.log('Project ID:', firebaseConfig.projectId);
  console.log('Auth Domain:', firebaseConfig.authDomain);
  console.log('Database URL:', firebaseConfig.databaseURL);
  console.log('=====================================');
  
  let app, auth, firestore, database;
  
  try {
    // Step 1: Initialize Firebase
    console.log('🔄 Step 1: Initializing Firebase...');
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized successfully');
    
    // Step 2: Test Auth Service
    console.log('\n🔄 Step 2: Testing Authentication Service...');
    try {
      auth = getAuth(app);
      console.log('✅ Auth service initialized');
      
      // Test auth configuration
      console.log('🔍 Auth configuration:');
      console.log('  - Auth domain:', auth.config.authDomain);
      console.log('  - API key present:', !!auth.config.apiKey);
      
    } catch (authError) {
      console.error('❌ Auth service failed:', authError.message);
      console.log('💡 Solution: Enable Authentication in Firebase Console');
      return;
    }
    
    // Step 3: Test Firestore
    console.log('\n🔄 Step 3: Testing Firestore...');
    try {
      firestore = getFirestore(app);
      console.log('✅ Firestore service initialized');
      
      // Try to create a test document
      const testCollection = collection(firestore, 'test');
      const testDoc = await addDoc(testCollection, {
        message: 'Firebase diagnostic test',
        timestamp: new Date()
      });
      console.log('✅ Test document created:', testDoc.id);
      
    } catch (firestoreError) {
      console.error('❌ Firestore failed:', firestoreError.message);
      console.log('💡 Solution: Enable Firestore Database in Firebase Console');
    }
    
    // Step 4: Test Realtime Database
    console.log('\n🔄 Step 4: Testing Realtime Database...');
    try {
      database = getDatabase(app);
      console.log('✅ Realtime Database service initialized');
      
      // Try to write test data
      const testRef = ref(database, 'test');
      await set(testRef, {
        message: 'Realtime Database test',
        timestamp: Date.now()
      });
      console.log('✅ Test data written to Realtime Database');
      
    } catch (databaseError) {
      console.error('❌ Realtime Database failed:', databaseError.message);
      console.log('💡 Solution: Enable Realtime Database in Firebase Console');
    }
    
    // Step 5: Test Authentication Flow
    console.log('\n🔄 Step 5: Testing Authentication Flow...');
    const testEmail = 'test12345678@teacher.app';
    const testPassword = 'default123';
    
    try {
      // Try to create a test user
      console.log('🔄 Creating test user...');
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      console.log('✅ Test user created successfully:', userCredential.user.uid);
      
      // Try to sign in with the test user
      console.log('🔄 Signing in with test user...');
      const signInCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
      console.log('✅ Sign in successful:', signInCredential.user.uid);
      
    } catch (authFlowError) {
      console.error('❌ Authentication flow failed:', authFlowError.code, authFlowError.message);
      
      if (authFlowError.code === 'auth/configuration-not-found') {
        console.log('💡 Solution: Enable Email/Password authentication in Firebase Console');
        console.log('   1. Go to Authentication → Sign-in method');
        console.log('   2. Enable Email/Password');
        console.log('   3. Save changes');
      } else if (authFlowError.code === 'auth/email-already-in-use') {
        console.log('ℹ️ Test user already exists, trying to sign in...');
        try {
          const signInCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
          console.log('✅ Sign in successful:', signInCredential.user.uid);
        } catch (signInError) {
          console.error('❌ Sign in failed:', signInError.code, signInError.message);
        }
      }
    }
    
    console.log('\n=====================================');
    console.log('🎉 Firebase Diagnostic Complete!');
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ Firebase diagnostic failed:', error);
    console.log('\n💡 Common solutions:');
    console.log('1. Check your internet connection');
    console.log('2. Verify Firebase project exists');
    console.log('3. Enable required services in Firebase Console');
    console.log('4. Check Firebase configuration');
  }
}

// Run diagnostic
diagnoseFirebase();
