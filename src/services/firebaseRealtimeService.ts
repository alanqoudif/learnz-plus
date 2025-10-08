import { 
  ref, 
  onValue, 
  off,
  push,
  set,
  remove,
  Database
} from 'firebase/database';
import { database, REALTIME_PATHS } from '../config/firebase';

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

export class FirebaseRealtimeService {
  private static subscriptions: Map<string, RealtimeSubscription> = new Map();

  /**
   * الاستماع لتحديثات الحضور
   */
  static subscribeToAttendanceUpdates(
    teacherId: string,
    onAttendanceChange: (data: any) => void
  ): RealtimeSubscription {
    const subscriptionKey = `attendance_updates_${teacherId}`;
    
    try {
      // إلغاء الاشتراك السابق إذا كان موجوداً
      this.unsubscribe(subscriptionKey);

      const attendanceRef = ref(database, `${REALTIME_PATHS.ATTENDANCE_UPDATES}/${teacherId}`);
      
      const unsubscribe = onValue(attendanceRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          console.log('📅 Attendance update detected:', data);
          onAttendanceChange(data);
        }
      }, (error) => {
        console.error('❌ Firebase Realtime Database error:', error);
        // لا نرمي خطأ هنا، فقط نسجل الخطأ
      });

      const subscription: RealtimeSubscription = {
        unsubscribe: () => {
          console.log('Unsubscribing from attendance updates');
          off(attendanceRef, 'value', unsubscribe);
          this.subscriptions.delete(subscriptionKey);
        }
      };

      this.subscriptions.set(subscriptionKey, subscription);
      return subscription;
    } catch (error) {
      console.error('❌ Error setting up attendance subscription:', error);
      
      // إرجاع subscription وهمي في حالة الخطأ
      const dummySubscription: RealtimeSubscription = {
        unsubscribe: () => {
          console.log('Dummy unsubscribe called');
        }
      };
      
      return dummySubscription;
    }
  }

  /**
   * الاستماع للإشعارات
   */
  static subscribeToNotifications(
    teacherId: string,
    onNotificationChange: (data: any) => void
  ): RealtimeSubscription {
    const subscriptionKey = `notifications_${teacherId}`;
    
    try {
      // إلغاء الاشتراك السابق إذا كان موجوداً
      this.unsubscribe(subscriptionKey);

      const notificationsRef = ref(database, `${REALTIME_PATHS.NOTIFICATIONS}/${teacherId}`);
      
      const unsubscribe = onValue(notificationsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          console.log('🔔 Notification received:', data);
          onNotificationChange(data);
        }
      }, (error) => {
        console.error('❌ Firebase Realtime Database error:', error);
        // لا نرمي خطأ هنا، فقط نسجل الخطأ
      });

      const subscription: RealtimeSubscription = {
        unsubscribe: () => {
          console.log('Unsubscribing from notifications');
          off(notificationsRef, 'value', unsubscribe);
          this.subscriptions.delete(subscriptionKey);
        }
      };

      this.subscriptions.set(subscriptionKey, subscription);
      return subscription;
    } catch (error) {
      console.error('❌ Error setting up notifications subscription:', error);
      
      // إرجاع subscription وهمي في حالة الخطأ
      const dummySubscription: RealtimeSubscription = {
        unsubscribe: () => {
          console.log('Dummy unsubscribe called');
        }
      };
      
      return dummySubscription;
    }
  }

  /**
   * إرسال تحديث حضور
   */
  static async sendAttendanceUpdate(teacherId: string, update: any): Promise<void> {
    const updatesRef = ref(database, `${REALTIME_PATHS.ATTENDANCE_UPDATES}/${teacherId}`);
    const newUpdateRef = push(updatesRef);
    await set(newUpdateRef, {
      ...update,
      timestamp: Date.now()
    });
  }

  /**
   * إرسال إشعار
   */
  static async sendNotification(teacherId: string, notification: any): Promise<void> {
    const notificationsRef = ref(database, `${REALTIME_PATHS.NOTIFICATIONS}/${teacherId}`);
    const newNotificationRef = push(notificationsRef);
    await set(newNotificationRef, {
      ...notification,
      timestamp: Date.now(),
      read: false
    });
  }

  /**
   * حذف إشعار
   */
  static async deleteNotification(teacherId: string, notificationId: string): Promise<void> {
    const notificationRef = ref(database, `${REALTIME_PATHS.NOTIFICATIONS}/${teacherId}/${notificationId}`);
    await remove(notificationRef);
  }

  /**
   * إلغاء اشتراك محدد
   */
  static unsubscribe(subscriptionKey: string): void {
    const subscription = this.subscriptions.get(subscriptionKey);
    if (subscription) {
      subscription.unsubscribe();
    }
  }

  /**
   * إلغاء جميع الاشتراكات
   */
  static unsubscribeAll(): void {
    console.log('Unsubscribing from all Firebase realtime subscriptions');
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
