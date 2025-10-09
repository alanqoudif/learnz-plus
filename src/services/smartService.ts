/**
 * Firebase-only service - No offline storage
 */

import { authService, classService, studentService, attendanceService } from './firebaseService';

// Firebase Only Mode - No Offline Storage

// Smart Auth Service - Firebase Only
export const smartAuthService = {
  async signInWithEmail(email: string, password: string) {
    console.log('🔥 Using Firebase Auth');
    return await authService.signInWithEmail(email, password);
  },

  async signInWithPhone(phoneNumber: string, password: string) {
    console.log('🔥 Using Firebase Auth');
    return await authService.signInWithPhone(phoneNumber, password);
  },

  async createAccount(email: string, password: string, name: string) {
    console.log('🔥 Using Firebase Auth');
    return await authService.createAccount(email, password, name);
  },

  async signOut() {
    console.log('🔥 Using Firebase Auth');
    return await authService.signOut();
  },

  getCurrentUser() {
    console.log('🔥 Using Firebase Auth');
    return authService.getCurrentUser();
  },

  async checkAuthStatus() {
    console.log('🔥 Using Firebase Auth');
    return await authService.checkAuthStatus();
  }
};

// Smart Class Service - Firebase Only
export const smartClassService = {
  async createClass(classData: any) {
    console.log('🔥 Using Firebase Class Service');
    return await classService.createClass(classData);
  },

  async getClassesByTeacher(teacherId: string) {
    console.log('🔥 Using Firebase Class Service');
    return await classService.getClassesByTeacher(teacherId);
  },

  async updateClass(id: string, updates: any) {
    console.log('🔥 Using Firebase Class Service');
    return await classService.updateClass(id, updates);
  },

  async deleteClass(id: string) {
    console.log('🔥 Using Firebase Class Service');
    return await classService.deleteClass(id);
  }
};

// Smart Student Service - Firebase Only
export const smartStudentService = {
  async createStudent(student: any) {
    console.log('🔥 Using Firebase Student Service');
    return await studentService.createStudent(student);
  },

  async updateStudent(id: string, updates: any) {
    console.log('🔥 Using Firebase Student Service');
    return await studentService.updateStudent(id, updates);
  },

  async deleteStudent(id: string) {
    console.log('🔥 Using Firebase Student Service');
    return await studentService.deleteStudent(id);
  }
};

// Smart Attendance Service - Firebase Only
export const smartAttendanceService = {
  async createAttendanceSession(session: any) {
    console.log('🔥 Using Firebase Attendance Service');
    return await attendanceService.createAttendanceSession(session);
  },

  async recordAttendance(record: any) {
    console.log('🔥 Using Firebase Attendance Service');
    return await attendanceService.recordAttendance(record);
  },

  async getAttendanceSessionsByClass(classId: string, maxResults: number = 10) {
    console.log('🔥 Using Firebase Attendance Service');
    return await attendanceService.getAttendanceSessionsByClass(classId, maxResults);
  },

  async getStudentAttendanceHistory(studentId: string, classId: string) {
    console.log('🔥 Using Firebase Attendance Service');
    return await attendanceService.getStudentAttendanceHistory(studentId, classId);
  }
};
