import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Class } from '../types';
import { colors, fontFamilies, shadows, borderRadius, spacing } from '../utils/theme';
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
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.className}>{item.name}</Text>
            <Text style={styles.classSection}>شعبة {item.section}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👥</Text>
            <Text style={styles.infoText}>عدد الطلاب: {item.students.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoDate}>
              {new Date(item.createdAt).toLocaleDateString('ar-SA')}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleManageStudents}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>إدارة الطلاب</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleAttendance}
            activeOpacity={0.8}
          >
            <Text style={[styles.actionButtonText, styles.primaryButtonText]}>
              تسجيل الحضور
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.historyButton}
          onPress={handleViewHistory}
          activeOpacity={0.8}
        >
          <Text style={styles.historyButtonText}>📊 عرض تاريخ الحضور</Text>
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    direction: 'rtl',
  },
  headerInfo: {
    flex: 1,
  },
  className: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  classSection: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: colors.text.secondary,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  deleteIcon: {
    fontSize: 18,
  },
  info: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    direction: 'rtl',
  },
  infoIcon: {
    fontSize: 14,
    marginLeft: spacing.xs,
  },
  infoText: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    color: colors.text.primary,
  },
  infoDate: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    direction: 'rtl',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    color: colors.text.light,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  primaryButtonText: {
    color: colors.text.light,
  },
  historyButton: {
    backgroundColor: colors.info,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyButtonText: {
    color: colors.text.light,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
});

export default ClassCard;

