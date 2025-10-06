import { supabase } from '../config/supabase';
import { Teacher, Class, Student, AttendanceSession, AttendanceRecord } from '../types';

// خدمة المعلمين
export const teacherService = {
  // إنشاء معلم جديد
  async createTeacher(teacher: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
    const { data, error } = await supabase
      .from('teachers')
      .insert({
        name: teacher.name,
        phone_number: teacher.phoneNumber,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      phoneNumber: data.phone_number,
      createdAt: new Date(data.created_at),
    };
  },

  // البحث عن معلم برقم الهاتف
  async findTeacherByPhone(phoneNumber: string): Promise<Teacher | null> {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      phoneNumber: data.phone_number,
      createdAt: new Date(data.created_at),
    };
  },

  // تحديث بيانات المعلم
  async updateTeacher(id: string, updates: Partial<Omit<Teacher, 'id' | 'createdAt'>>): Promise<Teacher> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.phoneNumber) updateData.phone_number = updates.phoneNumber;

    const { data, error } = await supabase
      .from('teachers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      phoneNumber: data.phone_number,
      createdAt: new Date(data.created_at),
    };
  },
};

// خدمة الفصول الدراسية
export const classService = {
  // إنشاء فصل جديد
  async createClass(classData: Omit<Class, 'id' | 'createdAt' | 'students'>): Promise<Class> {
    const { data, error } = await supabase
      .from('classes')
      .insert({
        name: classData.name,
        section: classData.section,
        teacher_id: classData.teacherId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      section: data.section,
      teacherId: data.teacher_id,
      students: [],
      createdAt: new Date(data.created_at),
    };
  },

  // جلب جميع فصول المعلم
  async getClassesByTeacher(teacherId: string): Promise<Class[]> {
    const { data: classesData, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (classesError) throw classesError;

    // جلب الطلاب لكل فصل
    const classesWithStudents = await Promise.all(
      classesData.map(async (classData) => {
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*')
          .eq('class_id', classData.id)
          .order('created_at', { ascending: true });

        if (studentsError) throw studentsError;

        const students: Student[] = studentsData.map(student => ({
          id: student.id,
          name: student.name,
          classId: student.class_id,
          createdAt: new Date(student.created_at),
        }));

        return {
          id: classData.id,
          name: classData.name,
          section: classData.section,
          teacherId: classData.teacher_id,
          students,
          createdAt: new Date(classData.created_at),
        };
      })
    );

    return classesWithStudents;
  },

  // تحديث فصل
  async updateClass(id: string, updates: Partial<Omit<Class, 'id' | 'createdAt' | 'students' | 'teacherId'>>): Promise<Class> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.section) updateData.section = updates.section;

    const { data, error } = await supabase
      .from('classes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // جلب الطلاب
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', id)
      .order('created_at', { ascending: true });

    if (studentsError) throw studentsError;

    const students: Student[] = studentsData.map(student => ({
      id: student.id,
      name: student.name,
      classId: student.class_id,
      createdAt: new Date(student.created_at),
    }));

    return {
      id: data.id,
      name: data.name,
      section: data.section,
      teacherId: data.teacher_id,
      students,
      createdAt: new Date(data.created_at),
    };
  },

  // حذف فصل
  async deleteClass(id: string): Promise<void> {
    // حذف سجلات الحضور أولاً
    await supabase
      .from('attendance_records')
      .delete()
      .eq('class_id', id);

    // حذف جلسات الحضور
    await supabase
      .from('attendance_sessions')
      .delete()
      .eq('class_id', id);

    // حذف الطلاب
    await supabase
      .from('students')
      .delete()
      .eq('class_id', id);

    // حذف الفصل
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// خدمة الطلاب
export const studentService = {
  // إضافة طالب جديد
  async createStudent(student: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
    const { data, error } = await supabase
      .from('students')
      .insert({
        name: student.name,
        class_id: student.classId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      classId: data.class_id,
      createdAt: new Date(data.created_at),
    };
  },

  // تحديث بيانات الطالب
  async updateStudent(id: string, updates: Partial<Omit<Student, 'id' | 'createdAt' | 'classId'>>): Promise<Student> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;

    const { data, error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      classId: data.class_id,
      createdAt: new Date(data.created_at),
    };
  },

  // حذف طالب
  async deleteStudent(id: string): Promise<void> {
    // حذف سجلات الحضور أولاً
    await supabase
      .from('attendance_records')
      .delete()
      .eq('student_id', id);

    // حذف الطالب
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// خدمة الحضور والغياب
export const attendanceService = {
  // إنشاء جلسة حضور جديدة
  async createAttendanceSession(session: Omit<AttendanceSession, 'id' | 'createdAt' | 'records'>): Promise<AttendanceSession> {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert({
        class_id: session.classId,
        date: session.date.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      classId: data.class_id,
      date: new Date(data.date),
      records: [],
      createdAt: new Date(data.created_at),
    };
  },

  // تسجيل حضور/غياب
  async recordAttendance(record: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord> {
    // أولاً، تحقق من وجود سجل موجود
    const { data: existingRecord, error: checkError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('student_id', record.studentId)
      .eq('session_id', record.sessionId || '')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError; // PGRST116 = no rows returned
    }

    let data, error;

    if (existingRecord) {
      // تحديث السجل الموجود
      const result = await supabase
        .from('attendance_records')
        .update({
          status: record.status,
          attendance_time: record.date.toISOString(),
        })
        .eq('student_id', record.studentId)
        .eq('session_id', record.sessionId || '')
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    } else {
      // إنشاء سجل جديد
      const result = await supabase
        .from('attendance_records')
        .insert({
          student_id: record.studentId,
          class_id: record.classId,
          session_id: record.sessionId || '',
          status: record.status,
          attendance_time: record.date.toISOString(),
        })
        .select()
        .single();
      
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    return {
      id: data.id,
      studentId: data.student_id,
      classId: data.class_id,
      sessionId: data.session_id,
      status: data.status,
      date: new Date(data.attendance_time),
      attendanceTime: new Date(data.attendance_time),
      createdAt: new Date(data.created_at),
    };
  },

  // جلب جلسات الحضور لفصل معين
  async getAttendanceSessionsByClass(classId: string): Promise<AttendanceSession[]> {
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('class_id', classId)
      .order('date', { ascending: false });

    if (sessionsError) throw sessionsError;

    // جلب سجلات الحضور لكل جلسة
    const sessionsWithRecords = await Promise.all(
      sessionsData.map(async (sessionData) => {
        const { data: recordsData, error: recordsError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('created_at', { ascending: true });

        if (recordsError) throw recordsError;

        const records: AttendanceRecord[] = recordsData.map(record => ({
          id: record.id,
          studentId: record.student_id,
          classId: record.class_id,
          sessionId: record.session_id,
          status: record.status,
          date: new Date(record.attendance_time),
          attendanceTime: new Date(record.attendance_time),
          createdAt: new Date(record.created_at),
        }));

        return {
          id: sessionData.id,
          classId: sessionData.class_id,
          date: new Date(sessionData.date),
          records,
          createdAt: new Date(sessionData.created_at),
        };
      })
    );

    return sessionsWithRecords;
  },

  // جلب سجل حضور طالب معين
  async getStudentAttendanceHistory(studentId: string, classId: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(record => ({
      id: record.id,
      studentId: record.student_id,
      classId: record.class_id,
      sessionId: record.session_id,
      status: record.status,
      date: new Date(record.attendance_time),
      attendanceTime: new Date(record.attendance_time),
      createdAt: new Date(record.created_at),
    }));
  },
};
