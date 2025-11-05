import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Teacher, Class, Student, AttendanceRecord, AttendanceSession, UserProfile } from '../types';
import { smartClassService as classService, smartStudentService as studentService, smartAttendanceService as attendanceService, smartAuthService as authService } from '../services/smartService';
import { teacherService } from '../services/firebaseService';
import { FirebaseRealtimeService } from '../services/firebaseRealtimeService';
import { auth, firestore, COLLECTIONS } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

interface AppState {
  currentTeacher: Teacher | null;
  classes: Class[];
  attendanceSessions: AttendanceSession[];
  isLoading: boolean;
  userProfile: UserProfile | null;
}

type AppAction =
  | { type: 'SET_TEACHER'; payload: Teacher }
  | { type: 'SET_CLASSES'; payload: Class[] }
  | { type: 'ADD_CLASS'; payload: Class }
  | { type: 'UPDATE_CLASS'; payload: Class }
  | { type: 'DELETE_CLASS'; payload: string }
  | { type: 'ADD_STUDENT'; payload: { classId: string; student: Student } }
  | { type: 'UPDATE_STUDENT'; payload: { classId: string; student: Student } }
  | { type: 'DELETE_STUDENT'; payload: { classId: string; studentId: string } }
  | { type: 'ADD_ATTENDANCE_SESSION'; payload: AttendanceSession }
  | { type: 'SET_ATTENDANCE_SESSIONS'; payload: AttendanceSession[] }
  | { type: 'UPDATE_ATTENDANCE_SESSION'; payload: AttendanceSession }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOAD_DATA'; payload: { teacher: Teacher | null; classes: Class[]; sessions: AttendanceSession[] } }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile | null };

