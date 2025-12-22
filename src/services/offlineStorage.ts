import AsyncStorage from '@react-native-async-storage/async-storage';
import { AttendanceRecord, AttendanceSession, Class, Teacher, UserProfile } from '../types';

export type PendingActionType = 'CREATE_SESSION' | 'RECORD_ATTENDANCE' | 'CREATE_STUDENT' | 'UPDATE_STUDENT' | 'DELETE_STUDENT';

export interface PendingAction<T = any> {
  id: string;
  type: PendingActionType;
  payload: T;
  createdAt: number;
}

interface SerializableTeacher {
  id: string;
  name: string;
  phoneNumber: string;
  createdAt: string;
}

interface SerializableStudent {
  id: string;
  name: string;
  classId: string;
  createdAt: string;
}

interface SerializableClass {
  id: string;
  name: string;
  section: string;
  teacherId: string;
  createdAt: string;
  students: SerializableStudent[];
}

interface SerializableAttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  sessionId?: string;
  attendanceTime: string;
  status: 'present' | 'absent';
  createdAt: string;
}

interface SerializableAttendanceSession {
  id: string;
  classId: string;
  date: string;
  createdAt: string;
  records: SerializableAttendanceRecord[];
  meta?: {
    isOffline?: boolean;
    tempId?: string;
  };
}

interface SerializableUserProfile {
  id: string;
  email: string;
  name: string;
  schoolId: string | null;
  schoolName: string | null;
  role: string;
  tier: string;
  isAppAdmin: boolean;
  userCode: string;
  createdAt?: string;
  lastUpdated?: string;
}

interface CachedState {
  teacher: Teacher | null;
  classes: Class[];
  sessions: AttendanceSession[];
  pendingActions: PendingAction[];
  userProfile: UserProfile | null;
}

const STORAGE_KEYS = {
  TEACHER: 'learnz_offline_teacher',
  CLASSES: 'learnz_offline_classes',
  SESSIONS: 'learnz_offline_sessions',
  PENDING: 'learnz_offline_pending',
  USER_PROFILE: 'learnz_offline_user_profile',
};

