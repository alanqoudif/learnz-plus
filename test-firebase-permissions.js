/**
 * اختبار أذونات Firebase
 * هذا الملف لاختبار الأذونات والتأكد من عملها
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');
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

async function testFirebasePermissions() {
  console.log('🧪 اختبار أذونات Firebase...\n');

  try {
    // 1. اختبار إنشاء حساب
    console.log('1️⃣ اختبار إنشاء حساب...');
    const email = 'test@teacher.com';
    const password = '123456';
    const name = 'معلم تجريبي';

    let user;
    try {
      user = await createUserWithEmailAndPassword(auth, email, password);
      console.log('✅ تم إنشاء الحساب بنجاح:', user.user.uid);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('ℹ️ الحساب موجود بالفعل، محاولة تسجيل الدخول...');
        user = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ تم تسجيل الدخول بنجاح:', user.user.uid);
      } else {
        throw error;
      }
    }

    // 2. اختبار إنشاء معلم في Firestore
    console.log('\n2️⃣ اختبار إنشاء معلم في Firestore...');
    const teacherData = {
      name: name,
      email: email,
      phoneNumber: email,
      createdAt: new Date(),
      lastLogin: new Date()
    };
    
    const teacherRef = await addDoc(collection(db, 'teachers'), teacherData);
    console.log('✅ تم إنشاء المعلم بنجاح:', teacherRef.id);

    // 3. اختبار إنشاء فصل
    console.log('\n3️⃣ اختبار إنشاء فصل...');
    const classData = {
      name: 'الخامس',
      section: 'أ',
      teacherId: teacherRef.id,
      teacherEmail: email,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const classRef = await addDoc(collection(db, 'classes'), classData);
    console.log('✅ تم إنشاء الفصل بنجاح:', classRef.id);

    // 4. اختبار إنشاء طالب
    console.log('\n4️⃣ اختبار إنشاء طالب...');
    const studentData = {
      name: 'طالب تجريبي',
      classId: classRef.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const studentRef = await addDoc(collection(db, 'students'), studentData);
    console.log('✅ تم إنشاء الطالب بنجاح:', studentRef.id);

    // 5. اختبار جلب البيانات
    console.log('\n5️⃣ اختبار جلب البيانات...');
    
    const teachersSnapshot = await getDocs(collection(db, 'teachers'));
    console.log('📊 عدد المعلمين:', teachersSnapshot.size);
    
    const classesSnapshot = await getDocs(collection(db, 'classes'));
    console.log('📊 عدد الفصول:', classesSnapshot.size);
    
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    console.log('📊 عدد الطلاب:', studentsSnapshot.size);

    console.log('\n🎉 تم اختبار الأذونات بنجاح!');
    console.log('\n📋 ملخص الاختبار:');
    console.log('✅ إنشاء حساب - يعمل');
    console.log('✅ تسجيل الدخول - يعمل');
    console.log('✅ إنشاء معلم - يعمل');
    console.log('✅ إنشاء فصل - يعمل');
    console.log('✅ إنشاء طالب - يعمل');
    console.log('✅ جلب البيانات - يعمل');

    console.log('\n🔗 يمكنك الآن رؤية البيانات في Firebase Console:');
    console.log('https://console.firebase.google.com/project/ttttt-13caf/firestore/data');

  } catch (error) {
    console.error('❌ خطأ في اختبار الأذونات:', error);
    console.error('تفاصيل الخطأ:', error.message);
    
    if (error.message.includes('Missing or insufficient permissions')) {
      console.log('\n🚨 المشكلة: قواعد الأمان لم يتم تطبيقها');
      console.log('📖 الحل: اتبع التعليمات في ملف FIREBASE_RULES_SETUP.md');
    }
  }
}

// تشغيل الاختبار
testFirebasePermissions();
