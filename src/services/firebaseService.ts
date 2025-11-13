import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  ref, 
  set, 
  push, 
  onValue, 
  off,
  remove
} from 'firebase/database';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  User
} from 'firebase/auth';
import { firestore, database, auth, COLLECTIONS, REALTIME_PATHS } from '../config/firebase';
import { Teacher, Class, Student, AttendanceSession, AttendanceRecord } from '../types';

// Helper function to convert Firestore timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  if (timestamp && timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date(timestamp);
};

// Helper function to convert Date to Firestore timestamp
const dateToTimestamp = (date: Date) => {
  return Timestamp.fromDate(date);
};

// خدمة المعلمين
export const teacherService = {
  // إنشاء معلم جديد في كولكشن المعلمين
  async createTeacher(teacher: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
    try {
      console.log('إنشاء معلم جديد في Firebase:', teacher.name);
      
      const docRef = await addDoc(collection(firestore, COLLECTIONS.TEACHERS), {
        name: teacher.name,
        email: teacher.phoneNumber, // استخدام البريد الإلكتروني كمعرف
        phoneNumber: teacher.phoneNumber,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });

      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('فشل في إنشاء المعلم');
      }

      const data = docSnap.data();
      const newTeacher = {
        id: docRef.id,
        name: data.name,
        phoneNumber: data.email, // استخدام البريد الإلكتروني كمعرف
        createdAt: timestampToDate(data.createdAt)
      };

      console.log('تم إنشاء المعلم بنجاح:', newTeacher.id);
      return newTeacher;
    } catch (error: any) {
      console.error('خطأ في إنشاء المعلم:', error);
      throw error;
    }
  },

  // إنشاء أو تحديث معلم من Firebase Auth
  async createOrUpdateTeacherFromAuth(user: any): Promise<Teacher> {
    try {
      console.log('إنشاء/تحديث معلم من Firebase Auth:', user.uid);
      
      const teacherData = {
        name: user.displayName || 'معلم',
        email: user.email,
        phoneNumber: user.email, // استخدام البريد الإلكتروني كمعرف
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };

      // البحث عن المعلم الموجود
      const q = query(
        collection(firestore, COLLECTIONS.TEACHERS),
        where('email', '==', user.email)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // تحديث المعلم الموجود
        const doc = querySnapshot.docs[0];
        await updateDoc(doc.ref, {
          name: teacherData.name,
          lastLogin: serverTimestamp()
        });
        
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          phoneNumber: data.email,
          createdAt: timestampToDate(data.createdAt)
        };
      } else {
        // إنشاء معلم جديد
        const docRef = await addDoc(collection(firestore, COLLECTIONS.TEACHERS), teacherData);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          throw new Error('فشل في إنشاء المعلم');
        }

        const data = docSnap.data();
        return {
          id: docRef.id,
          name: data.name,
          phoneNumber: data.email,
          createdAt: timestampToDate(data.createdAt)
        };
      }
    } catch (error: any) {
      console.error('خطأ في إنشاء/تحديث المعلم:', error);
      throw error;
    }
  },

  // البحث عن معلم برقم الهاتف
  async findTeacherByPhone(phoneNumber: string): Promise<Teacher | null> {
    const q = query(
      collection(firestore, COLLECTIONS.TEACHERS),
      where('phoneNumber', '==', phoneNumber)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      name: data.name,
      phoneNumber: data.phoneNumber,
      createdAt: timestampToDate(data.createdAt)
    };
  },

  // تحديث بيانات المعلم
  async updateTeacher(id: string, updates: Partial<Omit<Teacher, 'id' | 'createdAt'>>): Promise<Teacher> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.phoneNumber) updateData.phoneNumber = updates.phoneNumber;

    const docRef = doc(firestore, COLLECTIONS.TEACHERS, id);
    await updateDoc(docRef, updateData);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('المعلم غير موجود');
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      phoneNumber: data.phoneNumber,
      createdAt: timestampToDate(data.createdAt)
    };
  },
};

