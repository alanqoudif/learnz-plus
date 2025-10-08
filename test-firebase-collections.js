/**
 * اختبار كولكشنات Firebase
 * هذا الملف لاختبار إنشاء الكولكشنات والتأكد من عملها
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');

// إعدادات Firebase
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

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// أسماء الكولكشنات
const COLLECTIONS = {
  TEACHERS: 'teachers',
  CLASSES: 'classes',
  STUDENTS: 'students',
  ATTENDANCE_SESSIONS: 'attendance_sessions',
  ATTENDANCE_RECORDS: 'attendance_records'
};

async function testFirebaseCollections() {
  console.log('🧪 بدء اختبار كولكشنات Firebase...\n');

  try {
    // 1. اختبار إنشاء معلم
    console.log('1️⃣ اختبار إنشاء معلم...');
    const teacherData = {
      name: 'معلم تجريبي',
      email: 'test@teacher.com',
      phoneNumber: 'test@teacher.com',
      createdAt: new Date(),
      lastLogin: new Date()
    };
    
    const teacherRef = await addDoc(collection(db, COLLECTIONS.TEACHERS), teacherData);
    console.log('✅ تم إنشاء المعلم بنجاح:', teacherRef.id);

    // 2. اختبار إنشاء فصل
    console.log('\n2️⃣ اختبار إنشاء فصل...');
    const classData = {
      name: 'الخامس',
      section: 'أ',
      teacherId: teacherRef.id,
      teacherEmail: 'test@teacher.com',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const classRef = await addDoc(collection(db, COLLECTIONS.CLASSES), classData);
    console.log('✅ تم إنشاء الفصل بنجاح:', classRef.id);

    // 3. اختبار إنشاء طالب
    console.log('\n3️⃣ اختبار إنشاء طالب...');
    const studentData = {
      name: 'طالب تجريبي',
      classId: classRef.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const studentRef = await addDoc(collection(db, COLLECTIONS.STUDENTS), studentData);
    console.log('✅ تم إنشاء الطالب بنجاح:', studentRef.id);

    // 4. اختبار إنشاء جلسة حضور
    console.log('\n4️⃣ اختبار إنشاء جلسة حضور...');
    const sessionData = {
      classId: classRef.id,
      date: new Date(),
      createdAt: new Date()
    };
    
    const sessionRef = await addDoc(collection(db, COLLECTIONS.ATTENDANCE_SESSIONS), sessionData);
    console.log('✅ تم إنشاء جلسة الحضور بنجاح:', sessionRef.id);

    // 5. اختبار إنشاء سجل حضور
    console.log('\n5️⃣ اختبار إنشاء سجل حضور...');
    const recordData = {
      studentId: studentRef.id,
      classId: classRef.id,
      sessionId: sessionRef.id,
      status: 'present',
      attendanceTime: new Date(),
      createdAt: new Date()
    };
    
    const recordRef = await addDoc(collection(db, COLLECTIONS.ATTENDANCE_RECORDS), recordData);
    console.log('✅ تم إنشاء سجل الحضور بنجاح:', recordRef.id);

    // 6. اختبار جلب البيانات
    console.log('\n6️⃣ اختبار جلب البيانات...');
    
    // جلب المعلمين
    const teachersSnapshot = await getDocs(collection(db, COLLECTIONS.TEACHERS));
    console.log('📊 عدد المعلمين:', teachersSnapshot.size);
    
    // جلب الفصول
    const classesSnapshot = await getDocs(collection(db, COLLECTIONS.CLASSES));
    console.log('📊 عدد الفصول:', classesSnapshot.size);
    
    // جلب الطلاب
    const studentsSnapshot = await getDocs(collection(db, COLLECTIONS.STUDENTS));
    console.log('📊 عدد الطلاب:', studentsSnapshot.size);
    
    // جلب جلسات الحضور
    const sessionsSnapshot = await getDocs(collection(db, COLLECTIONS.ATTENDANCE_SESSIONS));
    console.log('📊 عدد جلسات الحضور:', sessionsSnapshot.size);
    
    // جلب سجلات الحضور
    const recordsSnapshot = await getDocs(collection(db, COLLECTIONS.ATTENDANCE_RECORDS));
    console.log('📊 عدد سجلات الحضور:', recordsSnapshot.size);

    console.log('\n🎉 تم اختبار جميع الكولكشنات بنجاح!');
    console.log('\n📋 ملخص الاختبار:');
    console.log('✅ كولكشن المعلمين - يعمل');
    console.log('✅ كولكشن الفصول - يعمل');
    console.log('✅ كولكشن الطلاب - يعمل');
    console.log('✅ كولكشن جلسات الحضور - يعمل');
    console.log('✅ كولكشن سجلات الحضور - يعمل');

  } catch (error) {
    console.error('❌ خطأ في اختبار الكولكشنات:', error);
    console.error('تفاصيل الخطأ:', error.message);
  }
}

// تشغيل الاختبار
testFirebaseCollections();
