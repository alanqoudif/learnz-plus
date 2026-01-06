import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Class } from '../types';
import { fontFamilies, spacing, borderRadius } from '../utils/theme';
import ClassCard from '../components/ClassCard';
import { ClassListSkeleton } from '../components/SkeletonLoader';
import { lightHaptic, mediumHaptic } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createSchoolForUser, joinSchoolByTeacherCode } from '../services/schoolService';

interface DashboardScreenProps {
  navigation: any;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { state, deleteClass, refreshData, dispatch } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { currentTeacher, classes, attendanceSessions, isLoading, userProfile, isOffline, pendingActions } = state as any;
  const userSchoolId = userProfile?.schoolId || currentTeacher?.schoolId;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [schoolMode, setSchoolMode] = useState<'create' | 'join'>('create');
  const [schoolNameInput, setSchoolNameInput] = useState('');
  const [teacherCodeInput, setTeacherCodeInput] = useState('');
  const [isSchoolSubmitting, setIsSchoolSubmitting] = useState(false);
  const pendingCount = Array.isArray(pendingActions) ? pendingActions.length : 0;
  const canAccessCommunity = userProfile?.tier === 'plus' || userProfile?.isAppAdmin;
  const showSchoolManagementTab = Boolean(userProfile?.schoolId) && userProfile?.role === 'leader';
  const totalStudents = useMemo(
    () => classes.reduce((count: number, cls: Class) => count + cls.students.length, 0),
    [classes]
  );
  const today = useMemo(() => new Date(), []);
  const todaysAttendance = useMemo(() => {
    if (!attendanceSessions?.length) return 0;
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return attendanceSessions.reduce((sum: number, session: any) => {
      const sessionDate = new Date(session.date);
      if (sessionDate >= start && sessionDate <= end) {
        return sum + (session.records?.filter((record: any) => record.status === 'present').length || 0);
      }
      return sum;
    }, 0);
  }, [attendanceSessions, today]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    lightHaptic();
    await refreshData();
    setIsRefreshing(false);
  }, [refreshData]);

  const handleAddClass = useCallback(() => {
    lightHaptic();
    navigation.navigate('AddClass');
  }, [navigation]);

  const handleClassPress = useCallback((classItem: Class) => {
    lightHaptic();
    // يمكن إضافة شاشة تفاصيل الفصل لاحقاً
    console.log('Class pressed:', classItem.id);
  }, []);

  const handleDeleteClass = useCallback((classId: string, className: string) => {
    mediumHaptic();
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف الشعبة "${className}"؟\n\nتحذير: سيتم حذف:\n• جميع الطلاب في هذه الشعبة\n• جميع سجلات الحضور\n• تاريخ الحضور الكامل\n\nهذا الإجراء لا يمكن التراجع عنه!`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف نهائياً',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClass(classId);
              mediumHaptic();
              Alert.alert(
                'تم الحذف بنجاح',
                `تم حذف الشعبة "${className}" وجميع البيانات المرتبطة بها من قاعدة البيانات.`,
                [{ text: 'موافق' }]
              );
            } catch (error) {
              console.error('Error deleting class:', error);
              Alert.alert('خطأ', 'حدث خطأ أثناء حذف الشعبة من قاعدة البيانات');
            }
          },
        },
      ]
    );
  }, [deleteClass]);

  const handleManageStudents = useCallback((classId: string) => {
    navigation.navigate('StudentManagement', { classId });
  }, [navigation]);

  const handleAttendance = useCallback((classId: string) => {
    navigation.navigate('Attendance', { classId });
  }, [navigation]);

  const handleViewHistory = useCallback((classId: string) => {
    navigation.navigate('AttendanceHistory', { classId });
  }, [navigation]);

  const handleQuickReport = useCallback(() => {
    if (!classes.length) {
      Alert.alert('لا يوجد فصول', 'أضف فصلاً أولاً لعرض تقارير الحضور.');
      return;
    }
    navigation.navigate('AttendanceHistory', { classId: classes[0].id });
  }, [classes, navigation]);

  const quickActions = useMemo(() => {
    const actions = [
      {
        key: 'addClass',
        label: 'فصل جديد',
        icon: 'add-circle-outline',
        onPress: handleAddClass,
      },
      {
        key: 'students',
        label: 'لوحة الطلاب',
        icon: 'people-outline',
        onPress: () => navigation.navigate('Students'),
      },
    ];

    if (!userProfile?.schoolId) {
      actions.push({
        key: 'join-school',
        label: 'انضم لمدرسة',
        icon: 'school-outline',
        onPress: () => navigation.navigate('JoinSchool'),
      });
    } else if (classes.length) {
      actions.push({
        key: 'reports',
        label: 'تقارير الحضور',
        icon: 'stats-chart-outline',
        onPress: handleQuickReport,
      });
    } else if (canAccessCommunity) {
      actions.push({
        key: 'community',
        label: 'المجتمع',
        icon: 'chatbubbles-outline',
        onPress: () => navigation.navigate('Community'),
      });
    }

    return actions.slice(0, 3);
  }, [handleAddClass, handleQuickReport, classes, navigation, userProfile?.schoolId, canAccessCommunity]);

  useEffect(() => {
    // Only prompt to link a school when the user truly has no school assigned
    if (userProfile && !userSchoolId) {
      setShowSchoolModal(true);
    } else {
      setShowSchoolModal(false);
    }
  }, [userProfile, userSchoolId]);

  const handleCreateSchool = useCallback(async () => {
    if (!userProfile?.id) return;
    if (!schoolNameInput.trim()) {
      Alert.alert('أدخل اسم المدرسة', 'يرجى كتابة اسم واضح للمدرسة.');
      return;
    }
    setIsSchoolSubmitting(true);
    try {
      const school = await createSchoolForUser(schoolNameInput.trim(), userProfile.id);
      if (userProfile) {
        dispatch({
          type: 'SET_USER_PROFILE',
          payload: {
            ...userProfile,
            schoolId: school.id,
            schoolName: school.name,
            role: 'leader',
          },
        });
      }
      setShowSchoolModal(false);
      setSchoolNameInput('');
      Alert.alert('تم الربط', 'تم إنشاء المدرسة وربط حسابك بها.');
    } catch (error: any) {
      console.error('Error creating school', error);
      Alert.alert('خطأ', error?.message || 'تعذر إنشاء المدرسة. حاول مرة أخرى.');
    } finally {
      setIsSchoolSubmitting(false);
    }
  }, [userProfile, schoolNameInput, dispatch]);

  const handleJoinSchool = useCallback(async () => {
    if (!userProfile?.id) return;
    if (!teacherCodeInput.trim()) {
      Alert.alert('أدخل رمز المعلم', 'اطلب الرمز من زميلك ثم حاول مرة أخرى.');
      return;
    }
    setIsSchoolSubmitting(true);
    try {
      const school = await joinSchoolByTeacherCode(userProfile.id, teacherCodeInput.trim());
      if (userProfile) {
        dispatch({
          type: 'SET_USER_PROFILE',
          payload: {
            ...userProfile,
            schoolId: school.id,
            schoolName: school.name,
            role: 'member',
          },
        });
      }
      setShowSchoolModal(false);
      setTeacherCodeInput('');
      Alert.alert('تم الانضمام', 'تمت إضافة حسابك إلى المدرسة بنجاح.');
    } catch (error: any) {
      console.error('Error joining school', error);
      Alert.alert('خطأ', error?.message || 'تعذر الانضمام. تحقق من الرمز ثم حاول مجدداً.');
    } finally {
      setIsSchoolSubmitting(false);
    }
  }, [userProfile, teacherCodeInput, dispatch]);

  const renderClassItem = useCallback(({ item }: { item: Class }) => (
    <ClassCard
      item={item}
      onPress={handleClassPress}
      onDelete={handleDeleteClass}
      onManageStudents={handleManageStudents}
      onAttendance={handleAttendance}
      onViewHistory={handleViewHistory}
    />
  ), [handleClassPress, handleDeleteClass, handleManageStudents, handleAttendance, handleViewHistory]);

  const keyExtractor = useCallback((item: Class, index: number) => `class-${item.id}-${index}`, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 240,
    offset: 240 * index,
    index,
  }), []);

  const dynamicStyles = useMemo(() => ({
    container: { backgroundColor: colors.background.primary },
    headerCard: { backgroundColor: colors.background.card },
    welcomeText: { color: colors.text.secondary },
    teacherName: { color: colors.text.primary },
    sectionTitle: { color: colors.text.primary },
    emptyStateTitle: { color: colors.text.secondary },
    emptyStateSubtitle: { color: colors.text.tertiary },
  }), [colors]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons name="layers-outline" size={32} color={colors.primary} />
      <Text style={[styles.emptyStateTitle, dynamicStyles.emptyStateTitle]}>
        لا توجد فصول حتى الآن
      </Text>
      <Text style={[styles.emptyStateSubtitle, dynamicStyles.emptyStateSubtitle]}>
        أضف أول فصل دراسي لبدء تتبع حضور طلابك بتجربة آبل السلسة
      </Text>
      <TouchableOpacity
        style={[styles.addFirstClassButton, { backgroundColor: colors.primary }]}
        onPress={handleAddClass}
      >
        <Text style={styles.addFirstClassButtonText}>إنشاء فصل جديد</Text>
      </TouchableOpacity>
    </View>
  ), [handleAddClass, dynamicStyles, colors.primary]);



  const renderHeader = () => (
    <>
      <View style={[styles.heroCard, dynamicStyles.headerCard]}>
        <View style={styles.heroTextWrapper}>
          <Text style={[styles.welcomeText, dynamicStyles.welcomeText]}>صباح الخير</Text>
          <Text style={[styles.teacherName, dynamicStyles.teacherName]}>
            {userProfile?.name || currentTeacher?.name}
          </Text>
          <Text style={styles.roleText}>
            {userProfile?.role === 'leader' ? 'قائد المدرسة' : 'معلم معتمد'}
          </Text>
        </View>
        <TouchableOpacity style={styles.roundIcon} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="notifications-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'الفصول', value: classes.length, icon: 'layers-outline' },
          { label: 'الطلاب', value: totalStudents, icon: 'people-outline' },
          { label: 'حضور اليوم', value: todaysAttendance, icon: 'checkmark-circle-outline' },
        ].map(({ label, value, icon }) => (
          <View key={label} style={[styles.statCard, { backgroundColor: colors.background.card }]}>
            <View style={styles.statIcon}>
              <Ionicons name={icon as any} size={18} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {(isOffline || pendingCount > 0) && (
        <View style={[styles.syncPill, { backgroundColor: colors.background.secondary }]}>
          <Ionicons
            name={isOffline ? 'cloud-offline-outline' : 'cloud-upload-outline'}
            size={14}
            color={colors.primary}
          />
          <Text style={styles.syncText}>
            {isOffline
              ? 'وضع دون اتصال — سنزامن تلقائياً عند عودة الشبكة'
              : `جاري رفع ${pendingCount} عملية إلى السحابة`}
          </Text>
        </View>
      )}

      {userProfile?.role === 'leader' && !showSchoolManagementTab && (
        <TouchableOpacity
          style={[styles.bannerCard, { backgroundColor: colors.background.secondary }]}
          onPress={() => navigation.navigate('LeaderAdmin')}
        >
          <View>
            <Text style={styles.bannerTitle}>إعدادات المدرسة</Text>
            <Text style={styles.bannerSubtitle}>تحكم بالأدوار ورمز الانضمام للمعلمين</Text>
          </View>
          <Ionicons name="chevron-back" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      )}
      {userProfile?.role !== 'leader' && !userProfile?.schoolId && (
        <TouchableOpacity
          style={[styles.bannerCard, { backgroundColor: '#E7F1FF', borderColor: '#BFD8FF', borderWidth: 1 }]}
          onPress={() => navigation.navigate('JoinSchool')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
            <Text style={styles.bannerTitle}>انضم لمدرستك برمز القائد</Text>
          </View>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}

      <View style={styles.quickActions}>
        {quickActions.map(action => (
          <TouchableOpacity
            key={action.key}
            style={[styles.quickButton, { backgroundColor: colors.background.card }]}
            onPress={action.onPress}
          >
            <Ionicons name={action.icon as any} size={20} color={colors.primary} />
            <Text style={styles.quickButtonText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>الفصول النشطة</Text>
        <TouchableOpacity onPress={handleAddClass}>
          <Text style={[styles.linkText, { color: colors.primary }]}>إضافة فصل</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <ClassListSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container, { paddingTop: insets.top + spacing.lg }]}>
      <FlatList
        data={classes}
        renderItem={renderClassItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            tintColor={colors.primary}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: spacing['4xl'] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
      />

      <Modal visible={showSchoolModal} transparent animationType="slide">
        <View style={styles.schoolModalOverlay}>
          <View style={[styles.schoolModalCard, { backgroundColor: colors.background.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>اربط حسابك بمدرستك</Text>
            <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>
              اختر ما إذا كنت ستنشئ مدرسة جديدة أو تستخدم رمز أحد المعلمين للانضمام.
            </Text>
            <View style={styles.schoolToggle}>
              <TouchableOpacity
                style={[styles.modeButton, schoolMode === 'create' && styles.modeButtonActive]}
                onPress={() => setSchoolMode('create')}
                disabled={isSchoolSubmitting}
              >
                <Text style={[styles.modeButtonText, schoolMode === 'create' && styles.modeButtonTextActive]}>
                  إنشاء مدرسة
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, schoolMode === 'join' && styles.modeButtonActive]}
                onPress={() => setSchoolMode('join')}
                disabled={isSchoolSubmitting}
              >
                <Text style={[styles.modeButtonText, schoolMode === 'join' && styles.modeButtonTextActive]}>
                  الانضمام برمز
                </Text>
              </TouchableOpacity>
            </View>

            {schoolMode === 'create' ? (
              <>
                <TextInput
                  style={[styles.modalInput, { borderColor: colors.border.light, color: colors.text.primary }]}
                  placeholder="اسم مدرستك"
                  placeholderTextColor={colors.text.tertiary}
                  value={schoolNameInput}
                  onChangeText={setSchoolNameInput}
                />
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: colors.primary }]}
                  onPress={handleCreateSchool}
                  disabled={isSchoolSubmitting}
                >
                  <Text style={styles.modalActionText}>
                    {isSchoolSubmitting ? 'جاري الإنشاء...' : 'إنشاء المدرسة الآن'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={[styles.modalInput, { borderColor: colors.border.light, color: colors.text.primary }]}
                  placeholder="رمز أحد المعلمين"
                  placeholderTextColor={colors.text.tertiary}
                  value={teacherCodeInput}
                  autoCapitalize="characters"
                  onChangeText={value => setTeacherCodeInput(value.toUpperCase())}
                />
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: colors.primary }]}
                  onPress={handleJoinSchool}
                  disabled={isSchoolSubmitting}
                >
                  <Text style={styles.modalActionText}>
                    {isSchoolSubmitting ? 'جاري الانضمام...' : 'انضمام الآن'}
                  </Text>
                </TouchableOpacity>
                {userProfile?.userCode && (
                  <View style={styles.userCodeHint}>
                    <Text style={[styles.userCodeHintText, { color: colors.text.secondary }]}>
                      رمزك الحالي لمشاركته مع زملائك:
                    </Text>
                    <Text style={[styles.userCodeValue, { color: colors.text.primary }]}>{userProfile.userCode}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    direction: 'rtl',
    paddingHorizontal: spacing.xl,
  },
  listContent: {
    paddingBottom: spacing['4xl'],
  },
  schoolModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  schoolModalCard: {
    width: '100%',
    borderRadius: 28,
    padding: spacing.xl,
    direction: 'rtl',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: fontFamilies.bold,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: 15,
    fontFamily: fontFamilies.regular,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  schoolToggle: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modeButton: {
    flex: 1,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#E7F1FF',
    borderColor: '#BFD8FF',
  },
  modeButtonText: {
    fontSize: 14,
    fontFamily: fontFamilies.semibold,
    color: '#6E6E73',
  },
  modeButtonTextActive: {
    color: '#0A84FF',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    fontFamily: fontFamilies.regular,
    textAlign: 'right',
  },
  modalActionButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalActionText: {
    color: '#fff',
    fontFamily: fontFamilies.bold,
    fontSize: 16,
  },
  userCodeHint: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  userCodeHintText: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
  },
  userCodeValue: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    letterSpacing: 2,
  },
  heroCard: {
    borderRadius: 28,
    padding: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  heroTextWrapper: {
    gap: 6,
  },
  welcomeText: {
    fontSize: 16,
    fontFamily: fontFamilies.medium,
  },
  teacherName: {
    fontSize: 28,
    fontFamily: fontFamilies.bold,
  },
  roleText: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: fontFamilies.medium,
  },
  roundIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: spacing.md,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 22,
    fontFamily: fontFamilies.bold,
  },
  statLabel: {
    fontSize: 13,
    color: '#6E6E73',
    fontFamily: fontFamilies.medium,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 18,
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  syncText: {
    fontSize: 13,
    fontFamily: fontFamilies.medium,
    color: '#3A3A3C',
  },
  bannerCard: {
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
    color: '#1C1C1E',
  },
  bannerSubtitle: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: '#6E6E73',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickButtonText: {
    fontSize: 13,
    fontFamily: fontFamilies.medium,
    color: '#1C1C1E',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.semibold,
  },
  linkText: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
    gap: spacing.md,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontFamily: fontFamilies.bold,
  },
  emptyStateSubtitle: {
    fontSize: 15,
    fontFamily: fontFamilies.regular,
    textAlign: 'center',
    color: '#6E6E73',
    lineHeight: 22,
  },
  addFirstClassButton: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: 20,
  },
  addFirstClassButtonText: {
    color: '#fff',
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
  },
});
