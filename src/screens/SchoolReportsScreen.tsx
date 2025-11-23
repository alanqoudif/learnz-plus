import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { fontFamilies, spacing, borderRadius, shadows } from '../utils/theme';
import { getSchoolMembers } from '../services/schoolService';
import { smartClassService, smartAttendanceService } from '../services/smartService';
import type { UserProfile, UserRole } from '../types';

interface TeacherReportCard {
  teacherId: string;
  name: string;
  role: UserRole;
  classes: number;
  students: number;
  attendance: {
    sessions: number;
    present: number;
    absent: number;
  };
}

interface SchoolOverview {
  teachersCount: number;
  classesCount: number;
  studentsCount: number;
  attendance: {
    sessions: number;
    present: number;
    absent: number;
  };
  teacherBreakdown: TeacherReportCard[];
}

export default function SchoolReportsScreen() {
  const { state } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = (state as any).userProfile as UserProfile | undefined;
  const schoolId = user?.schoolId;
  const isLeader = user?.role === 'leader';
  const [overview, setOverview] = useState<SchoolOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchOverview = useCallback(async () => {
    if (!schoolId || !isLeader) return;
    setLoading(true);
    try {
      const members = await getSchoolMembers(schoolId);
      const teacherStats: TeacherReportCard[] = [];
      for (const member of members) {
        try {
          const teacherClasses = await smartClassService.getClassesByTeacher(member.id);
          let studentCount = 0;
          let sessionsCount = 0;
          let presentCount = 0;
          let absentCount = 0;

          for (const cls of teacherClasses) {
            studentCount += Array.isArray(cls.students) ? cls.students.length : 0;
            const sessions = await smartAttendanceService.getAttendanceSessionsByClass(cls.id, 20);
            sessionsCount += sessions.length;
            sessions.forEach(session => {
              (session.records || []).forEach(record => {
                if (record.status === 'present') presentCount += 1;
                if (record.status === 'absent') absentCount += 1;
              });
            });
          }

          teacherStats.push({
            teacherId: member.id,
            name: member.name,
            role: member.role,
            classes: teacherClasses.length,
            students: studentCount,
            attendance: {
              sessions: sessionsCount,
              present: presentCount,
              absent: absentCount,
            },
          });
        } catch (error) {
          console.error('Failed to build stats for teacher', member.id, error);
          teacherStats.push({
            teacherId: member.id,
            name: member.name,
            role: member.role,
            classes: 0,
            students: 0,
            attendance: { sessions: 0, present: 0, absent: 0 },
          });
        }
      }

      const totals = teacherStats.reduce(
        (acc, teacher) => {
          acc.classesCount += teacher.classes;
          acc.studentsCount += teacher.students;
          acc.attendance.sessions += teacher.attendance.sessions;
          acc.attendance.present += teacher.attendance.present;
          acc.attendance.absent += teacher.attendance.absent;
          return acc;
        },
        {
          classesCount: 0,
          studentsCount: 0,
          attendance: { sessions: 0, present: 0, absent: 0 },
        }
      );

      setOverview({
        teachersCount: members.length,
        classesCount: totals.classesCount,
        studentsCount: totals.studentsCount,
        attendance: totals.attendance,
        teacherBreakdown: teacherStats,
      });
    } catch (error) {
      Alert.alert('خطأ', 'تعذر تحميل التقارير.');
    } finally {
      setLoading(false);
    }
  }, [schoolId, isLeader]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const metrics = useMemo(() => (
    [
      { label: 'المعلمين', value: overview?.teachersCount ?? 0, icon: 'people-outline' },
      { label: 'الفصول', value: overview?.classesCount ?? 0, icon: 'layers-outline' },
      { label: 'الطلاب', value: overview?.studentsCount ?? 0, icon: 'school-outline' },
      { label: 'جلسات الحضور', value: overview?.attendance.sessions ?? 0, icon: 'calendar-outline' },
    ]
  ), [overview]);

  const handleExport = useCallback(async () => {
    if (!overview) return;
    try {
      setExporting(true);
      const lines = [
        `تقرير المدرسة: ${user?.schoolName || ''}`,
        `المعلمين النشطين: ${overview.teachersCount}`,
        `إجمالي الفصول: ${overview.classesCount}`,
        `إجمالي الطلاب: ${overview.studentsCount}`,
        `جلسات الحضور: ${overview.attendance.sessions}`,
        `الحضور: ${overview.attendance.present} | الغياب: ${overview.attendance.absent}`,
        '',
        'تفاصيل كل معلم:',
      ];
      overview.teacherBreakdown.forEach((teacher, index) => {
        lines.push(
          `${index + 1}- ${teacher.name} (${teacher.role === 'leader' ? 'قائد' : 'معلم'}): ${teacher.classes} فصل / ${teacher.students} طالب — حضور ${teacher.attendance.present} | غياب ${teacher.attendance.absent}`
        );
      });
      await Share.share({ message: lines.join('\n') });
    } catch (error) {
      Alert.alert('خطأ', 'تعذر مشاركة التقرير');
    } finally {
      setExporting(false);
    }
  }, [overview, user?.schoolName]);

  if (!isLeader) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background.primary }]}>
        <View style={styles.centerMessage}>
          <Text style={[styles.centerText, { color: colors.text.secondary }]}>هذه الصفحة مخصصة لقائد المدرسة.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'], paddingHorizontal: spacing.lg }}>
        <View style={[styles.heroCard, { backgroundColor: colors.background.secondary, shadowColor: '#000' }]}>
          <View>
            <Text style={[styles.heroLabel, { color: colors.text.secondary }]}>لوحة السيطرة</Text>
            <Text style={[styles.heroTitle, { color: colors.text.primary }]}>تقارير المدرسة</Text>
            <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>راقب أداء الفصول وجلسات الحضور لكل معلم في المدرسة.</Text>
          </View>
          <Ionicons name="bar-chart-outline" size={30} color={colors.primary} />
        </View>

        <View style={styles.metricsRow}>
          {metrics.map(metric => (
            <View key={metric.label} style={[styles.metricCard, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}>
              <Ionicons name={metric.icon as any} size={18} color={colors.primary} />
              <Text style={[styles.metricValue, { color: colors.text.primary }]}>{metric.value}</Text>
              <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>{metric.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.exportButton, { backgroundColor: colors.primary, opacity: exporting ? 0.6 : 1 }]}
          onPress={handleExport}
          disabled={!overview || exporting}
        >
          <Text style={styles.exportText}>{exporting ? '...جارٍ التصدير' : 'مشاركة تقرير شامل'}</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>جارٍ جمع البيانات من الفصول...</Text>
          </View>
        ) : overview?.teacherBreakdown?.length ? (
          overview.teacherBreakdown.map(teacher => (
            <View key={teacher.teacherId} style={[styles.reportCard, { borderColor: colors.border.light, backgroundColor: colors.background.primary }]}>
              <View style={styles.reportHeader}>
                <Text style={[styles.reportName, { color: colors.text.primary }]}>{teacher.name || 'بدون اسم'}</Text>
                <View style={[styles.roleBadge, teacher.role === 'leader' ? styles.leaderBadge : styles.memberBadge]}>
                  <Text style={styles.roleBadgeText}>{teacher.role === 'leader' ? 'قائد' : 'معلم'}</Text>
                </View>
              </View>
              <Text style={[styles.reportLine, { color: colors.text.secondary }]}>الفصول: {teacher.classes} • الطلاب: {teacher.students}</Text>
              <Text style={[styles.reportLine, { color: colors.text.secondary }]}>جلسات: {teacher.attendance.sessions}</Text>
              <Text style={[styles.reportLine, { color: colors.text.secondary }]}>حضور: {teacher.attendance.present} | غياب: {teacher.attendance.absent}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyHint, { color: colors.text.secondary }]}>لا توجد بيانات فصول حتى الآن.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  centerText: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
  },
  heroCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.sm,
  },
  heroLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
  },
  heroSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flexBasis: '48%',
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metricValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
  },
  metricLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  exportButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  exportText: {
    color: '#fff',
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: fontFamilies.regular,
  },
  reportCard: {
    borderWidth: 1,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  reportName: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  leaderBadge: {
    backgroundColor: '#E6F4EA',
  },
  memberBadge: {
    backgroundColor: '#E7E9F5',
  },
  roleBadgeText: {
    fontFamily: fontFamilies.semibold,
    color: '#1f2937',
  },
  reportLine: {
    fontFamily: fontFamilies.regular,
    marginTop: spacing.xs,
  },
  emptyHint: {
    textAlign: 'center',
    fontFamily: fontFamilies.regular,
    marginTop: spacing['2xl'],
  },
});
