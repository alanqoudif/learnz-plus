import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Student } from '../types';
import { colors, fontFamilies, borderRadius, spacing } from '../utils/theme';
import { scaleButton } from '../utils/animations';
import { lightHaptic } from '../utils/haptics';

interface StudentItemProps {
  student: Student;
  index: number;
  onDelete: (studentId: string, studentName: string) => void;
}

const StudentItem: React.FC<StudentItemProps> = React.memo(({
  student,
  index,
  onDelete,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleDelete = useCallback(() => {
    lightHaptic();
    scaleButton(scaleAnim);
    onDelete(student.id, student.name);
  }, [student, onDelete]);

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{index + 1}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{student.name}</Text>
          <Text style={styles.date}>
            أضيف في: {new Date(student.createdAt).toLocaleDateString('ar-SA')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Re-render only if student data changes
  return (
    prevProps.student.id === nextProps.student.id &&
    prevProps.student.name === nextProps.student.name &&
    prevProps.index === nextProps.index
  );
});

StudentItem.displayName = 'StudentItem';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    direction: 'rtl',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  avatarText: {
    color: colors.text.light,
    fontFamily: fontFamilies.bold,
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
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
});

export default StudentItem;

