# Firebase Setup Guide

## 🚨 Current Issue
You're getting the error: `Firebase: Error (auth/configuration-not-found)`

This means Firebase services are not enabled in your Firebase Console.

## 🔧 Step-by-Step Setup

### Step 1: Access Firebase Console
1. Go to [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Sign in with your Google account
3. Select your project: **ttttt-13caf**

### Step 2: Enable Authentication
1. In the left sidebar, click **Authentication**
2. Click **Get started** (if you see this button)
3. Go to **Sign-in method** tab
4. Click **Email/Password**
5. Toggle **Enable** to ON
6. Click **Save**

### Step 3: Enable Firestore Database
1. In the left sidebar, click **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select a location (choose closest to your users, e.g., `us-central1`)
5. Click **Done**

### Step 4: Enable Realtime Database
1. In the left sidebar, click **Realtime Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select a location (same as Firestore)
5. Click **Done**

### Step 5: Test Your Setup
Run this command to test your Firebase setup:
```bash
node test-firebase-setup.js
```

### Step 6: Run Your App
After enabling all services, try running your app again:
```bash
npm start
```

## 🔍 Verification Checklist

Make sure you can see these in your Firebase Console:

- ✅ **Authentication** → Sign-in method → Email/Password is enabled
- ✅ **Firestore Database** → Database exists and is in test mode
- ✅ **Realtime Database** → Database exists and is in test mode
- ✅ **Project Settings** → Your app is registered

## 🚨 Common Issues

### Issue 1: "Authentication not enabled"
**Solution:** Enable Email/Password authentication in Firebase Console

### Issue 2: "Firestore not found"
**Solution:** Create Firestore database in Firebase Console

### Issue 3: "Realtime Database not found"
**Solution:** Create Realtime Database in Firebase Console

### Issue 4: "Project not found"
**Solution:** Verify project ID in Firebase Console matches your config

## 📱 Testing Authentication

Once Firebase is set up, you can test authentication:

1. **Create a test user:**
   - Email: `12345678@teacher.app`
   - Password: `default123`

2. **Or use the app:**
   - Enter any phone number (e.g., `12345678`)
   - Enter any name (e.g., `Test Teacher`)
   - The app will create the account automatically

## 🔐 Security Rules (After Setup)

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Realtime Database Rules
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

## 📞 Need Help?

If you're still having issues:

1. **Check Firebase Console:** Make sure all services are enabled
2. **Check Project ID:** Verify it matches your configuration
3. **Check Network:** Ensure you have internet connection
4. **Check Console Logs:** Look for specific error messages

## 🎯 Quick Test

After setup, run this to verify everything works:
```bash
node test-firebase-setup.js
```

You should see:
```
🎉 All Firebase services initialized successfully!
```

Then try your app again!
