import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Teacher, Class, Student, AttendanceRecord, AttendanceSession, UserProfile } from '../types';
import { smartClassService as classService, smartStudentService as studentService, smartAttendanceService as attendanceService, smartAuthService as authService } from '../services/smartService';
import { teacherService } from '../services/firebaseService';
import { FirebaseRealtimeService } from '../services/firebaseRealtimeService';
import { auth, firestore, COLLECTIONS } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

import { offlineStorage, PendingAction } from '../services/offlineStorage';
import { syncPendingAttendance } from '../services/syncService';
import { networkService } from '../services/networkService';

import { APP_ADMIN_EMAILS, DEFAULT_ACCOUNT_TIER, ADMIN_ACCOUNT_TIER } from '../config/appConfig';

interface AppState {
  currentTeacher: Teacher | null;
  classes: Class[];
  attendanceSessions: AttendanceSession[];
  isLoading: boolean;
  userProfile: UserProfile | null;
  isOffline: boolean;
  pendingActions: PendingAction[];
}

type AppAction =
  | { type: 'SET_TEACHER'; payload: Teacher | null }
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
  | { type: 'SET_USER_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_OFFLINE'; payload: boolean }
  | { type: 'SET_PENDING_ACTIONS'; payload: PendingAction[] };

const initialState: AppState = {
  currentTeacher: null,
  classes: [],
  attendanceSessions: [],
  isLoading: true,
  userProfile: null,
  isOffline: false,
  pendingActions: [],
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
    
    case 'SET_OFFLINE':
      return { ...state, isOffline: action.payload };
    
    case 'SET_PENDING_ACTIONS':
      return { ...state, pendingActions: action.payload };
    
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

  useEffect(() => {
    (async () => {
      const cached = await offlineStorage.loadCachedState();
      if (cached.classes.length || cached.sessions.length || cached.teacher) {
        dispatch({
          type: 'LOAD_DATA',
          payload: {
            teacher: cached.teacher,
            classes: cached.classes,
            sessions: cached.sessions,
          },
        });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
      dispatch({ type: 'SET_PENDING_ACTIONS', payload: cached.pendingActions });
    })();
  }, []);

  // Load data from Firebase Auth on app start
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = networkService.subscribe(async (isOnline) => {
      dispatch({ type: 'SET_OFFLINE', payload: !isOnline });
      if (isOnline) {
        const result = await syncPendingAttendance();
        if (result.processed > 0) {
          const cached = await offlineStorage.loadCachedState();
          dispatch({ type: 'SET_ATTENDANCE_SESSIONS', payload: cached.sessions });
          dispatch({ type: 'SET_PENDING_ACTIONS', payload: cached.pendingActions });
        } else {
          const pending = await offlineStorage.getPendingActions();
          dispatch({ type: 'SET_PENDING_ACTIONS', payload: pending });
        }
        await loadData();
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        console.log('[Auth] Auth state changed - sign in:', user.uid);
        
        // إنشاء أو تحديث المعلم في كولكشن المعلمين
        let teacherRecord: Teacher;
        try {
          teacherRecord = await teacherService.createOrUpdateTeacherFromAuth(user);
          console.log('[Teacher] Synced teacher record:', teacherRecord.id);
        } catch (error) {
          console.warn('Warning: Failed to sync teacher record:', error);
          teacherRecord = {
            id: user.uid,
            name: user.displayName || 'معلم',
            phoneNumber: user.email || '',
            createdAt: new Date(user.metadata.creationTime || Date.now()),
          };
        }
        dispatch({ type: 'SET_TEACHER', payload: teacherRecord });
        await offlineStorage.saveTeacher(teacherRecord);
        
        // تحميل بروفايل المستخدم من users/{uid}
        try {
          const userRef = doc(firestore, COLLECTIONS.USERS, user.uid);
          const snap = await getDoc(userRef);
          const normalizedEmail = (user.email || '').toLowerCase();
          const existingData = snap.exists() ? (snap.data() as any) : null;
          const docIsAppAdmin = !!existingData?.isAppAdmin;
          const isAppAdmin = docIsAppAdmin || APP_ADMIN_EMAILS.includes(normalizedEmail);
          if (snap.exists()) {
            const data: any = existingData;
            const defaultTier = isAppAdmin ? ADMIN_ACCOUNT_TIER : DEFAULT_ACCOUNT_TIER;
            const resolvedTier = data.tier || defaultTier;
            const resolvedRole = data.role || (isAppAdmin ? 'leader' : 'member');
            const profile: UserProfile = {
              id: user.uid,
              email: data.email || normalizedEmail,
              name: data.name || user.displayName || 'معلم',
              schoolId: data.schoolId ?? null,
              role: resolvedRole,
              createdAt: data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt) : undefined,
              tier: resolvedTier,
              isAppAdmin,
            };
            dispatch({ type: 'SET_USER_PROFILE', payload: profile });
            await setDoc(userRef, {
              email: profile.email,
              name: profile.name,
              role: profile.role,
              tier: profile.tier,
              isAppAdmin: profile.isAppAdmin,
            }, { merge: true });
          } else {
            const tier = isAppAdmin ? ADMIN_ACCOUNT_TIER : DEFAULT_ACCOUNT_TIER;
            const role = isAppAdmin ? 'leader' : 'member';
            const basic = {
              email: normalizedEmail,
              name: user.displayName || 'معلم',
              schoolId: null,
              role,
              tier,
              isAppAdmin,
            };
            await setDoc(userRef, basic, { merge: true });
            dispatch({ type: 'SET_USER_PROFILE', payload: { id: user.uid, ...basic } as UserProfile });
          }
        } catch (e) {
          console.warn('Failed to load user profile', e);
          dispatch({ type: 'SET_USER_PROFILE', payload: null });
        }

        loadData();
      } else {
        console.log('[Auth] Auth state changed - sign out');
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
          console.log('[Realtime] Attendance update received:', data);
          
          if (data.type === 'session_completed' || data.type === 'attendance_recorded') {
            // تحديث فوري للجلسة المحددة فقط بدلاً من إعادة تحميل جميع الجلسات
            if (data.classId) {
              const updatedSessions = await attendanceService.getAttendanceSessionsByClass(data.classId, 10);
              const filteredSessions = state.attendanceSessions.filter(s => s.classId !== data.classId);
              const allSessions = [...filteredSessions, ...updatedSessions];
              dispatch({ type: 'SET_ATTENDANCE_SESSIONS', payload: allSessions });
              console.log(`[Realtime] Updated sessions for class ${data.classId}`);
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

  const loadData = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      const teacher: Teacher = {
        id: user.uid,
        name: user.displayName || 'معلم',
        phoneNumber: user.email || '',
        createdAt: new Date(user.metadata.creationTime || Date.now()),
      };

      if (state.isOffline) {
        await offlineStorage.saveTeacher(teacher);
        dispatch({
          type: 'LOAD_DATA',
          payload: {
            teacher,
            classes: state.classes,
            sessions: state.attendanceSessions,
          },
        });
        const pending = await offlineStorage.getPendingActions();
        dispatch({ type: 'SET_PENDING_ACTIONS', payload: pending });
        return;
      }

      const classes = await classService.getClassesByTeacher(teacher.id);

      console.log('[Classes] Loaded classes without sessions:', {
        teacherId: teacher.id,
        classesCount: classes.length,
        message: 'الجلسات سيتم تحميلها عند الحاجة'
      });

      await offlineStorage.saveTeacher(teacher);
      await offlineStorage.saveClasses(classes);
      if (state.attendanceSessions.length) {
        await offlineStorage.saveSessions(state.attendanceSessions);
      }

      dispatch({
        type: 'LOAD_DATA',
        payload: { teacher, classes, sessions: state.attendanceSessions },
      });
      const pending = await offlineStorage.getPendingActions();
      dispatch({ type: 'SET_PENDING_ACTIONS', payload: pending });
    } catch (error) {
      console.error('Error loading data:', error);
      const cached = await offlineStorage.loadCachedState();
      if (cached.classes.length || cached.sessions.length || cached.teacher) {
        dispatch({
          type: 'LOAD_DATA',
          payload: {
            teacher: cached.teacher,
            classes: cached.classes,
            sessions: cached.sessions,
          },
        });
        dispatch({ type: 'SET_PENDING_ACTIONS', payload: cached.pendingActions });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
  };

  // دوال Firebase
  const createTeacher = async (teacher: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> => {
    // لا نحتاج لهذه الدالة بعد الآن لأن Firebase Auth يتولى إنشاء المستخدمين
    throw new Error('Use Firebase Auth for teacher creation');
  };

  const createClass = async (classData: Omit<Class, 'id' | 'createdAt' | 'students'>): Promise<Class> => {
    const newClass = await classService.createClass(classData);
    const updatedClasses = [...state.classes, newClass];
    dispatch({ type: 'ADD_CLASS', payload: newClass });
    await offlineStorage.saveClasses(updatedClasses);
    return newClass;
  };

  const updateClass = async (id: string, updates: Partial<Omit<Class, 'id' | 'createdAt' | 'students' | 'teacherId'>>): Promise<Class> => {
    const updatedClass = await classService.updateClass(id, updates);
    dispatch({ type: 'UPDATE_CLASS', payload: updatedClass });
    const updatedClasses = state.classes.map(cls => (cls.id === updatedClass.id ? updatedClass : cls));
    await offlineStorage.saveClasses(updatedClasses);
    return updatedClass;
  };

  const deleteClass = async (id: string): Promise<void> => {
    const remainingClasses = state.classes.filter(cls => cls.id !== id);
    const remainingSessions = state.attendanceSessions.filter(session => session.classId !== id);
    await classService.deleteClass(id);
    dispatch({ type: 'DELETE_CLASS', payload: id });
    await offlineStorage.saveClasses(remainingClasses);
    await offlineStorage.saveSessions(remainingSessions);
  };

  const createStudent = async (student: Omit<Student, 'id' | 'createdAt'>): Promise<Student> => {
    const newStudent = await studentService.createStudent(student);
    dispatch({ type: 'ADD_STUDENT', payload: { classId: student.classId, student: newStudent } });
    const updatedClasses = state.classes.map(cls =>
      cls.id === student.classId
        ? { ...cls, students: [...cls.students, newStudent] }
        : cls
    );
    await offlineStorage.saveClasses(updatedClasses);
    return newStudent;
  };

  const updateStudent = async (id: string, updates: Partial<Omit<Student, 'id' | 'createdAt' | 'classId'>>): Promise<Student> => {
    const updatedStudent = await studentService.updateStudent(id, updates);
    const classItem = state.classes.find(cls => cls.students.some(s => s.id === id));
    if (classItem) {
      dispatch({ type: 'UPDATE_STUDENT', payload: { classId: classItem.id, student: updatedStudent } });
      const updatedClasses = state.classes.map(cls =>
        cls.id === classItem.id
          ? {
              ...cls,
              students: cls.students.map(student =>
                student.id === updatedStudent.id ? updatedStudent : student
              ),
            }
          : cls
      );
      await offlineStorage.saveClasses(updatedClasses);
    }
    return updatedStudent;
  };

  const deleteStudent = async (id: string): Promise<void> => {
    await studentService.deleteStudent(id);
    const classItem = state.classes.find(cls => cls.students.some(s => s.id === id));
    if (classItem) {
      dispatch({ type: 'DELETE_STUDENT', payload: { classId: classItem.id, studentId: id } });
      const updatedClasses = state.classes.map(cls =>
        cls.id === classItem.id
          ? { ...cls, students: cls.students.filter(student => student.id !== id) }
          : cls
      );
      await offlineStorage.saveClasses(updatedClasses);
    }
  };

  const createAttendanceSession = async (session: Omit<AttendanceSession, 'id' | 'createdAt' | 'records'>): Promise<AttendanceSession> => {
    const createOfflineSession = async (error?: unknown) => {
      if (error) {
        console.warn('Falling back to offline attendance session', error);
        dispatch({ type: 'SET_OFFLINE', payload: true });
      }
      const tempId = offlineStorage.generateTempId();
      const createdAt = new Date();
      const offlineSession: AttendanceSession = {
        id: tempId,
        classId: session.classId,
        date: session.date,
        createdAt,
        records: [],
      };
      dispatch({ type: 'ADD_ATTENDANCE_SESSION', payload: offlineSession });
      await offlineStorage.upsertSession(offlineSession);
      await offlineStorage.addPendingAction({
        id: offlineStorage.generateTempId(),
        type: 'CREATE_SESSION',
        payload: {
          tempId,
          session: { classId: session.classId, date: session.date, createdAt },
        },
        createdAt: Date.now(),
      });
      const pendingActions = await offlineStorage.getPendingActions();
      dispatch({ type: 'SET_PENDING_ACTIONS', payload: pendingActions });
      return offlineSession;
    };

    if (state.isOffline) {
      return await createOfflineSession();
    }

    try {
      const newSession = await attendanceService.createAttendanceSession(session);
      dispatch({ type: 'ADD_ATTENDANCE_SESSION', payload: newSession });
      await offlineStorage.upsertSession(newSession);
      const pendingActions = await offlineStorage.getPendingActions();
      dispatch({ type: 'SET_PENDING_ACTIONS', payload: pendingActions });
      return newSession;
    } catch (error) {
      return await createOfflineSession(error);
    }
  };

  const recordAttendance = async (record: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord> => {
    const sessionId = record.sessionId;
    if (!sessionId) {
      throw new Error('sessionId is required to record attendance');
    }

    const updateStateWithRecord = async (nextRecord: AttendanceRecord) => {
      const sessionIndex = state.attendanceSessions.findIndex(s => s.id === sessionId);
      if (sessionIndex === -1) {
        return;
      }
      const existingSession = state.attendanceSessions[sessionIndex];
      const existingRecordIndex = existingSession.records.findIndex(r => r.studentId === nextRecord.studentId);
      let updatedRecords;
      if (existingRecordIndex !== -1) {
        updatedRecords = [...existingSession.records];
        updatedRecords[existingRecordIndex] = nextRecord;
      } else {
        updatedRecords = [...existingSession.records, nextRecord];
      }
      const updatedSession: AttendanceSession = {
        ...existingSession,
        records: updatedRecords,
      };
      const updatedSessions = [...state.attendanceSessions];
      updatedSessions[sessionIndex] = updatedSession;
      dispatch({ type: 'SET_ATTENDANCE_SESSIONS', payload: updatedSessions });
      await offlineStorage.updateRecord(sessionId, nextRecord);
    };

    const enqueuePendingRecord = async (pendingRecord: AttendanceRecord) => {
      await offlineStorage.addPendingAction({
        id: offlineStorage.generateTempId(),
        type: 'RECORD_ATTENDANCE',
        payload: {
          tempId: pendingRecord.id,
          sessionId,
          record: {
            studentId: pendingRecord.studentId,
            classId: pendingRecord.classId,
            sessionId,
            status: pendingRecord.status,
            attendanceTime: pendingRecord.attendanceTime,
            createdAt: pendingRecord.createdAt,
          },
        },
        createdAt: Date.now(),
      });
      const pending = await offlineStorage.getPendingActions();
      dispatch({ type: 'SET_PENDING_ACTIONS', payload: pending });
    };

    const buildOfflineRecord = () => {
      const createdAt = new Date();
      return {
        id: offlineStorage.generateTempId(),
        studentId: record.studentId,
        classId: record.classId,
        sessionId,
        status: record.status,
        attendanceTime: record.attendanceTime || createdAt,
        createdAt,
      } as AttendanceRecord;
    };

    if (state.isOffline) {
      const offlineRecord = buildOfflineRecord();
      await updateStateWithRecord(offlineRecord);
      await enqueuePendingRecord(offlineRecord);
      dispatch({ type: 'SET_OFFLINE', payload: true });
      return offlineRecord;
    }

    try {
      const newRecord = await attendanceService.recordAttendance(record);
      await updateStateWithRecord(newRecord);
      const pending = await offlineStorage.getPendingActions();
      dispatch({ type: 'SET_PENDING_ACTIONS', payload: pending });
      return newRecord;
    } catch (error) {
      console.warn('Falling back to offline attendance record', error);
      const offlineRecord = buildOfflineRecord();
      await updateStateWithRecord(offlineRecord);
      await enqueuePendingRecord(offlineRecord);
      dispatch({ type: 'SET_OFFLINE', payload: true });
      return offlineRecord;
    }
  };

  const refreshData = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const user = auth.currentUser;
      if (user) {
        try {
          const userRef = doc(firestore, COLLECTIONS.USERS, user.uid);
          const snap = await getDoc(userRef);
          const normalizedEmail = (user.email || '').toLowerCase();
          const existingData = snap.exists() ? (snap.data() as any) : null;
          const docIsAppAdmin = !!existingData?.isAppAdmin;
          const isAppAdmin = docIsAppAdmin || APP_ADMIN_EMAILS.includes(normalizedEmail);
          if (snap.exists()) {
            const data: any = existingData;
            const defaultTier = isAppAdmin ? ADMIN_ACCOUNT_TIER : DEFAULT_ACCOUNT_TIER;
            const tier = data.tier || defaultTier;
            const role = data.role || (isAppAdmin ? 'leader' : 'member');
            dispatch({ type: 'SET_USER_PROFILE', payload: {
              id: user.uid,
              email: data.email || normalizedEmail,
              name: data.name || user.displayName || 'معلم',
              schoolId: data.schoolId ?? null,
              role,
              createdAt: data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt) : undefined,
              tier,
              isAppAdmin,
            }});
            await setDoc(userRef, { tier, isAppAdmin, role }, { merge: true });
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
      console.log(`[Attendance] Loading sessions for class ${classId} (limit: ${maxResults})`);
      
      const cachedSessions = state.attendanceSessions.filter(s => s.classId === classId);
      console.log(`[Attendance] Showing ${cachedSessions.length} cached sessions immediately`);
      
      if (state.isOffline) {
        return cachedSessions;
      }
      
      const updateInBackground = async () => {
        try {
          const sessions = await attendanceService.getAttendanceSessionsByClass(classId, maxResults);
          console.log(`[Attendance] Background refresh returned ${sessions.length} sessions`);
          
          const hasChanges = JSON.stringify(sessions) !== JSON.stringify(cachedSessions);
          if (hasChanges) {
            const updatedSessions = [
              ...state.attendanceSessions.filter(s => s.classId !== classId),
              ...sessions
            ];
            dispatch({ type: 'SET_ATTENDANCE_SESSIONS', payload: updatedSessions });
            await offlineStorage.saveSessions(updatedSessions);
            console.log('[Attendance] Background refresh applied');
          }
        } catch (error) {
          console.error('خطأ في التحديث في الخلفية:', error);
        }
      };
      
      updateInBackground();
      
      return cachedSessions;
    } catch (error) {
      console.error('خطأ في تحميل جلسات الحضور:', error);
      return state.attendanceSessions.filter(s => s.classId === classId);
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
