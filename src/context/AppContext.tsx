import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Teacher, Class, Student, AttendanceRecord, AttendanceSession } from '../types';
import { smartClassService as classService, smartStudentService as studentService, smartAttendanceService as attendanceService, smartAuthService as authService } from '../services/smartService';
import { teacherService } from '../services/firebaseService';
import { FirebaseRealtimeService } from '../services/firebaseRealtimeService';
import { auth } from '../config/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface AppState {
  currentTeacher: Teacher | null;
  classes: Class[];
  attendanceSessions: AttendanceSession[];
  isLoading: boolean;
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
  | { type: 'LOAD_DATA'; payload: { teacher: Teacher | null; classes: Class[]; sessions: AttendanceSession[] } };

const initialState: AppState = {
  currentTeacher: null,
  classes: [],
  attendanceSessions: [],
  isLoading: true,
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
  // دوال Supabase
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
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load data from Supabase Auth on app start
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
        
        loadData();
      } else {
        console.log('🔄 تغيير حالة المصادقة - تسجيل خروج');
        // تسجيل خروج
        dispatch({ type: 'SET_TEACHER', payload: null });
        dispatch({ type: 'SET_CLASSES', payload: [] });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time listeners for classes, students, and attendance
  useEffect(() => {
    if (!state.currentTeacher) return;

    console.log('Setting up realtime subscriptions for teacher:', state.currentTeacher.id);

    // Listen for attendance updates
    const attendanceSubscription = FirebaseRealtimeService.subscribeToAttendanceUpdates(
      state.currentTeacher.id,
      async (data) => {
        try {
          // Reload attendance sessions for all classes
          const allSessions: AttendanceSession[] = [];
          for (const classItem of state.classes) {
            const sessions = await attendanceService.getAttendanceSessionsByClass(classItem.id);
            allSessions.push(...sessions);
          }
          dispatch({ type: 'SET_ATTENDANCE_SESSIONS', payload: allSessions });
        } catch (error) {
          console.error('Error reloading attendance sessions:', error);
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

      // تحميل الفصول أولاً وإظهارها فوراً
      const classes = await classService.getClassesByTeacher(teacher.id);
      
      // إظهار الفصول فوراً للمستخدم
      dispatch({
        type: 'LOAD_DATA',
        payload: { teacher, classes, sessions: [] },
      });

      // تحميل جلسات الحضور في الخلفية
      if (classes.length > 0) {
        console.log('🔄 تحميل جلسات الحضور للفصول:', classes.map(c => ({ id: c.id, name: c.name })));
        
        const sessionPromises = classes.map(classItem => 
          attendanceService.getAttendanceSessionsByClass(classItem.id)
        );
        
        const allSessionsArrays = await Promise.all(sessionPromises);
        const allSessions: AttendanceSession[] = allSessionsArrays.flat();

        console.log('📅 جلسات الحضور المحملة:', {
          totalSessions: allSessions.length,
          sessionsByClass: classes.map(c => ({
            classId: c.id,
            className: c.name,
            sessionsCount: allSessions.filter(s => s.classId === c.id).length
          }))
        });

        // تحديث البيانات مع جلسات الحضور
        dispatch({
          type: 'LOAD_DATA',
          payload: { teacher, classes, sessions: allSessions },
        });
      }
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
      
      // إرسال تحديث في الوقت الفعلي
      try {
        await FirebaseRealtimeService.sendAttendanceUpdate(state.currentTeacher?.id || '', {
          type: 'attendance_recorded',
          sessionId: record.sessionId,
          studentId: record.studentId,
          status: record.status,
          timestamp: Date.now()
        });
      } catch (error) {
        console.warn('⚠️ فشل في إرسال التحديث في الوقت الفعلي:', error);
      }
    }
    
    return newRecord;
  };

  const refreshData = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    await loadData();
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
      refreshData
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