const randomId = () => `offline-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

const serializeTeacher = (teacher: Teacher): SerializableTeacher => ({
  id: teacher.id,
  name: teacher.name,
  phoneNumber: teacher.phoneNumber,
  createdAt: teacher.createdAt.toISOString(),
});

const deserializeTeacher = (data: SerializableTeacher): Teacher => ({
  id: data.id,
  name: data.name,
  phoneNumber: data.phoneNumber,
  createdAt: new Date(data.createdAt),
});

const serializeClass = (cls: Class): SerializableClass => ({
  id: cls.id,
  name: cls.name,
  section: cls.section,
  teacherId: cls.teacherId,
  createdAt: cls.createdAt.toISOString(),
  students: cls.students.map(student => ({
    id: student.id,
    name: student.name,
    classId: student.classId,
    createdAt: student.createdAt.toISOString(),
  })),
});

const deserializeClass = (cls: SerializableClass): Class => ({
  id: cls.id,
  name: cls.name,
  section: cls.section,
  teacherId: cls.teacherId,
  createdAt: new Date(cls.createdAt),
  students: cls.students.map(student => ({
    id: student.id,
    name: student.name,
    classId: student.classId,
    createdAt: new Date(student.createdAt),
  })),
});

const serializeRecord = (record: AttendanceRecord): SerializableAttendanceRecord => ({
  id: record.id,
  studentId: record.studentId,
  classId: record.classId,
  sessionId: record.sessionId,
  attendanceTime: record.attendanceTime.toISOString(),
  status: record.status,
  createdAt: record.createdAt.toISOString(),
});

const deserializeRecord = (record: SerializableAttendanceRecord): AttendanceRecord => ({
  id: record.id,
  studentId: record.studentId,
  classId: record.classId,
  sessionId: record.sessionId,
  attendanceTime: new Date(record.attendanceTime),
  status: record.status,
  createdAt: new Date(record.createdAt),
});

const serializeSession = (session: AttendanceSession): SerializableAttendanceSession => ({
  id: session.id,
  classId: session.classId,
  date: session.date.toISOString(),
  createdAt: session.createdAt.toISOString(),
  records: session.records.map(serializeRecord),
});

const deserializeSession = (session: SerializableAttendanceSession): AttendanceSession => ({
  id: session.id,
  classId: session.classId,
  date: new Date(session.date),
  createdAt: new Date(session.createdAt),
  records: session.records.map(deserializeRecord),
});

const serializeUserProfile = (profile: UserProfile): SerializableUserProfile => ({
  id: profile.id,
  email: profile.email,
  name: profile.name,
  schoolId: profile.schoolId ?? null,
  schoolName: profile.schoolName ?? null,
  role: profile.role,
  tier: profile.tier,
  isAppAdmin: Boolean(profile.isAppAdmin),
  userCode: profile.userCode ?? '',
  createdAt: profile.createdAt?.toISOString(),
  lastUpdated: new Date().toISOString(),
});

const deserializeUserProfile = (data: SerializableUserProfile): UserProfile => ({
  id: data.id,
  email: data.email,
  name: data.name,
  schoolId: data.schoolId,
  schoolName: data.schoolName,
  role: data.role as any,
  tier: data.tier as any,
  isAppAdmin: data.isAppAdmin,
  userCode: data.userCode,
  createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
});

async function getJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('Failed to parse offline JSON', key, error);
    return null;
  }
}

async function setJson(key: string, value: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save offline JSON', key, error);
  }
}

export const offlineStorage = {
  async loadCachedState(): Promise<CachedState> {
    const [teacherRaw, classesRaw, sessionsRaw, pendingRaw, userProfileRaw] = await Promise.all([
      getJson<SerializableTeacher | null>(STORAGE_KEYS.TEACHER),
      getJson<SerializableClass[] | null>(STORAGE_KEYS.CLASSES),
      getJson<SerializableAttendanceSession[] | null>(STORAGE_KEYS.SESSIONS),
      getJson<PendingAction[] | null>(STORAGE_KEYS.PENDING),
      getJson<SerializableUserProfile | null>(STORAGE_KEYS.USER_PROFILE),
    ]);

    return {
      teacher: teacherRaw ? deserializeTeacher(teacherRaw) : null,
      classes: classesRaw ? classesRaw.map(deserializeClass) : [],
      sessions: sessionsRaw ? sessionsRaw.map(deserializeSession) : [],
      pendingActions: pendingRaw || [],
      userProfile: userProfileRaw ? deserializeUserProfile(userProfileRaw) : null,
    };
  },

  async saveTeacher(teacher: Teacher | null) {
    if (!teacher) {
      await AsyncStorage.removeItem(STORAGE_KEYS.TEACHER);
      return;
    }
    await setJson(STORAGE_KEYS.TEACHER, serializeTeacher(teacher));
  },

  async saveClasses(classes: Class[]) {
    await setJson(STORAGE_KEYS.CLASSES, classes.map(serializeClass));
  },

  async saveSessions(sessions: AttendanceSession[]) {
    await setJson(STORAGE_KEYS.SESSIONS, sessions.map(serializeSession));
  },

  async upsertSession(session: AttendanceSession) {
    const current = await getJson<SerializableAttendanceSession[] | null>(STORAGE_KEYS.SESSIONS) || [];
    const serialized = serializeSession(session);
    const idx = current.findIndex(item => item.id === serialized.id);
    if (idx === -1) {
      current.push(serialized);
    } else {
      current[idx] = serialized;
    }
    await setJson(STORAGE_KEYS.SESSIONS, current);
  },

  async removeSession(sessionId: string) {
    const current = await getJson<SerializableAttendanceSession[] | null>(STORAGE_KEYS.SESSIONS) || [];
    const filtered = current.filter(item => item.id !== sessionId);
    await setJson(STORAGE_KEYS.SESSIONS, filtered);
  },

  async addPendingAction(action: PendingAction) {
    const current = await getJson<PendingAction[] | null>(STORAGE_KEYS.PENDING) || [];
    current.push(action);
    await setJson(STORAGE_KEYS.PENDING, current);
  },

  async replacePendingActions(actions: PendingAction[]) {
    await setJson(STORAGE_KEYS.PENDING, actions);
  },

  async getPendingActions(): Promise<PendingAction[]> {
    return await getJson<PendingAction[] | null>(STORAGE_KEYS.PENDING) || [];
  },

  async clearPendingAction(actionId: string) {
    const current = await getJson<PendingAction[] | null>(STORAGE_KEYS.PENDING) || [];
    const filtered = current.filter(action => action.id !== actionId);
    await setJson(STORAGE_KEYS.PENDING, filtered);
  },

  async replaceSessionId(tempId: string, session: AttendanceSession) {
    const current = await getJson<SerializableAttendanceSession[] | null>(STORAGE_KEYS.SESSIONS) || [];
    const serialized = serializeSession(session);
    const mapped = current.map(item => {
      if (item.id === tempId) {
        return serialized;
      }
      if (item.meta?.tempId === tempId) {
        return serialized;
      }
      return item;
    });
    await setJson(STORAGE_KEYS.SESSIONS, mapped);
  },

  async updateRecord(sessionId: string, record: AttendanceRecord) {
    const current = await getJson<SerializableAttendanceSession[] | null>(STORAGE_KEYS.SESSIONS) || [];
    const updated = current.map(session => {
      if (session.id !== sessionId) return session;
      const serializedRecord = serializeRecord(record);
      const recordIdx = session.records.findIndex(item => item.id === serializedRecord.id);
      if (recordIdx === -1) {
        return {
          ...session,
          records: [...session.records, serializedRecord],
        };
      }
      const newRecords = [...session.records];
      newRecords[recordIdx] = serializedRecord;
      return {
        ...session,
        records: newRecords,
      };
    });
    await setJson(STORAGE_KEYS.SESSIONS, updated);
  },

  generateTempId: randomId,

  async saveUserProfile(profile: UserProfile | null) {
    if (!profile) {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      return;
    }
    await setJson(STORAGE_KEYS.USER_PROFILE, serializeUserProfile(profile));
  },

  async getUserProfile(): Promise<UserProfile | null> {
    const raw = await getJson<SerializableUserProfile | null>(STORAGE_KEYS.USER_PROFILE);
    return raw ? deserializeUserProfile(raw) : null;
  },
};

export type OfflineCachedState = CachedState;