// خدمة الفصول الدراسية
export const classService = {
  // إنشاء فصل جديد في كولكشن الفصول
  async createClass(classData: Omit<Class, 'id' | 'createdAt' | 'students'>): Promise<Class> {
    try {
      console.log('إنشاء فصل جديد في Firebase:', classData.name);
      
      const docRef = await addDoc(collection(firestore, COLLECTIONS.CLASSES), {
        name: classData.name,
        section: classData.section,
        teacherId: classData.teacherId,
        teacherEmail: classData.teacherId, // حفظ البريد الإلكتروني أيضاً
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('تم إنشاء الفصل بنجاح في Firebase:', docRef.id);
      
      return {
        id: docRef.id,
        name: classData.name,
        section: classData.section,
        teacherId: classData.teacherId,
        students: [],
        createdAt: new Date()
      };
    } catch (error: any) {
      console.error('خطأ في إنشاء الفصل:', error.code, error.message);
      
      // إذا كان الخطأ بسبب عدم تفعيل Firestore
      if (error.code === 'permission-denied' || 
          error.message.includes('PERMISSION_DENIED') ||
          error.message.includes('Missing or insufficient permissions')) {
        console.log('Firestore غير مُفعل، يرجى تفعيله في Firebase Console');
        throw new Error('يرجى تفعيل Firestore Database في Firebase Console');
      }
      
      throw error;
    }
  },

  // جلب جميع فصول المعلم
  async getClassesByTeacher(teacherId: string): Promise<Class[]> {
    try {
      console.log('Getting classes from Firebase for teacher:', teacherId);
      
      const q = query(
        collection(firestore, COLLECTIONS.CLASSES),
        where('teacherId', '==', teacherId)
      );

      const querySnapshot = await getDocs(q);
      const classes: Class[] = [];

      for (const classDoc of querySnapshot.docs) {
        const classData = classDoc.data();
        
        // جلب الطلاب لهذا الفصل
        const studentsQuery = query(
          collection(firestore, COLLECTIONS.STUDENTS),
          where('classId', '==', classDoc.id)
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        const students: Student[] = studentsSnapshot.docs.map(studentDoc => {
          const studentData = studentDoc.data();
          return {
            id: studentDoc.id,
            name: studentData.name,
            classId: studentData.classId,
            createdAt: timestampToDate(studentData.createdAt)
          };
        });

        classes.push({
          id: classDoc.id,
          name: classData.name,
          section: classData.section,
          teacherId: classData.teacherId,
          students: students.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()), // ترتيب الطلاب محلياً
          createdAt: timestampToDate(classData.createdAt)
        });
      }

      // ترتيب الفصول محلياً بدلاً من قاعدة البيانات
      classes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log('Found classes in Firebase:', classes.length);
      return classes;
    } catch (error: any) {
      console.error('Firebase getClassesByTeacher error:', error.code, error.message);
      
      // إذا كان الخطأ بسبب عدم تفعيل Firestore
      if (error.code === 'permission-denied' || 
          error.message.includes('PERMISSION_DENIED') ||
          error.message.includes('Missing or insufficient permissions')) {
        console.log('Firestore not configured, throwing error for fallback');
        throw new Error('يرجى تفعيل Firestore Database في Firebase Console');
      }
      
      // إذا كان الخطأ بسبب الحاجة لفهرس
      if (error.code === 'failed-precondition' || 
          error.message.includes('requires an index')) {
        console.log('Index required, trying simplified query');
        // محاولة استعلام أبسط بدون ترتيب
        try {
          const simpleQuery = query(
            collection(firestore, COLLECTIONS.CLASSES),
            where('teacherId', '==', teacherId)
          );
          const simpleSnapshot = await getDocs(simpleQuery);
          const simpleClasses: Class[] = simpleSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              section: data.section,
              teacherId: data.teacherId,
              students: [], // سنحمل الطلاب لاحقاً
              createdAt: timestampToDate(data.createdAt)
            };
          });
          console.log('Found classes with simplified query:', simpleClasses.length);
          return simpleClasses;
        } catch (simpleError) {
          console.error('Simplified query also failed:', simpleError);
          throw error;
        }
      }
      
      throw error;
    }
  },

  // تحديث فصل
  async updateClass(id: string, updates: Partial<Omit<Class, 'id' | 'createdAt' | 'students' | 'teacherId'>>): Promise<Class> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.section) updateData.section = updates.section;

    const docRef = doc(firestore, COLLECTIONS.CLASSES, id);
    await updateDoc(docRef, updateData);

    // جلب الطلاب
    const studentsQuery = query(
      collection(firestore, COLLECTIONS.STUDENTS),
      where('classId', '==', id),
      orderBy('createdAt', 'asc')
    );
    
    const studentsSnapshot = await getDocs(studentsQuery);
    const students: Student[] = studentsSnapshot.docs.map(studentDoc => {
      const studentData = studentDoc.data();
      return {
        id: studentDoc.id,
        name: studentData.name,
        classId: studentData.classId,
        createdAt: timestampToDate(studentData.createdAt)
      };
    });

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('الفصل غير موجود');
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      section: data.section,
      teacherId: data.teacherId,
      students,
      createdAt: timestampToDate(data.createdAt)
    };
  },

  // حذف فصل
  async deleteClass(id: string): Promise<void> {
    // حذف سجلات الحضور أولاً
    const attendanceRecordsQuery = query(
      collection(firestore, COLLECTIONS.ATTENDANCE_RECORDS),
      where('classId', '==', id)
    );
    const attendanceRecordsSnapshot = await getDocs(attendanceRecordsQuery);
    const deletePromises = attendanceRecordsSnapshot.docs.map(doc => deleteDoc(doc.ref));

    // حذف جلسات الحضور
    const attendanceSessionsQuery = query(
      collection(firestore, COLLECTIONS.ATTENDANCE_SESSIONS),
      where('classId', '==', id)
    );
    const attendanceSessionsSnapshot = await getDocs(attendanceSessionsQuery);
    const sessionDeletePromises = attendanceSessionsSnapshot.docs.map(doc => deleteDoc(doc.ref));

    // حذف الطلاب
    const studentsQuery = query(
      collection(firestore, COLLECTIONS.STUDENTS),
      where('classId', '==', id)
    );
    const studentsSnapshot = await getDocs(studentsQuery);
    const studentsDeletePromises = studentsSnapshot.docs.map(doc => deleteDoc(doc.ref));

    // تنفيذ جميع عمليات الحذف
    await Promise.all([
      ...deletePromises,
      ...sessionDeletePromises,
      ...studentsDeletePromises
    ]);

    // حذف الفصل
    const classRef = doc(firestore, COLLECTIONS.CLASSES, id);
    await deleteDoc(classRef);
  },
};

