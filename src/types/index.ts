export interface Teacher {
  id: string;
  name: string;
  phoneNumber: string;
  createdAt: Date;
}

export interface Class {
  id: string;
  name: string; // مثل "الخامس"
  section: string; // مثل "أ" أو "ب" أو "ج"
  teacherId: string;
  students: Student[];
  createdAt: Date;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  createdAt: Date;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  sessionId?: string;
  attendanceTime: Date; // وقت تسجيل الحضور الفعلي
  status: 'present' | 'absent';
  createdAt: Date;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  date: Date;
  records: AttendanceRecord[];
  createdAt: Date;
}

export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  Dashboard: undefined;
  ClassManagement: undefined;
  AddClass: undefined;
  EditClass: { classId: string };
  StudentManagement: { classId: string };
  AddStudent: { classId: string };
  Attendance: { classId: string };
  AttendanceHistory: { classId: string };
};
