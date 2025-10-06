import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Teacher, Class, Student, AttendanceRecord, AttendanceSession } from '../types';
import { classService, studentService, attendanceService } from '../services/supabaseService';
import { supabase } from '../config/supabase';

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // تسجيل دخول جديد
          const teacher: Teacher = {
            id: session.user.id,
            name: session.user.user_metadata?.name || 'معلم',
            phoneNumber: session.user.user_metadata?.phone_number || session.user.email?.replace('@teacher.local', '') || '',
            createdAt: new Date(session.user.created_at),
          };
          dispatch({ type: 'SET_TEACHER', payload: teacher });
          loadData();
        } else if (event === 'SIGNED_OUT') {
        // تسجيل خروج
        dispatch({ type: 'SET_TEACHER', payload: null });
        dispatch({ type: 'SET_CLASSES', payload: [] });
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Save data to AsyncStorage whenever state changes
  useEffect(() => {
    if (!state.isLoading) {
      saveData();
    }
  }, [state.currentTeacher, state.classes, state.attendanceSessions]);

  const loadData = async () => {
    try {
      // التحقق من وجود جلسة نشطة في Supabase Auth
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

        // إنشاء كائن المعلم من بيانات الجلسة
        const teacher: Teacher = {
          id: session.user.id,
          name: session.user.user_metadata?.name || 'معلم',
          phoneNumber: session.user.user_metadata?.phone_number || session.user.email?.replace('@teacher.local', '') || '',
          createdAt: new Date(session.user.created_at),
        };

      // جلب الفصول الدراسية من قاعدة البيانات
      const classes = await classService.getClassesByTeacher(teacher.id);
      
      // جلب جلسات الحضور لجميع الفصول
      const allSessions: AttendanceSession[] = [];
      for (const classItem of classes) {
        const sessions = await attendanceService.getAttendanceSessionsByClass(classItem.id);
        allSessions.push(...sessions);
      }

      dispatch({
        type: 'LOAD_DATA',
        payload: { teacher, classes, sessions: allSessions },
      });
    } catch (error) {
      console.error('Error loading data:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveData = async () => {
    try {
      // لا نحتاج لحفظ بيانات في AsyncStorage لأن Supabase Auth يتولى ذلك
      // يمكن إضافة منطق إضافي هنا إذا لزم الأمر
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  // دوال Supabase
  const createTeacher = async (teacher: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> => {
    // لا نحتاج لهذه الدالة بعد الآن لأن Supabase Auth يتولى إنشاء المستخدمين
    throw new Error('Use Supabase Auth for teacher creation');
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
      const updatedSession = {
        ...state.attendanceSessions[sessionIndex],
        records: [...state.attendanceSessions[sessionIndex].records, newRecord]
      };
      dispatch({ type: 'ADD_ATTENDANCE_SESSION', payload: updatedSession });
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
