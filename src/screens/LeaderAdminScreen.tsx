import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  Share,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { fontFamilies, colors, spacing, borderRadius, shadows } from '../utils/theme';
import { communityService } from '../services/communityService';
import { adminService } from '../services/adminService';
import { getSchoolMembers, updateMemberRole } from '../services/schoolService';
import { smartClassService, smartAttendanceService } from '../services/smartService';
import type { UserRole } from '../types';

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

export default function LeaderAdminScreen() {
  const { state } = useApp();
  const user = (state as any).userProfile;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});
  const [members, setMembers] = useState<any[]>([]);
  const [invite, setInvite] = useState<string>('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [credVisible, setCredVisible] = useState(false);
  const [lastCred, setLastCred] = useState<{ email: string; password: string } | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);
  const [overview, setOverview] = useState<SchoolOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [exportingReport, setExportingReport] = useState(false);

  const schoolId = user?.schoolId;
  const isLeader = user?.role === 'leader';

  const loadMembers = useCallback(async () => {
    if (!schoolId || !isLeader) return;
    try {
      const list = await getSchoolMembers(schoolId);
      setMembers(list);
    } catch (error) {
      console.error('Failed to load members', error);
      Alert.alert('خطأ', 'تعذر تحميل قائمة المعلمين');
    }
  }, [schoolId, isLeader]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const buildOverview = useCallback(async () => {
    if (!isLeader || !schoolId || !members.length) {
      setOverview(null);
      return;
    }

    setOverviewLoading(true);
    try {
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
            try {
              const sessions = await smartAttendanceService.getAttendanceSessionsByClass(cls.id, 15);
              sessionsCount += sessions.length;
              sessions.forEach(session => {
                (session.records || []).forEach(record => {
                  if (record.status === 'present') presentCount += 1;
                  if (record.status === 'absent') absentCount += 1;
                });
              });
            } catch (error) {
              console.warn('تعذر تحميل جلسات الفصل', cls.id, error);
            }
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
          console.error('تعذر تحميل بيانات المعلم', member.id, error);
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
      console.error('تعذر تحميل لوحة التقارير', error);
      Alert.alert('خطأ', 'تعذر تحميل التقارير الشاملة');
    } finally {
      setOverviewLoading(false);
    }
  }, [isLeader, schoolId, members]);

  useEffect(() => {
    buildOverview();
  }, [buildOverview]);

  const handleRefreshInvite = useCallback(async () => {
    if (!schoolId) return;
    try {
      setInviteLoading(true);
      const res = await communityService.refreshInviteCode(schoolId);
      setInvite(res.inviteCode);
      Alert.alert('تم', `تم إنشاء رمز جديد: ${res.inviteCode}`);
    } catch (error: any) {
      Alert.alert('خطأ', error?.message || 'تعذر إنشاء رمز جديد');
    } finally {
      setInviteLoading(false);
    }
  }, [schoolId]);

  const handleCreateTeacher = async () => {
    if (!isLeader) return;
    if (!email || !name) {
      Alert.alert('تنبيه', 'الرجاء إدخال الاسم والبريد');
      return;
    }
    try {
      setCreating(true);
      const res = await adminService.createTeacherAccount({ email: email.trim(), name: name.trim(), role: 'member' });
      setLastCred({ email: res.email, password: res.password });
      setCredVisible(true);
      setEmail('');
      setName('');
      await loadMembers();
      await buildOverview();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'فشل إنشاء الحساب');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleRole = useCallback(
    async (memberId: string, currentRole: UserRole) => {
      if (!isLeader || memberId === user?.id) return;
      const nextRole: UserRole = currentRole === 'leader' ? 'member' : 'leader';
      setRoleUpdatingId(memberId);
      try {
        await updateMemberRole(memberId, nextRole);
        setMembers(prev => prev.map(member => (member.id === memberId ? { ...member, role: nextRole } : member)));
        if (memberId === user?.id) {
          Alert.alert('تنبيه', 'لقد غيرت دورك. أعد فتح الصفحة للتأكد من التحديث.');
        }
      } catch (e: any) {
        Alert.alert('خطأ', e?.message || 'تعذر تحديث دور العضو');
      } finally {
        setRoleUpdatingId(null);
      }
    },
    [isLeader, user?.id]
  );

  const handleSeedSchool = async () => {
    if (!isLeader) return;
    if (schoolId) {
      Alert.alert('تنبيه', 'تم ربط حسابك بمدرسة بالفعل');
      return;
    }
    try {
      setSeedLoading(true);
      const res = await communityService.createSchool('مدرسه فلاح وفيصل', user?.id);
      setInvite(res.inviteCode || '');
      Alert.alert('تم', `تم إنشاء المدرسة.\nschoolId: ${res.id}\nرمز الدعوة: ${res.inviteCode}`);
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'فشل إنشاء المدرسة');
    } finally {
      setSeedLoading(false);
    }
  };

  const handleExportSummary = async () => {
    if (!overview) return;
    try {
      setExportingReport(true);
      const lines: string[] = [
        `تقرير المدرسة: ${user?.schoolName || ''}`,
        `المعلمين النشطين: ${overview.teachersCount}`,
        `إجمالي الفصول: ${overview.classesCount}`,
        `إجمالي الطلاب: ${overview.studentsCount}`,
        `جلسات الحضور المجمعة: ${overview.attendance.sessions}`,
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
      setExportingReport(false);
    }
  };

  const scrollToSection = (key: string) => {
    const position = sectionPositions.current[key];
    if (position != null && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(position - spacing.lg, 0), animated: true });
    }
  };

  const quickActions = useMemo(
    () => [
      {
        key: 'members',
        label: 'إدارة المعلمين',
        icon: 'people-outline',
        action: () => scrollToSection('members'),
      },
      {
        key: 'create',
        label: 'إنشاء معلّم',
        icon: 'person-add-outline',
        action: () => scrollToSection('create'),
      },
      {
        key: 'reports',
        label: 'تقارير المدرسة',
        icon: 'bar-chart-outline',
        action: () => scrollToSection('reports'),
      },
      {
        key: 'invite',
        label: inviteLoading ? '...جاري' : 'رمز الانضمام',
        icon: 'key-outline',
        action: handleRefreshInvite,
        disabled: inviteLoading,
      },
    ],
    [handleRefreshInvite, inviteLoading, scrollToSection]
  );

  const handleSectionLayout = useCallback(
    (key: string) => (event: LayoutChangeEvent) => {
      sectionPositions.current[key] = event.nativeEvent.layout.y;
    },
    []
  );

  if (!isLeader) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.note}>هذه الصفحة خاصة بقائد المدرسة</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}
      >
        <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
          <View>
            <Text style={styles.heroLabel}>إدارة المدرسة</Text>
            <Text style={styles.heroTitle}>{user?.schoolName || 'مدرستي'}</Text>
            <Text style={styles.heroSubtitle}>
              راقب فصول جميع المعلمين، انشر الأكواد، وصدّر تقارير الحضور بضغطة زر.
            </Text>
          </View>
          <Ionicons name="school-outline" size={32} color={colors.primary} />
        </View>

        {invite ? (
          <View style={styles.invitePill}>
            <Text style={styles.inviteLabel}>رمز المدرسة الحالي:</Text>
            <Text style={styles.inviteCode}>{invite}</Text>
          </View>
        ) : null}

        <View style={styles.quickGrid}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.key}
              style={styles.quickButton}
              onPress={action.action}
              disabled={action.disabled}
            >
              <Ionicons name={action.icon as any} size={22} color={colors.primary} />
              <Text style={styles.quickText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section} onLayout={handleSectionLayout('reports')}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>لوحة القائد</Text>
            <TouchableOpacity
              style={[styles.outlineBtn, exportingReport && { opacity: 0.6 }]}
              onPress={handleExportSummary}
              disabled={!overview || overviewLoading || exportingReport}
            >
              <Ionicons name="download-outline" size={16} color={colors.primary} />
              <Text style={[styles.outlineBtnText, { color: colors.primary }]}>
                {exportingReport ? '...جارٍ التصدير' : 'تقرير شامل'}
              </Text>
            </TouchableOpacity>
          </View>
          {overviewLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>جارٍ جمع البيانات من الفصول...</Text>
            </View>
          ) : (
            <>
              <View style={styles.metricsRow}>
                {[
                  { label: 'المعلمين', value: overview?.teachersCount ?? members.length },
                  { label: 'الفصول', value: overview?.classesCount ?? 0 },
                  { label: 'الطلاب', value: overview?.studentsCount ?? 0 },
                  { label: 'جلسات الحضور', value: overview?.attendance.sessions ?? 0 },
                ].map(metric => (
                  <View key={metric.label} style={styles.metricCard}>
                    <Text style={styles.metricValue}>{metric.value}</Text>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                  </View>
                ))}
              </View>
              {overview?.teacherBreakdown?.length ? (
                <View style={styles.reportList}>
                  {overview.teacherBreakdown.map(item => (
                    <View key={item.teacherId} style={styles.reportCard}>
                      <View style={styles.reportHeader}>
                        <Text style={styles.reportName}>{item.name}</Text>
                        <View
                          style={[
                            styles.roleBadge,
                            item.role === 'leader' ? styles.leaderBadge : styles.memberBadge,
                          ]}
                        >
                          <Text style={styles.roleBadgeText}>
                            {item.role === 'leader' ? 'قائد' : 'معلم'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.reportLine}>
                        الفصول: {item.classes} • الطلاب: {item.students}
                      </Text>
                      <Text style={styles.reportLine}>
                        حضور: {item.attendance.present} | غياب: {item.attendance.absent}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyHint}>
                  لا توجد بيانات فصول حتى الآن. اطلب من المعلمين إنشاء فصولهم ثم عد مجدداً.
                </Text>
              )}
            </>
          )}
        </View>

        <View style={styles.section} onLayout={handleSectionLayout('members')}>
          <Text style={styles.sectionTitle}>قائمة المعلمين</Text>
          {members.map(item => (
            <View key={item.id} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text style={styles.memberEmail}>{item.email}</Text>
                </View>
                <View
                  style={[
                    styles.roleBadge,
                    item.role === 'leader' ? styles.leaderBadge : styles.memberBadge,
                  ]}
                >
                  <Text style={styles.roleBadgeText}>
                    {item.role === 'leader' ? 'قائد' : 'معلم'}
                  </Text>
                </View>
              </View>
              <Text style={styles.memberCode}>رمز المعلم: {item.userCode || '------'}</Text>
              {isLeader && item.id !== user?.id && (
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    roleUpdatingId === item.id && { opacity: 0.6 },
                  ]}
                  onPress={() => handleToggleRole(item.id, item.role)}
                  disabled={roleUpdatingId === item.id}
                >
                  <Text style={styles.roleButtonText}>
                    {item.role === 'leader' ? 'إرجاع كمعلم' : 'منح صلاحية قائد'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section} onLayout={handleSectionLayout('create')}>
          <Text style={styles.sectionTitle}>إنشاء حساب معلّم</Text>
          <Text style={styles.sectionSubtitle}>
            أنشئ حسابًا لزميلك وأرسل له بيانات الدخول المؤقتة للمرة الأولى.
          </Text>
          <View style={styles.formRow}>
            <TextInput
              style={styles.input}
              placeholder="اسم المعلّم"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#95a5a6"
            />
            <TextInput
              style={styles.input}
              placeholder="البريد الإلكتروني"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#95a5a6"
            />
            <TouchableOpacity
              disabled={creating}
              onPress={handleCreateTeacher}
              style={[styles.createBtn, creating && { opacity: 0.5 }]}
            >
              <Text style={styles.createText}>{creating ? 'جاري الإنشاء...' : 'إنشاء حساب معلّم'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.inviteBtn} onPress={handleRefreshInvite}>
            <Text style={styles.inviteText}>
              {inviteLoading ? 'جاري تحديث الرمز...' : 'تجديد رمز الدعوة للمدرسة'}
            </Text>
          </TouchableOpacity>
          {!schoolId && (
            <TouchableOpacity
              style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
              onPress={handleSeedSchool}
              disabled={seedLoading}
            >
              <Text style={styles.inviteText}>
                {seedLoading ? 'جاري الإنشاء...' : 'إنشاء مدرسة "مدرسه فلاح وفيصل"'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal transparent visible={credVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>تم إنشاء الحساب</Text>
            <Text style={styles.modalLine}>البريد: {lastCred?.email}</Text>
            <Text style={styles.modalLine}>كلمة المرور المؤقتة: {lastCred?.password}</Text>
            <TouchableOpacity onPress={() => setCredVisible(false)} style={styles.modalBtn}>
              <Text style={styles.modalBtnText}>تم</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  note: { fontFamily: fontFamilies.regular, color: '#7f8c8d' },
  hero: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.md,
  },
  heroLabel: {
    fontFamily: fontFamilies.semibold,
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontFamily: fontFamilies.bold,
    color: colors.text.primary,
    fontSize: 24,
  },
  heroSubtitle: {
    fontFamily: fontFamilies.regular,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickButton: {
    flexBasis: '48%',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  quickText: {
    fontFamily: fontFamilies.semibold,
    color: colors.text.primary,
  },
  section: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    color: colors.text.primary,
    fontSize: 18,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontFamily: fontFamilies.regular,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  outlineBtnText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flexBasis: '48%',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  metricValue: {
    fontFamily: fontFamilies.bold,
    color: colors.text.primary,
    fontSize: 22,
  },
  metricLabel: {
    fontFamily: fontFamilies.regular,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: fontFamilies.regular,
    color: colors.text.secondary,
  },
  reportList: {
    gap: spacing.sm,
  },
  reportCard: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  reportName: {
    fontFamily: fontFamilies.semibold,
    color: colors.text.primary,
  },
  reportLine: {
    fontFamily: fontFamilies.regular,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  emptyHint: {
    fontFamily: fontFamilies.regular,
    color: colors.text.secondary,
  },
  memberCard: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  memberName: {
    fontFamily: fontFamilies.semibold,
    color: colors.text.primary,
  },
  memberEmail: {
    fontFamily: fontFamilies.regular,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  memberCode: {
    fontFamily: fontFamilies.semibold,
    color: colors.text.secondary,
  },
  roleBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  leaderBadge: { backgroundColor: '#E6F4EA' },
  memberBadge: { backgroundColor: '#E7E9F5' },
  roleBadgeText: { fontFamily: fontFamilies.semibold, color: '#2c3e50', fontSize: 12 },
  roleButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  roleButtonText: { color: '#fff', fontFamily: fontFamilies.semibold },
  formRow: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: '#f4f6f7',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontFamily: fontFamilies.regular,
    color: '#2c3e50',
    marginBottom: spacing.sm,
  },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  createText: { color: '#fff', fontFamily: fontFamilies.semibold },
  inviteBtn: {
    backgroundColor: '#111827',
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  inviteText: { color: '#fff', fontFamily: fontFamilies.semibold },
  invitePill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  inviteLabel: { fontFamily: fontFamilies.regular, color: colors.text.secondary },
  inviteCode: { fontFamily: fontFamilies.bold, color: colors.text.primary, fontSize: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '80%' },
  modalTitle: { fontFamily: fontFamilies.bold, color: '#2c3e50', fontSize: 18, marginBottom: 8, textAlign: 'center' },
  modalLine: { fontFamily: fontFamilies.regular, color: '#2c3e50', marginVertical: 4, textAlign: 'center' },
  modalBtn: { marginTop: 12, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontFamily: fontFamilies.semibold },
});
