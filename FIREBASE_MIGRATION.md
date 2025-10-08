# Migration from Supabase to Firebase

This document explains how to migrate your attendance management app from Supabase to Firebase.

## Overview

The migration includes:
- **Authentication**: Supabase Auth → Firebase Auth
- **Database**: Supabase PostgreSQL → Firestore
- **Realtime**: Supabase Realtime → Firebase Realtime Database
- **Analytics**: Firebase Analytics (new)

## Prerequisites

1. Firebase project created with your configuration
2. Firebase services enabled:
   - Authentication
   - Firestore Database
   - Realtime Database
   - Analytics

## Migration Steps

### 1. Install Dependencies

```bash
npm install firebase
```

### 2. Update Configuration

The Firebase configuration has been updated in `src/config/firebase.ts` with your project settings:

```typescript
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
```

### 3. Data Migration

Run the migration script to transfer your existing data:

```bash
node migration/migrateToFirebase.js
```

This script will:
- Migrate all teachers
- Migrate all classes
- Migrate all students
- Migrate all attendance sessions
- Migrate all attendance records
- Set up Realtime Database structure

### 4. Firebase Security Rules

#### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Teachers can only access their own data
    match /teachers/{teacherId} {
      allow read, write: if request.auth != null && request.auth.uid == teacherId;
    }
    
    // Classes can be accessed by their teacher
    match /classes/{classId} {
      allow read, write: if request.auth != null && 
        resource.data.teacherId == request.auth.uid;
    }
    
    // Students can be accessed by their class teacher
    match /students/{studentId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/classes/$(resource.data.classId)) &&
        get(/databases/$(database)/documents/classes/$(resource.data.classId)).data.teacherId == request.auth.uid;
    }
    
    // Attendance sessions can be accessed by their class teacher
    match /attendance_sessions/{sessionId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/classes/$(resource.data.classId)) &&
        get(/databases/$(database)/documents/classes/$(resource.data.classId)).data.teacherId == request.auth.uid;
    }
    
    // Attendance records can be accessed by their class teacher
    match /attendance_records/{recordId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/classes/$(resource.data.classId)) &&
        get(/databases/$(database)/documents/classes/$(resource.data.classId)).data.teacherId == request.auth.uid;
    }
  }
}
```

#### Realtime Database Rules

```json
{
  "rules": {
    "attendance_updates": {
      "$teacherId": {
        ".read": "auth != null && auth.uid == $teacherId",
        ".write": "auth != null && auth.uid == $teacherId"
      }
    },
    "notifications": {
      "$teacherId": {
        ".read": "auth != null && auth.uid == $teacherId",
        ".write": "auth != null && auth.uid == $teacherId"
      }
    }
  }
}
```

### 5. Authentication Setup

The app now uses Firebase Auth with email/password authentication. Teachers will use their phone numbers as email addresses (e.g., `12345678@teacher.app`) with a default password.

### 6. Testing

After migration, test the following features:

1. **Login/Registration**: Teachers can sign in with phone number
2. **Class Management**: Create, update, delete classes
3. **Student Management**: Add, update, delete students
4. **Attendance Recording**: Record and view attendance
5. **Realtime Updates**: Changes should sync across devices
6. **Data Persistence**: Data should persist between app sessions

## Key Changes

### Service Layer
- `src/services/supabaseService.ts` → `src/services/firebaseService.ts`
- `src/services/realtimeService.ts` → `src/services/firebaseRealtimeService.ts`

### Configuration
- `src/config/supabase.ts` → `src/config/firebase.ts`

### Authentication
- Phone number authentication using email format
- Default password: `default123`
- User metadata stored in Firebase Auth

### Database Structure
- PostgreSQL tables → Firestore collections
- UUID primary keys → Firestore document IDs
- Timestamps converted to Firestore Timestamp format

### Realtime Features
- Supabase Realtime channels → Firebase Realtime Database
- Real-time attendance updates
- Push notifications system

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure Firebase Auth is enabled
   - Check email format for phone numbers
   - Verify default password

2. **Database Permission Errors**
   - Update Firestore security rules
   - Check user authentication status
   - Verify document ownership

3. **Realtime Connection Issues**
   - Enable Realtime Database
   - Check security rules
   - Verify network connectivity

### Support

If you encounter issues during migration:
1. Check Firebase console for error logs
2. Verify all services are enabled
3. Test with a small dataset first
4. Review security rules configuration

## Rollback Plan

If you need to rollback to Supabase:
1. Keep Supabase project active during testing
2. Restore original service imports
3. Update configuration files
4. Test thoroughly before removing Supabase

## Performance Considerations

- Firestore has different pricing model than Supabase
- Consider data structure optimization
- Monitor usage in Firebase console
- Set up billing alerts

## Next Steps

After successful migration:
1. Update app store listings
2. Notify users of any changes
3. Monitor performance and costs
4. Consider additional Firebase features (Cloud Functions, Storage, etc.)
