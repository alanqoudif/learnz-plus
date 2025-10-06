import { createClient } from '@supabase/supabase-js';

// إعدادات Supabase - تم تحديثها بقيمك الفعلية
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dtvfavzmrvwerupcyyau.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dmZhdnptcnZ3ZXJ1cGN5eWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NDk3MjMsImV4cCI6MjA3NTMyNTcyM30.-4z78Ss7V6manjndrblmKSKbQFZLkS5EgDICL4JKTTA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// أنواع البيانات لقاعدة البيانات
export interface Database {
  public: {
    Tables: {
      teachers: {
        Row: {
          id: string;
          name: string;
          phone_number: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone_number: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone_number?: string;
          created_at?: string;
        };
      };
      classes: {
        Row: {
          id: string;
          name: string;
          section: string;
          teacher_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          section: string;
          teacher_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          section?: string;
          teacher_id?: string;
          created_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          name: string;
          class_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          class_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          class_id?: string;
          created_at?: string;
        };
      };
      attendance_sessions: {
        Row: {
          id: string;
          class_id: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          date?: string;
          created_at?: string;
        };
      };
      attendance_records: {
        Row: {
          id: string;
          student_id: string;
          class_id: string;
          session_id: string;
          status: 'present' | 'absent';
          attendance_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          class_id: string;
          session_id: string;
          status: 'present' | 'absent';
          attendance_time?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          class_id?: string;
          session_id?: string;
          status?: 'present' | 'absent';
          attendance_time?: string;
          created_at?: string;
        };
      };
    };
  };
}