// خدمة الطلاب
export const studentService = {
  // إضافة طالب جديد في كولكشن الطلاب
  async createStudent(student: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
    try {
      console.log('إضافة طالب جديد في Firebase:', student.name);
      
      const docRef = await addDoc(collection(firestore, COLLECTIONS.STUDENTS), {
        name: student.name,
        classId: student.classId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('تم إضافة الطالب بنجاح في Firebase:', docRef.id);
      
      return {
        id: docRef.id,
        name: student.name,
        classId: student.classId,
        createdAt: new Date()
      };
    } catch (error: any) {
      console.error('خطأ في إضافة الطالب:', error);
      throw error;
    }
  },

  // تحديث بيانات الطالب
  async updateStudent(id: string, updates: Partial<Omit<Student, 'id' | 'createdAt' | 'classId'>>): Promise<Student> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;

    const docRef = doc(firestore, COLLECTIONS.STUDENTS, id);
    await updateDoc(docRef, updateData);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('الطالب غير موجود');
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      classId: data.classId,
      createdAt: timestampToDate(data.createdAt)
    };
  },

  // حذف طالب
  async deleteStudent(id: string): Promise<void> {
    // حذف سجلات الحضور أولاً
    const attendanceRecordsQuery = query(
      collection(firestore, COLLECTIONS.ATTENDANCE_RECORDS),
      where('studentId', '==', id)
    );
    const attendanceRecordsSnapshot = await getDocs(attendanceRecordsQuery);
    const deletePromises = attendanceRecordsSnapshot.docs.map(doc => deleteDoc(doc.ref));

    await Promise.all(deletePromises);

    // حذف الطالب
    const studentRef = doc(firestore, COLLECTIONS.STUDENTS, id);
    await deleteDoc(studentRef);
  },
};