const initialState: AppState = {
  currentTeacher: null,
  classes: [],
  attendanceSessions: [],
  isLoading: true,
  userProfile: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TEACHER':
      return { ...state, currentTeacher: action.payload };
    
    case 'SET_CLASSES':
      return { ...state, classes: action.payload };
    
    case 'ADD_CLASS':
      return { ...state, classes: [...state.classes, action.payload] };
    
    case 'UPDATE_CLASS':
      return {
        ...state,
        classes: state.classes.map(cls => 
          cls.id === action.payload.id ? action.payload : cls
        ),
      };
    
    case 'DELETE_CLASS':
      return {
        ...state,
        classes: state.classes.filter(cls => cls.id !== action.payload),
        attendanceSessions: state.attendanceSessions.filter(session => session.classId !== action.payload),
      };
    
    case 'ADD_STUDENT':
      return {
        ...state,
        classes: state.classes.map(cls =>
          cls.id === action.payload.classId
            ? { ...cls, students: [...cls.students, action.payload.student] }
            : cls
        ),
      };
    
    case 'UPDATE_STUDENT':
      return {
        ...state,
        classes: state.classes.map(cls =>
          cls.id === action.payload.classId
            ? {
                ...cls,
                students: cls.students.map(student =>
                  student.id === action.payload.student.id ? action.payload.student : student
                ),
              }
            : cls
        ),
      };
    
    case 'DELETE_STUDENT':
      return {
        ...state,
        classes: state.classes.map(cls =>
          cls.id === action.payload.classId
            ? {
                ...cls,
                students: cls.students.filter(student => student.id !== action.payload.studentId),
              }
            : cls
        ),
      };
    
    case 'ADD_ATTENDANCE_SESSION':
      return {
        ...state,
        attendanceSessions: [...state.attendanceSessions, action.payload],
      };
    
    case 'SET_ATTENDANCE_SESSIONS':
      return {
        ...state,
        attendanceSessions: action.payload,
      };
    
    case 'UPDATE_ATTENDANCE_SESSION':
      return {
        ...state,
        attendanceSessions: state.attendanceSessions.map(session =>
          session.id === action.payload.id ? action.payload : session
        ),
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_USER_PROFILE':
      return { ...state, userProfile: action.payload };
    
    case 'LOAD_DATA':
      return {
        ...state,
        currentTeacher: action.payload.teacher,
        classes: action.payload.classes,
        attendanceSessions: action.payload.sessions,
        isLoading: false,
      };
    
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // دوال Firebase
  createTeacher: (teacher: Omit<Teacher, 'id' | 'createdAt'>) => Promise<Teacher>;
  createClass: (classData: Omit<Class, 'id' | 'createdAt' | 'students'>) => Promise<Class>;
  updateClass: (id: string, updates: Partial<Omit<Class, 'id' | 'createdAt' | 'students' | 'teacherId'>>) => Promise<Class>;
  deleteClass: (id: string) => Promise<void>;
  createStudent: (student: Omit<Student, 'id' | 'createdAt'>) => Promise<Student>;
  updateStudent: (id: string, updates: Partial<Omit<Student, 'id' | 'createdAt' | 'classId'>>) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;
  createAttendanceSession: (session: Omit<AttendanceSession, 'id' | 'createdAt' | 'records'>) => Promise<AttendanceSession>;
  recordAttendance: (record: Omit<AttendanceRecord, 'id' | 'createdAt'>) => Promise<AttendanceRecord>;
  refreshData: () => Promise<void>;
  loadAttendanceSessions: (classId: string, limit?: number) => Promise<AttendanceSession[]>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load data from Firebase Auth on app start
  useEffect(() => {
    loadData();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        console.log('🔄 تغيير حالة المصادقة - تسجيل دخول:', user.uid);
        
        // إنشاء أو تحديث المعلم في كولكشن المعلمين
        try {
          const teacher = await teacherService.createOrUpdateTeacherFromAuth(user);
          console.log('✅ تم إنشاء/تحديث المعلم في كولكشن المعلمين:', teacher.id);
          dispatch({ type: 'SET_TEACHER', payload: teacher });
        } catch (error) {
          console.warn('⚠️ تحذير: فشل في إنشاء/تحديث المعلم في كولكشن المعلمين:', error);
          // استخدام بيانات المستخدم كبديل
          const teacher: Teacher = {
            id: user.uid,
            name: user.displayName || 'معلم',
            phoneNumber: user.email || '',
            createdAt: new Date(user.metadata.creationTime || Date.now()),
          };
          dispatch({ type: 'SET_TEACHER', payload: teacher });
        }
        
        // تحميل بروفايل المستخدم من users/{uid}
        try {
          const userRef = doc(firestore, COLLECTIONS.USERS, user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data: any = snap.data();
            dispatch({ type: 'SET_USER_PROFILE', payload: {
              id: user.uid,
              email: data.email || user.email || '',
              name: data.name || user.displayName || 'معلم',
              schoolId: data.schoolId ?? null,
              role: data.role || 'member',
              createdAt: data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt) : undefined,
            }});
          } else {
            const basic = {
              email: user.email || '',
              name: user.displayName || 'معلم',
              schoolId: null,
              role: 'member' as const,
            };
            await setDoc(userRef, basic, { merge: true });
            dispatch({ type: 'SET_USER_PROFILE', payload: { id: user.uid, ...(basic as any) } });
          }
        } catch (e) {
          console.warn('Failed to load user profile', e);
          dispatch({ type: 'SET_USER_PROFILE', payload: null });
        }

        loadData();
      } else {
        console.log('🔄 تغيير حالة المصادقة - تسجيل خروج');
        // تسجيل خروج
        dispatch({ type: 'SET_TEACHER', payload: null });
        dispatch({ type: 'SET_CLASSES', payload: [] });
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_USER_PROFILE', payload: null });
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time listeners for classes, students, and attendance
  useEffect(() => {
    if (!state.currentTeacher) return;

    console.log('Setting up realtime subscriptions for teacher:', state.currentTeacher.id);

    // Listen for attendance updates with optimized realtime updates
    const attendanceSubscription = FirebaseRealtimeService.subscribeToAttendanceUpdates(
      state.currentTeacher.id,
      async (data) => {
        try {
          console.log('🔄 تحديث realtime للحضور:', data);
          
          if (data.type === 'session_completed' || data.type === 'attendance_recorded') {
            // تحديث فوري للجلسة المحددة فقط بدلاً من إعادة تحميل جميع الجلسات
            if (data.classId) {
              const updatedSessions = await attendanceService.getAttendanceSessionsByClass(data.classId, 10);
              const filteredSessions = state.attendanceSessions.filter(s => s.classId !== data.classId);
              const allSessions = [...filteredSessions, ...updatedSessions];
              dispatch({ type: 'SET_ATTENDANCE_SESSIONS', payload: allSessions });
              console.log(`✅ تم تحديث جلسات الفصل ${data.classId} فوراً`);
            }
          } else {
            // للأنواع الأخرى، إعادة تحميل جميع الجلسات
            const allSessions: AttendanceSession[] = [];
            for (const classItem of state.classes) {
              const sessions = await attendanceService.getAttendanceSessionsByClass(classItem.id, 10);
              allSessions.push(...sessions);
            }
            dispatch({ type: 'SET_ATTENDANCE_SESSIONS', payload: allSessions });
          }
        } catch (error) {
          console.error('Error in realtime attendance update:', error);
        }
      }
    );

    // Listen for notifications
    const notificationsSubscription = FirebaseRealtimeService.subscribeToNotifications(
      state.currentTeacher.id,
      (data) => {
        console.log('New notification received:', data);
        // يمكن إضافة منطق إضافي هنا لعرض الإشعارات
      }
    );

    return () => {
      console.log('Cleaning up realtime subscriptions');
      attendanceSubscription.unsubscribe();
      notificationsSubscription.unsubscribe();
    };
  }, [state.currentTeacher?.id]); // Only depend on teacher ID, not the entire classes array

  // Save data to AsyncStorage whenever state changes
  useEffect(() => {
    if (!state.isLoading) {
      saveData();
    }
  }, [state.currentTeacher, state.classes, state.attendanceSessions]);

  const loadData = async () => {
    try {
      // التحقق من وجود جلسة نشطة في Firebase Auth
      const user = auth.currentUser;
      
      if (!user) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // إنشاء كائن المعلم من بيانات المستخدم
      const teacher: Teacher = {
        id: user.uid,
        name: user.displayName || 'معلم',
        phoneNumber: user.email || '', // استخدام البريد الإلكتروني كمعرف
        createdAt: new Date(user.metadata.creationTime || Date.now()),
      };

      // تحميل الفصول فقط - بدون جلسات الحضور
      // سيتم تحميل الجلسات lazy عند فتح شاشة التاريخ
      const classes = await classService.getClassesByTeacher(teacher.id);
      
      console.log('✅ تحميل سريع - الفصول فقط:', {
        teacherId: teacher.id,
        classesCount: classes.length,
        message: 'الجلسات سيتم تحميلها عند الحاجة'
      });
      
      // إظهار الفصول فوراً للمستخدم - بدون جلسات
      dispatch({
        type: 'LOAD_DATA',
        payload: { teacher, classes, sessions: [] },
      });
    } catch (error) {
      console.error('Error loading data:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveData = async () => {
    try {
      // لا نحتاج لحفظ بيانات في AsyncStorage لأن Firebase Auth يتولى ذلك
      // يمكن إضافة منطق إضافي هنا إذا لزم الأمر
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  // دوال Firebase
  const createTeacher = async (teacher: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> => {
    // لا نحتاج لهذه الدالة بعد الآن لأن Firebase Auth يتولى إنشاء المستخدمين
    throw new Error('Use Firebase Auth for teacher creation');
  };

  const createClass = async (classData: Omit<Class, 'id' | 'createdAt' | 'students'>): Promise<Class> => {
    const newClass = await classService.createClass(classData);
    dispatch({ type: 'ADD_CLASS', payload: newClass });
    return newClass;
  };

  const updateClass = async (id: string, updates: Partial<Omit<Class, 'id' | 'createdAt' | 'students' | 'teacherId'>>): Promise<Class> => {
    const updatedClass = await classService.updateClass(id, updates);
    dispatch({ type: 'UPDATE_CLASS', payload: updatedClass });
    return updatedClass;
  };

  const deleteClass = async (id: string): Promise<void> => {
    await classService.deleteClass(id);
    dispatch({ type: 'DELETE_CLASS', payload: id });
  };

  const createStudent = async (student: Omit<Student, 'id' | 'createdAt'>): Promise<Student> => {
    const newStudent = await studentService.createStudent(student);
    dispatch({ type: 'ADD_STUDENT', payload: { classId: student.classId, student: newStudent } });
    return newStudent;
  };

  const updateStudent = async (id: string, updates: Partial<Omit<Student, 'id' | 'createdAt' | 'classId'>>): Promise<Student> => {
    const updatedStudent = await studentService.updateStudent(id, updates);
    // العثور على classId للطالب المحدث
    const classItem = state.classes.find(cls => cls.students.some(s => s.id === id));
    if (classItem) {
      dispatch({ type: 'UPDATE_STUDENT', payload: { classId: classItem.id, student: updatedStudent } });
    }
    return updatedStudent;
  };

  const deleteStudent = async (id: string): Promise<void> => {
    await studentService.deleteStudent(id);
    // العثور على classId للطالب المحذوف
    const classItem = state.classes.find(cls => cls.students.some(s => s.id === id));
    if (classItem) {
      dispatch({ type: 'DELETE_STUDENT', payload: { classId: classItem.id, studentId: id } });
    }
  };

  const createAttendanceSession = async (session: Omit<AttendanceSession, 'id' | 'createdAt' | 'records'>): Promise<AttendanceSession> => {
    const newSession = await attendanceService.createAttendanceSession(session);
    dispatch({ type: 'ADD_ATTENDANCE_SESSION', payload: newSession });
    return newSession;
  };

  const recordAttendance = async (record: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord> => {
    const newRecord = await attendanceService.recordAttendance(record);
    
    // تحديث الجلسة في state
    const sessionIndex = state.attendanceSessions.findIndex(s => s.id === record.sessionId);
    if (sessionIndex !== -1) {
      const existingSession = state.attendanceSessions[sessionIndex];
      
      // التحقق من وجود السجل مسبقاً لتجنب التكرار
      const existingRecordIndex = existingSession.records.findIndex(r => r.studentId === record.studentId);
      
      let updatedRecords;
      if (existingRecordIndex !== -1) {
        // تحديث السجل الموجود
        updatedRecords = [...existingSession.records];
        updatedRecords[existingRecordIndex] = newRecord;
      } else {
        // إضافة سجل جديد
        updatedRecords = [...existingSession.records, newRecord];
      }
      
      const updatedSession = {
        ...existingSession,
        records: updatedRecords
      };
      
      // تحديث الجلسة في القائمة
      const updatedSessions = [...state.attendanceSessions];
      updatedSessions[sessionIndex] = updatedSession;
      
      dispatch({ type: 'SET_ATTENDANCE_SESSIONS', payload: updatedSessions });
      
    }
    
    return newRecord;
  };

  const refreshData = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const user = auth.currentUser;
      if (user) {
        try {
          const userRef = doc(firestore, COLLECTIONS.USERS, user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data: any = snap.data();
            dispatch({ type: 'SET_USER_PROFILE', payload: {
              id: user.uid,
              email: data.email || user.email || '',
              name: data.name || user.displayName || 'معلم',
              schoolId: data.schoolId ?? null,
              role: data.role || 'member',
              createdAt: data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt) : undefined,
            }});
          }
        } catch (e) {
          console.warn('Failed to refresh user profile', e);
        }
      }
      await loadData();
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // تحميل جلسات الحضور بشكل lazy لفصل محدد مع cache-first strategy
  const loadAttendanceSessions = async (classId: string, maxResults: number = 10): Promise<AttendanceSession[]> => {
    try {
      console.log(`📥 تحميل جلسات الحضور للفصل: ${classId} (limit: ${maxResults})`);
      
      // إرجاع البيانات المحفوظة فوراً (cache-first)
      const cachedSessions = state.attendanceSessions.filter(s => s.classId === classId);
      console.log(`💾 عرض ${cachedSessions.length} جلسة من الكاش فوراً`);
      
      // تحديث في الخلفية بدون انتظار
      const updateInBackground = async () => {
        try {
          const sessions = await attendanceService.getAttendanceSessionsByClass(classId, maxResults);
          console.log(`🔄 تحديث في الخلفية: ${sessions.length} جلسة`);
          
          // تحديث الـ state فقط إذا كانت هناك تغييرات
          const hasChanges = JSON.stringify(sessions) !== JSON.stringify(cachedSessions);
          if (hasChanges) {
            const updatedSessions = [
              ...state.attendanceSessions.filter(s => s.classId !== classId),
              ...sessions
            ];
            dispatch({ type: 'SET_ATTENDANCE_SESSIONS', payload: updatedSessions });
            console.log(`✅ تم تحديث الجلسات في الخلفية`);
          }
        } catch (error) {
          console.error('❌ خطأ في التحديث في الخلفية:', error);
        }
      };
      
      // تشغيل التحديث في الخلفية
      updateInBackground();
      
      // إرجاع البيانات المحفوظة فوراً
      return cachedSessions;
    } catch (error) {
      console.error('❌ خطأ في تحميل جلسات الحضور:', error);
      return [];
    }
  };

  return (
    <AppContext.Provider value={{ 
      state, 
      dispatch,
      createTeacher,
      createClass,
      updateClass,
      deleteClass,
      createStudent,
      updateStudent,
      deleteStudent,
      createAttendanceSession,
      recordAttendance,
      refreshData,
      loadAttendanceSessions
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
