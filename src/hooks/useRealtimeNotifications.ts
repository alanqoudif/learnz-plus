import { useState, useCallback } from 'react';

export interface RealtimeNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);

  const addNotification = useCallback((
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => {
    const id = Date.now().toString();
    const notification: RealtimeNotification = {
      id,
      message,
      type,
      timestamp: Date.now(),
    };

    setNotifications(prev => [...prev, notification]);

    // إزالة الإشعار بعد 5 ثوان
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };
}