// خدمة الحضور والغياب
export const attendanceService = {
  // إنشاء جلسة حضور جديدة
  async createAttendanceSession(session: Omit<AttendanceSession, 'id' | 'createdAt' | 'records'>): Promise<AttendanceSession> {
    const docRef = await addDoc(collection(firestore, COLLECTIONS.ATTENDANCE_SESSIONS), {
      classId: session.classId,
      date: dateToTimestamp(session.date),
      createdAt: serverTimestamp()
    });

    return {
      id: docRef.id,
      classId: session.classId,
      date: session.date,
      records: [],
      createdAt: new Date()
    };
  },

  // تسجيل حضور/غياب
  async recordAttendance(record: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord> {
    console.log('حفظ سجل الحضور في قاعدة البيانات:', {
      studentId: record.studentId,
      sessionId: record.sessionId,
      status: record.status,
      attendanceTime: record.attendanceTime.toISOString(),
      localTime: record.attendanceTime.toLocaleString('ar-SA', { timeZone: 'Asia/Muscat' }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: record.attendanceTime.getTime()
    });

    // البحث عن سجل موجود
    const existingQuery = query(
      collection(firestore, COLLECTIONS.ATTENDANCE_RECORDS),
      where('studentId', '==', record.studentId),
      where('sessionId', '==', record.sessionId || '')
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    let docRef;
    if (!existingSnapshot.empty) {
      // تحديث السجل الموجود
      docRef = existingSnapshot.docs[0].ref;
      await updateDoc(docRef, {
        status: record.status,
        attendanceTime: dateToTimestamp(record.attendanceTime)
      });
    } else {
      // إنشاء سجل جديد
      docRef = await addDoc(collection(firestore, COLLECTIONS.ATTENDANCE_RECORDS), {
        studentId: record.studentId,
        classId: record.classId,
        sessionId: record.sessionId || '',
        status: record.status,
        attendanceTime: dateToTimestamp(record.attendanceTime),
        createdAt: serverTimestamp()
      });
    }

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('فشل في حفظ سجل الحضور');
    }

    const data = docSnap.data();
    const result = {
      id: docSnap.id,
      studentId: data.studentId,
      classId: data.classId,
      sessionId: data.sessionId,
      status: data.status,
      attendanceTime: timestampToDate(data.attendanceTime),
      createdAt: timestampToDate(data.createdAt)
    };

    console.log('تم حفظ سجل الحضور بنجاح:', {
      id: result.id,
      studentId: result.studentId,
      status: result.status,
      attendanceTime: result.attendanceTime.toLocaleString('ar-SA', { timeZone: 'Asia/Muscat' }),
      rawAttendanceTime: result.attendanceTime.toISOString()
    });

    return result;
  },

  // جلب جلسات الحضور لفصل معين مع تحسين الأداء
  async getAttendanceSessionsByClass(classId: string, maxResults: number = 10): Promise<AttendanceSession[]> {
    console.log(`تحميل جلسات الحضور للفصل: ${classId} (limit: ${maxResults})`);
    
    // جلب الجلسات بدون orderBy لتجنب مشكلة الـ index
    const sessionsQuery = query(
      collection(firestore, COLLECTIONS.ATTENDANCE_SESSIONS),
      where('classId', '==', classId),
      limit(maxResults)
    );

    const sessionsSnapshot = await getDocs(sessionsQuery);
    const sessions: AttendanceSession[] = [];

    // جلب جميع السجلات للجلسات في استعلام واحد
    if (sessionsSnapshot.docs.length > 0) {
      const sessionIds = sessionsSnapshot.docs.map(doc => doc.id);
      
      // استعلام واحد لجميع السجلات
      const recordsQuery = query(
        collection(firestore, COLLECTIONS.ATTENDANCE_RECORDS),
        where('sessionId', 'in', sessionIds)
      );
      
      const recordsSnapshot = await getDocs(recordsQuery);
      
      // تجميع السجلات حسب sessionId
      const recordsBySession: { [sessionId: string]: AttendanceRecord[] } = {};
      recordsSnapshot.docs.forEach(recordDoc => {
        const recordData = recordDoc.data();
        const sessionId = recordData.sessionId;
        
        if (!recordsBySession[sessionId]) {
          recordsBySession[sessionId] = [];
        }
        
        recordsBySession[sessionId].push({
          id: recordDoc.id,
          studentId: recordData.studentId,
          classId: recordData.classId,
          sessionId: recordData.sessionId,
          status: recordData.status,
          attendanceTime: timestampToDate(recordData.attendanceTime),
          createdAt: timestampToDate(recordData.createdAt)
        });
      });

      // بناء الجلسات مع سجلاتها
      sessionsSnapshot.docs.forEach(sessionDoc => {
        const sessionData = sessionDoc.data();
        const sessionId = sessionDoc.id;
        
        sessions.push({
          id: sessionId,
          classId: sessionData.classId,
          date: timestampToDate(sessionData.date),
          createdAt: timestampToDate(sessionData.createdAt),
          records: (recordsBySession[sessionId] || []).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        });
      });
    }

    // ترتيب الجلسات يدوياً حسب التاريخ (الأحدث أولاً)
    sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    console.log(`تم تحميل ${sessions.length} جلسة`);
    return sessions;
  },

  // جلب سجل حضور طالب معين
  async getStudentAttendanceHistory(studentId: string, classId: string): Promise<AttendanceRecord[]> {
    const q = query(
      collection(firestore, COLLECTIONS.ATTENDANCE_RECORDS),
      where('studentId', '==', studentId),
      where('classId', '==', classId)
    );

    const querySnapshot = await getDocs(q);
    
    const records = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        studentId: data.studentId,
        classId: data.classId,
        sessionId: data.sessionId,
        status: data.status,
        attendanceTime: timestampToDate(data.attendanceTime),
        createdAt: timestampToDate(data.createdAt)
      };
    });

    // ترتيب السجلات محلياً
    return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },
};

