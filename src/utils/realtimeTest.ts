import { supabase } from '../config/supabase';

/**
 * اختبار بسيط لـ Realtime functionality
 */
export class RealtimeTest {
  /**
   * اختبار الاتصال بـ Supabase Realtime
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Realtime connection...');
      
      const channel = supabase.channel('test_connection');
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('❌ Realtime connection test timeout');
          channel.unsubscribe();
          resolve(false);
        }, 5000);

        channel
          .on('system', {}, (status) => {
            console.log('📡 Realtime status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('✅ Realtime connection successful');
              clearTimeout(timeout);
              channel.unsubscribe();
              resolve(true);
            } else if (status === 'CHANNEL_ERROR') {
              console.log('❌ Realtime connection failed');
              clearTimeout(timeout);
              channel.unsubscribe();
              resolve(false);
            }
          })
          .subscribe();
      });
    } catch (error) {
      console.error('❌ Realtime test error:', error);
      return false;
    }
  }

  /**
   * اختبار إرسال واستقبال رسالة
   */
  static async testMessageSending(): Promise<boolean> {
    try {
      console.log('📤 Testing message sending...');
      
      const testChannel = supabase.channel('test_messages');
      const testMessage = `Test message ${Date.now()}`;
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('❌ Message test timeout');
          testChannel.unsubscribe();
          resolve(false);
        }, 5000);

        // الاستماع للرسائل
        testChannel
          .on('broadcast', { event: 'test' }, (payload) => {
            console.log('📥 Received test message:', payload.message);
            if (payload.message === testMessage) {
              console.log('✅ Message test successful');
              clearTimeout(timeout);
              testChannel.unsubscribe();
              resolve(true);
            }
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              // إرسال رسالة اختبار
              testChannel.send({
                type: 'broadcast',
                event: 'test',
                payload: { message: testMessage }
              });
            }
          });
      });
    } catch (error) {
      console.error('❌ Message test error:', error);
      return false;
    }
  }

  /**
   * اختبار Postgres changes
   */
  static async testPostgresChanges(): Promise<boolean> {
    try {
      console.log('🗄️ Testing Postgres changes...');
      
      const testChannel = supabase.channel('test_postgres');
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('❌ Postgres changes test timeout');
          testChannel.unsubscribe();
          resolve(false);
        }, 10000);

        testChannel
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'teachers' 
            }, 
            (payload) => {
              console.log('📊 Postgres change detected:', payload);
              console.log('✅ Postgres changes test successful');
              clearTimeout(timeout);
              testChannel.unsubscribe();
              resolve(true);
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('📡 Listening for Postgres changes...');
              // يمكن إضافة سجل اختبار هنا إذا لزم الأمر
            }
          });
      });
    } catch (error) {
      console.error('❌ Postgres changes test error:', error);
      return false;
    }
  }

  /**
   * تشغيل جميع الاختبارات
   */
  static async runAllTests(): Promise<{
    connection: boolean;
    messages: boolean;
    postgres: boolean;
    overall: boolean;
  }> {
    console.log('🚀 Starting Realtime tests...');
    
    const connection = await this.testConnection();
    const messages = await this.testMessageSending();
    const postgres = await this.testPostgresChanges();
    
    const overall = connection && messages && postgres;
    
    console.log('📋 Test Results:');
    console.log(`  Connection: ${connection ? '✅' : '❌'}`);
    console.log(`  Messages: ${messages ? '✅' : '❌'}`);
    console.log(`  Postgres: ${postgres ? '✅' : '❌'}`);
    console.log(`  Overall: ${overall ? '✅' : '❌'}`);
    
    return { connection, messages, postgres, overall };
  }
}

/**
 * دالة مساعدة لتشغيل الاختبارات من console
 */
export const runRealtimeTests = () => {
  return RealtimeTest.runAllTests();
};
