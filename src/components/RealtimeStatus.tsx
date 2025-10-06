import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../config/supabase';
import { fontFamilies } from '../utils/theme';

interface RealtimeStatusProps {
  visible?: boolean;
}

export default function RealtimeStatus({ visible = true }: RealtimeStatusProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    if (!visible) return;

    // مراقبة حالة الاتصال
    const checkConnection = () => {
      const channel = supabase.channel('connection_test');
      
      channel
        .on('system', {}, (status) => {
          console.log('Realtime connection status:', status);
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionStatus('connected');
          } else if (status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            setConnectionStatus('disconnected');
          }
        })
        .subscribe();

      // تنظيف الاشتراك بعد 5 ثوان
      setTimeout(() => {
        channel.unsubscribe();
      }, 5000);
    };

    // فحص الاتصال كل 30 ثانية
    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={[
        styles.statusIndicator,
        { backgroundColor: isConnected ? '#28a745' : '#dc3545' }
      ]} />
      <Text style={styles.statusText}>
        {connectionStatus === 'connected' ? 'متصل' : 
         connectionStatus === 'connecting' ? 'جاري الاتصال...' : 'غير متصل'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
  },
});
