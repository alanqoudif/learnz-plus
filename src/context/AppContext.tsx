import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Teacher, Class, Student, AttendanceRecord, AttendanceSession } from '../types';

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

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load data from AsyncStorage on app start
  useEffect(() => {
    loadData();
  }, []);

  // Save data to AsyncStorage whenever state changes
  useEffect(() => {
    if (!state.isLoading) {
      saveData();
    }
  }, [state.currentTeacher, state.classes, state.attendanceSessions]);

  const loadData = async () => {
    try {
      const [teacherData, classesData, sessionsData] = await Promise.all([
        AsyncStorage.getItem('teacher'),
        AsyncStorage.getItem('classes'),
        AsyncStorage.getItem('attendanceSessions'),
      ]);

      let teacher = null;
      let classes = [];
      let sessions = [];

      try {
        teacher = teacherData ? JSON.parse(teacherData) : null;
      } catch (e) {
        console.error('Error parsing teacher data:', e);
      }

      try {
        classes = classesData ? JSON.parse(classesData) : [];
      } catch (e) {
        console.error('Error parsing classes data:', e);
      }

      try {
        sessions = sessionsData ? JSON.parse(sessionsData) : [];
      } catch (e) {
        console.error('Error parsing sessions data:', e);
      }

      dispatch({
        type: 'LOAD_DATA',
        payload: { teacher, classes, sessions },
      });
    } catch (error) {
      console.error('Error loading data:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const saveData = async () => {
    try {
      const promises = [];
      
      if (state.currentTeacher) {
        promises.push(AsyncStorage.setItem('teacher', JSON.stringify(state.currentTeacher)));
      }
      
      promises.push(AsyncStorage.setItem('classes', JSON.stringify(state.classes)));
      promises.push(AsyncStorage.setItem('attendanceSessions', JSON.stringify(state.attendanceSessions)));
      
      await Promise.all(promises);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch }}>
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