// خدمة المصادقة
export const authService = {
  // تسجيل الدخول بالبريد الإلكتروني
  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      console.log('محاولة تسجيل الدخول بالبريد الإلكتروني:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('تم تسجيل الدخول بنجاح:', userCredential.user.uid);
      
      // إنشاء أو تحديث المعلم في كولكشن المعلمين
      try {
        await teacherService.createOrUpdateTeacherFromAuth(userCredential.user);
        console.log('تم إنشاء/تحديث المعلم في كولكشن المعلمين');
      } catch (teacherError) {
        console.warn('تحذير: فشل في إنشاء/تحديث المعلم في كولكشن المعلمين:', teacherError);
        // لا نرمي خطأ هنا لأن تسجيل الدخول نجح
      }
      
      return userCredential.user;
    } catch (error: any) {
      console.error('خطأ في تسجيل الدخول:', error.code, error.message);
      
      // إذا كان الخطأ بسبب عدم تفعيل Authentication
      if (error.code === 'auth/configuration-not-found' || 
          error.code === 'auth/operation-not-allowed' ||
          error.message.includes('PERMISSION_DENIED')) {
        console.log('Firebase Auth غير مُفعل، يرجى تفعيله في Firebase Console');
        throw new Error('يرجى تفعيل Authentication في Firebase Console');
      }
      
      // ترجمة رسائل الخطأ للعربية
      let errorMessage = error.message;
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'المستخدم غير موجود';
          break;
        case 'auth/wrong-password':
          errorMessage = 'كلمة المرور غير صحيحة';
          break;
        case 'auth/invalid-email':
          errorMessage = 'البريد الإلكتروني غير صحيح';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'تم تجاوز عدد المحاولات المسموح، حاول لاحقاً';
          break;
        default:
          errorMessage = 'حدث خطأ أثناء تسجيل الدخول';
      }
      
      throw new Error(errorMessage);
    }
  },

  // تسجيل الدخول برقم الهاتف
  async signInWithPhone(phoneNumber: string, password: string): Promise<User> {
    try {
      console.log('Attempting to sign in with phone:', phoneNumber);
      
      // في Firebase، سنستخدم البريد الإلكتروني بدلاً من رقم الهاتف
      const email = `${phoneNumber}@teacher.app`;
      console.log('Using email:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful:', userCredential.user.uid);
      return userCredential.user;
    } catch (error: any) {
      console.error('Sign in error:', error.code, error.message);
      throw error;
    }
  },

  // إنشاء حساب جديد
  async createAccount(email: string, password: string, name: string): Promise<User> {
    try {
      console.log('إنشاء حساب جديد للبريد الإلكتروني:', email);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('تم إنشاء الحساب بنجاح:', userCredential.user.uid);
      
      // تحديث اسم المستخدم
      try {
        await updateProfile(userCredential.user, {
          displayName: name
        });
        console.log('تم تحديث ملف المستخدم بالاسم:', name);
      } catch (profileError) {
        console.warn('تحذير: لم يتم تحديث ملف المستخدم:', profileError);
        // لا نرمي خطأ هنا لأن الحساب تم إنشاؤه بنجاح
      }

      // إنشاء المعلم في كولكشن المعلمين
      try {
        await teacherService.createOrUpdateTeacherFromAuth(userCredential.user);
        console.log('تم إنشاء المعلم في كولكشن المعلمين');
      } catch (teacherError) {
        console.warn('تحذير: فشل في إنشاء المعلم في كولكشن المعلمين:', teacherError);
        // لا نرمي خطأ هنا لأن الحساب تم إنشاؤه بنجاح
      }

      return userCredential.user;
    } catch (error: any) {
      console.error('خطأ في إنشاء الحساب:', error.code, error.message);
      
      // إذا كان الخطأ بسبب عدم تفعيل Authentication
      if (error.code === 'auth/configuration-not-found' || 
          error.code === 'auth/operation-not-allowed' ||
          error.message.includes('PERMISSION_DENIED')) {
        console.log('Firebase Auth غير مُفعل، يرجى تفعيله في Firebase Console');
        throw new Error('يرجى تفعيل Authentication في Firebase Console');
      }
      
      // ترجمة رسائل الخطأ للعربية
      let errorMessage = error.message;
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
          break;
        case 'auth/invalid-email':
          errorMessage = 'البريد الإلكتروني غير صحيح';
          break;
        case 'auth/weak-password':
          errorMessage = 'كلمة المرور ضعيفة جداً';
          break;
        default:
          errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
      }
      
      throw new Error(errorMessage);
    }
  },

  // تسجيل الخروج
  async signOut(): Promise<void> {
    try {
      console.log('Signing out...');
      await signOut(auth);
      console.log('Sign out successful');
    } catch (error: any) {
      console.error('Sign out error:', error.code, error.message);
      throw error;
    }
  },

  // الحصول على المستخدم الحالي
  getCurrentUser(): User | null {
    const user = auth.currentUser;
    console.log('Current user:', user ? user.uid : 'None');
    return user;
  },

  // التحقق من حالة المصادقة
  async checkAuthStatus(): Promise<{ isEnabled: boolean; error?: string }> {
    try {
      console.log('Checking Firebase Auth status...');
      
      // محاولة الوصول إلى auth object
      if (!auth) {
        return { isEnabled: false, error: 'Auth service not initialized' };
      }
      
      // محاولة الحصول على المستخدم الحالي
      const currentUser = auth.currentUser;
      console.log('Auth service is working, current user:', currentUser ? 'Logged in' : 'Not logged in');
      
      return { isEnabled: true };
    } catch (error: any) {
      console.error('Auth status check failed:', error);
      return { isEnabled: false, error: error.message };
    }
  },
};

