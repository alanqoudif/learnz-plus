import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Class } from '../types';
import { fontFamilies, shadows, borderRadius, spacing } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { scaleButton } from '../utils/animations';
import { lightHaptic, mediumHaptic } from '../utils/haptics';

interface ClassCardProps {
  item: Class;
  onPress: (classItem: Class) => void;
  onDelete: (classId: string, className: string) => void;
  onManageStudents: (classId: string) => void;
  onAttendance: (classId: string) => void;
  onViewHistory: (classId: string) => void;
}

const ClassCard: React.FC<ClassCardProps> = React.memo(({
  item,
  onPress,
  onDelete,
  onManageStudents,
  onAttendance,
  onViewHistory,
}) => {
  const { colors } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    lightHaptic();
    scaleButton(scaleAnim);
    onPress(item);
  }, [item, onPress]);

  const handleDelete = useCallback(() => {
    mediumHaptic();
    onDelete(item.id, `${item.name} - شعبة ${item.section}`);
  }, [item, onDelete]);

  const handleManageStudents = useCallback(() => {
    lightHaptic();
    onManageStudents(item.id);
  }, [item, onManageStudents]);

  const handleAttendance = useCallback(() => {
    lightHaptic();
    onAttendance(item.id);
  }, [item, onAttendance]);

  const handleViewHistory = useCallback(() => {
    lightHaptic();
    onViewHistory(item.id);
  }, [item, onViewHistory]);

  return (
    <Animated.View style={[{
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      marginBottom: spacing.md,
      ...shadows.md,
      borderWidth: 1,
      borderColor: colors.border.light,
    }, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: spacing.md,
          direction: 'rtl',
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 20,
              fontFamily: fontFamilies.bold,
              color: colors.text.primary,
              marginBottom: 4,
              textAlign: 'right',
            }}>{item.name}</Text>
            <Text style={{
              fontSize: 16,
              fontFamily: fontFamilies.regular,
              color: colors.text.secondary,
              textAlign: 'right',
            }}>شعبة {item.section}</Text>
          </View>
          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.background.secondary,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border.medium,
            }}
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger || '#FF3B30'} />
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: spacing.md }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.xs,
          direction: 'rtl',
          gap: spacing.xs,
        }}>
          <Ionicons name="people-circle" size={18} color={colors.primary} />
          <Text style={{
            fontSize: 14,
            fontFamily: fontFamilies.medium,
            color: colors.text.primary,
            textAlign: 'right',
          }}>عدد الطلاب: {item.students.length}</Text>
        </View>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.xs,
          direction: 'rtl',
          gap: spacing.xs,
        }}>
          <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
          <Text style={{
            fontSize: 13,
            fontFamily: fontFamilies.regular,
            color: colors.text.secondary,
            textAlign: 'right',
          }}>
            {new Date(item.createdAt).toLocaleDateString('ar-SA')}
          </Text>
        </View>
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
          direction: 'rtl',
          gap: spacing.sm,
        }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              borderRadius: borderRadius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.secondary,
            }}
            onPress={handleManageStudents}
            activeOpacity={0.8}
          >
            <Text style={{
              color: colors.text.light,
              fontFamily: fontFamilies.semibold,
              fontSize: 14,
            }}>إدارة الطلاب</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: spacing.md,
              borderRadius: borderRadius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primary,
            }}
            onPress={handleAttendance}
            activeOpacity={0.8}
          >
            <Text style={{
              color: colors.text.light,
              fontFamily: fontFamilies.semibold,
              fontSize: 14,
            }}>
              تسجيل الحضور
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.background.secondary,
            paddingVertical: spacing.sm,
            borderRadius: borderRadius.lg,
            gap: spacing.sm,
            borderWidth: 1,
            borderColor: colors.border.light,
          }}
          onPress={handleViewHistory}
          activeOpacity={0.8}
        >
          <Ionicons name="stats-chart" size={16} color={colors.primary} />
          <Text style={{
            color: colors.primary,
            fontFamily: fontFamilies.semibold,
            fontSize: 14,
          }}>عرض السجل</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - re-render only if data changes
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.name === nextProps.item.name &&
    prevProps.item.section === nextProps.item.section &&
    prevProps.item.students.length === nextProps.item.students.length
  );
});

ClassCard.displayName = 'ClassCard';

export default ClassCard;
