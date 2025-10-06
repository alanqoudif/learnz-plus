import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { fontFamilies } from '../utils/theme';

interface RealtimeNotificationProps {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  visible: boolean;
  duration?: number;
  onHide?: () => void;
}

export default function RealtimeNotification({
  message,
  type,
  visible,
  duration = 3000,
  onHide
}: RealtimeNotificationProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-50));

  useEffect(() => {
    if (visible) {
      // إظهار الإشعار
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // إخفاء الإشعار بعد المدة المحددة
      const timer = setTimeout(() => {
        hideNotification();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideNotification();
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#d4edda', borderColor: '#c3e6cb', textColor: '#155724' };
      case 'info':
        return { backgroundColor: '#d1ecf1', borderColor: '#bee5eb', textColor: '#0c5460' };
      case 'warning':
        return { backgroundColor: '#fff3cd', borderColor: '#ffeaa7', textColor: '#856404' };
      case 'error':
        return { backgroundColor: '#f8d7da', borderColor: '#f5c6cb', textColor: '#721c24' };
      default:
        return { backgroundColor: '#d1ecf1', borderColor: '#bee5eb', textColor: '#0c5460' };
    }
  };

  const typeStyles = getTypeStyles();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: typeStyles.backgroundColor,
          borderColor: typeStyles.borderColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>
          {type === 'success' ? '✅' :
           type === 'info' ? 'ℹ️' :
           type === 'warning' ? '⚠️' : '❌'}
        </Text>
      </View>
      <Text style={[styles.message, { color: typeStyles.textColor }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 16,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    lineHeight: 20,
  },
});
