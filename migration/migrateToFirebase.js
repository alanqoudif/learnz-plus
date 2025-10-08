/**
 * Migration script to transfer data from Supabase to Firebase
 * Run this script after setting up Firebase project
 */

const { createClient } = require('@supabase/supabase-js');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');
const { getDatabase, ref, set } = require('firebase/database');

// Supabase configuration (your old project)
const supabaseUrl = 'https://dtvfavzmrvwerupcyyau.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dmZhdnptcnZ3ZXJ1cGN5eWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NDk3MjMsImV4cCI6MjA3NTMyNTcyM30.-4z78Ss7V6manjndrblmKSKbQFZLkS5EgDICL4JKTTA';

// Firebase configuration (your new project)
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

// Initialize clients
const supabase = createClient(supabaseUrl, supabaseKey);
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);
const database = getDatabase(firebaseApp);

async function migrateTeachers() {
  console.log('🔄 Migrating teachers...');
  
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('*');
  
  if (error) {
    console.error('Error fetching teachers:', error);
    return;
  }
  
  console.log(`Found ${teachers.length} teachers to migrate`);
  
  for (const teacher of teachers) {
    try {
      await addDoc(collection(firestore, 'teachers'), {
        name: teacher.name,
        phoneNumber: teacher.phone_number,
        createdAt: new Date(teacher.created_at)
      });
      console.log(`✅ Migrated teacher: ${teacher.name}`);
    } catch (error) {
      console.error(`❌ Error migrating teacher ${teacher.name}:`, error);
    }
  }
}

async function migrateClasses() {
  console.log('🔄 Migrating classes...');
  
  const { data: classes, error } = await supabase
    .from('classes')
    .select('*');
  
  if (error) {
    console.error('Error fetching classes:', error);
    return;
  }
  
  console.log(`Found ${classes.length} classes to migrate`);
  
  for (const classItem of classes) {
    try {
      await addDoc(collection(firestore, 'classes'), {
        name: classItem.name,
        section: classItem.section,
        teacherId: classItem.teacher_id,
        createdAt: new Date(classItem.created_at)
      });
      console.log(`✅ Migrated class: ${classItem.name} - ${classItem.section}`);
    } catch (error) {
      console.error(`❌ Error migrating class ${classItem.name}:`, error);
    }
  }
}

async function migrateStudents() {
  console.log('🔄 Migrating students...');
  
  const { data: students, error } = await supabase
    .from('students')
    .select('*');
  
  if (error) {
    console.error('Error fetching students:', error);
    return;
  }
  
  console.log(`Found ${students.length} students to migrate`);
  
  for (const student of students) {
    try {
      await addDoc(collection(firestore, 'students'), {
        name: student.name,
        classId: student.class_id,
        createdAt: new Date(student.created_at)
      });
      console.log(`✅ Migrated student: ${student.name}`);
    } catch (error) {
      console.error(`❌ Error migrating student ${student.name}:`, error);
    }
  }
}

async function migrateAttendanceSessions() {
  console.log('🔄 Migrating attendance sessions...');
  
  const { data: sessions, error } = await supabase
    .from('attendance_sessions')
    .select('*');
  
  if (error) {
    console.error('Error fetching attendance sessions:', error);
    return;
  }
  
  console.log(`Found ${sessions.length} attendance sessions to migrate`);
  
  for (const session of sessions) {
    try {
      await addDoc(collection(firestore, 'attendance_sessions'), {
        classId: session.class_id,
        date: new Date(session.date),
        createdAt: new Date(session.created_at)
      });
      console.log(`✅ Migrated attendance session: ${session.id}`);
    } catch (error) {
      console.error(`❌ Error migrating attendance session ${session.id}:`, error);
    }
  }
}

async function migrateAttendanceRecords() {
  console.log('🔄 Migrating attendance records...');
  
  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('*');
  
  if (error) {
    console.error('Error fetching attendance records:', error);
    return;
  }
  
  console.log(`Found ${records.length} attendance records to migrate`);
  
  for (const record of records) {
    try {
      await addDoc(collection(firestore, 'attendance_records'), {
        studentId: record.student_id,
        classId: record.class_id,
        sessionId: record.session_id,
        status: record.status,
        attendanceTime: new Date(record.attendance_time),
        createdAt: new Date(record.created_at)
      });
      console.log(`✅ Migrated attendance record: ${record.id}`);
    } catch (error) {
      console.error(`❌ Error migrating attendance record ${record.id}:`, error);
    }
  }
}

async function setupRealtimeDatabase() {
  console.log('🔄 Setting up Realtime Database structure...');
  
  try {
    // Create initial structure for realtime features
    await set(ref(database, 'attendance_updates'), {});
    await set(ref(database, 'notifications'), {});
    console.log('✅ Realtime Database structure created');
  } catch (error) {
    console.error('❌ Error setting up Realtime Database:', error);
  }
}

async function runMigration() {
  console.log('🚀 Starting migration from Supabase to Firebase...');
  console.log('=====================================');
  
  try {
    await migrateTeachers();
    await migrateClasses();
    await migrateStudents();
    await migrateAttendanceSessions();
    await migrateAttendanceRecords();
    await setupRealtimeDatabase();
    
    console.log('=====================================');
    console.log('✅ Migration completed successfully!');
    console.log('=====================================');
    console.log('Next steps:');
    console.log('1. Update your app to use Firebase services');
    console.log('2. Test the application thoroughly');
    console.log('3. Update Firebase security rules');
    console.log('4. Consider removing Supabase project after testing');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run migration
runMigration();
