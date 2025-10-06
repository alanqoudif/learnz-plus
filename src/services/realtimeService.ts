import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

export class RealtimeService {
  private static subscriptions: Map<string, RealtimeSubscription> = new Map();

  /**
   * إنشاء subscription للفصول الدراسية
   */
  static subscribeToClasses(
    teacherId: string,
    onClassesChange: (payload: any) => void
  ): RealtimeSubscription {
    const channelName = `classes_changes_${teacherId}`;
    
    // إلغاء الاشتراك السابق إذا كان موجوداً
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'classes',
          filter: `teacher_id=eq.${teacherId}`
        }, 
        (payload) => {
          console.log('📚 Classes change detected:', payload.eventType, payload.new || payload.old);
          onClassesChange(payload);
        }
      )
      .subscribe();

    const subscription: RealtimeSubscription = {
      channel,
      unsubscribe: () => {
        console.log('Unsubscribing from classes changes');
        channel.unsubscribe();
        this.subscriptions.delete(channelName);
      }
    };

    this.subscriptions.set(channelName, subscription);
    return subscription;
  }

  /**
   * إنشاء subscription للطلاب
   */
  static subscribeToStudents(
    teacherId: string,
    onStudentsChange: (payload: any) => void
  ): RealtimeSubscription {
    const channelName = `students_changes_${teacherId}`;
    
    // إلغاء الاشتراك السابق إذا كان موجوداً
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'students'
        }, 
        (payload) => {
          console.log('👥 Students change detected:', payload.eventType, payload.new || payload.old);
          onStudentsChange(payload);
        }
      )
      .subscribe();

    const subscription: RealtimeSubscription = {
      channel,
      unsubscribe: () => {
        console.log('Unsubscribing from students changes');
        channel.unsubscribe();
        this.subscriptions.delete(channelName);
      }
    };

    this.subscriptions.set(channelName, subscription);
    return subscription;
  }

  /**
   * إنشاء subscription لجلسات الحضور
   */
  static subscribeToAttendanceSessions(
    teacherId: string,
    onSessionsChange: (payload: any) => void
  ): RealtimeSubscription {
    const channelName = `attendance_sessions_changes_${teacherId}`;
    
    // إلغاء الاشتراك السابق إذا كان موجوداً
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'attendance_sessions'
        }, 
        (payload) => {
          console.log('📅 Attendance sessions change detected:', payload.eventType, payload.new || payload.old);
          onSessionsChange(payload);
        }
      )
      .subscribe();

    const subscription: RealtimeSubscription = {
      channel,
      unsubscribe: () => {
        console.log('Unsubscribing from attendance sessions changes');
        channel.unsubscribe();
        this.subscriptions.delete(channelName);
      }
    };

    this.subscriptions.set(channelName, subscription);
    return subscription;
  }

  /**
   * إنشاء subscription لسجلات الحضور
   */
  static subscribeToAttendanceRecords(
    teacherId: string,
    onRecordsChange: (payload: any) => void
  ): RealtimeSubscription {
    const channelName = `attendance_records_changes_${teacherId}`;
    
    // إلغاء الاشتراك السابق إذا كان موجوداً
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'attendance_records'
        }, 
        (payload) => {
          console.log('✅ Attendance records change detected:', payload.eventType, payload.new || payload.old);
          onRecordsChange(payload);
        }
      )
      .subscribe();

    const subscription: RealtimeSubscription = {
      channel,
      unsubscribe: () => {
        console.log('Unsubscribing from attendance records changes');
        channel.unsubscribe();
        this.subscriptions.delete(channelName);
      }
    };

    this.subscriptions.set(channelName, subscription);
    return subscription;
  }

  /**
   * إنشاء subscription لفصل دراسي محدد
   */
  static subscribeToClassAttendance(
    classId: string,
    onAttendanceChange: (payload: any) => void
  ): RealtimeSubscription {
    const channelName = `attendance_class_${classId}`;
    
    // إلغاء الاشتراك السابق إذا كان موجوداً
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'attendance_sessions',
          filter: `class_id=eq.${classId}`
        }, 
        (payload) => {
          console.log('📅 Class attendance session change detected:', payload.eventType);
          onAttendanceChange(payload);
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'attendance_records',
          filter: `class_id=eq.${classId}`
        }, 
        (payload) => {
          console.log('✅ Class attendance record change detected:', payload.eventType);
          onAttendanceChange(payload);
        }
      )
      .subscribe();

    const subscription: RealtimeSubscription = {
      channel,
      unsubscribe: () => {
        console.log('Unsubscribing from class attendance changes');
        channel.unsubscribe();
        this.subscriptions.delete(channelName);
      }
    };

    this.subscriptions.set(channelName, subscription);
    return subscription;
  }

  /**
   * إلغاء اشتراك محدد
   */
  static unsubscribe(channelName: string): void {
    const subscription = this.subscriptions.get(channelName);
    if (subscription) {
      subscription.unsubscribe();
    }
  }

  /**
   * إلغاء جميع الاشتراكات
   */
  static unsubscribeAll(): void {
    console.log('Unsubscribing from all realtime channels');
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }

  /**
   * الحصول على قائمة الاشتراكات النشطة
   */
  static getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}