// خدمة الإشعارات الفورية
export const realtimeService = {
  // الاستماع لتحديثات الحضور
  subscribeToAttendanceUpdates(classId: string, callback: (data: any) => void): () => void {
    const attendanceRef = ref(database, `${REALTIME_PATHS.ATTENDANCE_UPDATES}/${classId}`);
    
    const unsubscribe = onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data);
      }
    });

    return () => off(attendanceRef, 'value', unsubscribe);
  },

  // إرسال تحديث حضور
  async sendAttendanceUpdate(classId: string, update: any): Promise<void> {
    const updatesRef = ref(database, `${REALTIME_PATHS.ATTENDANCE_UPDATES}/${classId}`);
    const newUpdateRef = push(updatesRef);
    await set(newUpdateRef, {
      ...update,
      timestamp: Date.now()
    });
  },

  // الاستماع للإشعارات
  subscribeToNotifications(teacherId: string, callback: (data: any) => void): () => void {
    const notificationsRef = ref(database, `${REALTIME_PATHS.NOTIFICATIONS}/${teacherId}`);
    
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data);
      }
    });

    return () => off(notificationsRef, 'value', unsubscribe);
  },

  // إرسال إشعار
  async sendNotification(teacherId: string, notification: any): Promise<void> {
    const notificationsRef = ref(database, `${REALTIME_PATHS.NOTIFICATIONS}/${teacherId}`);
    const newNotificationRef = push(notificationsRef);
    await set(newNotificationRef, {
      ...notification,
      timestamp: Date.now(),
      read: false
    });
  },

  // حذف إشعار
  async deleteNotification(teacherId: string, notificationId: string): Promise<void> {
    const notificationRef = ref(database, `${REALTIME_PATHS.NOTIFICATIONS}/${teacherId}/${notificationId}`);
    await remove(notificationRef);
  },
};
