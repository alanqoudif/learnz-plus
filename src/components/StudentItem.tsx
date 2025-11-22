import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Student } from '../types';
import { fontFamilies, borderRadius, spacing } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
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
  const { colors } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleDelete = useCallback(() => {
    lightHaptic();
    scaleButton(scaleAnim);
    onDelete(student.id, student.name);
  }, [student, onDelete]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.background.card,
          borderRadius: borderRadius.lg,
          marginBottom: spacing.sm,
          borderWidth: 1,
          borderColor: colors.border.light,
        },
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        direction: 'rtl',
      }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginLeft: spacing.md,
        }}>
          <Text style={{
            color: colors.text.light,
            fontFamily: fontFamilies.bold,
            fontSize: 18,
          }}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            fontFamily: fontFamilies.semibold,
            color: colors.text.primary,
            marginBottom: 4,
          }}>{student.name}</Text>
          <Text style={{
            fontSize: 12,
            fontFamily: fontFamilies.regular,
            color: colors.text.secondary,
          }}>
            أضيف في: {new Date(student.createdAt).toLocaleDateString('ar-SA')}
          </Text>
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
          <Text style={{ fontSize: 16 }}>🗑️</Text>
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

export default StudentItem;

