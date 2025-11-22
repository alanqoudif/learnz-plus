import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

/**
 * مكون Skeleton Loader مع تأثير shimmer
 * يستخدم لعرض حالة التحميل بشكل جذاب
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const { colors } = useTheme();
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[{ width, height, borderRadius, backgroundColor: colors.border.light, overflow: 'hidden' }, style]}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: colors.border.medium,
          opacity,
          borderRadius,
        }}
      />
    </View>
  );
};

/**
 * Skeleton لبطاقة فصل دراسي
 */
export const ClassCardSkeleton: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.background.primary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}>
      <SkeletonLoader width="60%" height={24} borderRadius={6} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="40%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SkeletonLoader width="45%" height={40} borderRadius={8} style={{ marginRight: 8 }} />
        <SkeletonLoader width="45%" height={40} borderRadius={8} />
      </View>
    </View>
  );
};

/**
 * Skeleton لعنصر طالب
 */
export const StudentItemSkeleton: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    }}>
      <SkeletonLoader width={50} height={50} borderRadius={25} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <SkeletonLoader width="70%" height={18} borderRadius={4} style={{ marginBottom: 6 }} />
        <SkeletonLoader width="40%" height={14} borderRadius={4} />
      </View>
    </View>
  );
};

/**
 * Skeleton لجلسة حضور
 */
export const SessionItemSkeleton: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.background.primary,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
    }}>
      <SkeletonLoader width="50%" height={20} borderRadius={6} style={{ marginBottom: 8 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SkeletonLoader width="30%" height={16} borderRadius={4} style={{ marginRight: 12 }} />
        <SkeletonLoader width="30%" height={16} borderRadius={4} />
      </View>
    </View>
  );
};

/**
 * Skeleton لقائمة فصول
 */
export const ClassListSkeleton: React.FC = () => {
  return (
    <>
      <ClassCardSkeleton />
      <ClassCardSkeleton />
      <ClassCardSkeleton />
    </>
  );
};

/**
 * Skeleton لقائمة طلاب
 */
export const StudentListSkeleton: React.FC = () => {
  return (
    <>
      <StudentItemSkeleton />
      <StudentItemSkeleton />
      <StudentItemSkeleton />
      <StudentItemSkeleton />
      <StudentItemSkeleton />
    </>
  );
};
