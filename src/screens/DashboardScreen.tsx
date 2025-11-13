import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Class } from '../types';
import { colors, fontFamilies, shadows, borderRadius, spacing } from '../utils/theme';
import { smartAuthService as authService } from '../services/smartService';
import ClassCard from '../components/ClassCard';
import { ClassListSkeleton } from '../components/SkeletonLoader';
import { lightHaptic, mediumHaptic } from '../utils/haptics';

interface DashboardScreenProps {
  navigation: any;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { state, deleteClass, refreshData } = useApp();
  const { currentTeacher, classes, isLoading, userProfile, isOffline, pendingActions } = state as any;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pendingCount = Array.isArray(pendingActions) ? pendingActions.length : 0;

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
      `هل أنت متأكد من حذف الشعبة "${className}"؟\n\nتنبيه: سيتم حذف:\n• جميع الطلاب في هذه الشعبة\n• جميع سجلات الحضور\n• تاريخ الحضور الكامل\n\nهذا الإجراء لا يمكن التراجع عنه!`,
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
    length: 240, // تقريباً ارتفاع ClassCard
    offset: 240 * index,
    index,
  }), []);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrapper}>
        <Ionicons name="library-outline" size={48} color={colors.primary} />
      </View>
      <Text style={styles.emptyStateTitle}>لا توجد فصول دراسية</Text>
      <Text style={styles.emptyStateSubtitle}>
        ابدأ بإضافة فصل دراسي جديد لإدارة حضور وغياب الطلاب
      </Text>
      <TouchableOpacity style={styles.addFirstClassButton} onPress={handleAddClass}>
        <Text style={styles.addFirstClassButtonText}>+ إضافة فصل دراسي</Text>
      </TouchableOpacity>
    </View>
  ), [handleAddClass]);

  const handleLogout = useCallback(() => {
    mediumHaptic();
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تسجيل الخروج',
          style: 'destructive',
          onPress: async () => {
            await authService.signOut();
            // سيتم الانتقال تلقائياً عند تحديث state.currentTeacher
          },
        },
      ]
    );
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>مرحباً</Text>
            <Text style={styles.teacherName}>{currentTeacher?.name || 'معلم'}</Text>
          </View>
        </View>
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>الفصول الدراسية</Text>
          </View>
          <ClassListSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>مرحباً بك</Text>
          <Text style={styles.teacherName}>{userProfile?.name || currentTeacher?.name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>خروج</Text>
        </TouchableOpacity>
      </View>

      {isOffline && (
        <View style={[styles.syncNotice, styles.offlineNotice]}>
          <View style={styles.noticeRow}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.warningDark} style={styles.noticeIcon} />
            <Text style={styles.syncNoticeText}>
              التطبيق يعمل حالياً دون اتصال. سيتم حفظ كل شيء ومزامنته تلقائياً عند توفر الإنترنت.
            </Text>
          </View>
        </View>
      )}
      {!isOffline && pendingCount > 0 && (
        <View style={[styles.syncNotice, styles.pendingNotice]}>
          <View style={styles.noticeRow}>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.infoDark} style={styles.noticeIcon} />
            <Text style={styles.syncNoticeText}>
              يتم إرسال {pendingCount} عملية معلّقة إلى السحابة...
            </Text>
          </View>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>الفصول الدراسية</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddClass}>
            <Text style={styles.addButtonText}>+ إضافة فصل</Text>
          </TouchableOpacity>
        </View>

        {classes.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={classes}
            renderItem={renderClassItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.classesList}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            // Performance optimizations
            windowSize={5}
            maxToRenderPerBatch={5}
            removeClippedSubviews={true}
            initialNumToRender={5}
            updateCellsBatchingPeriod={50}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    direction: 'rtl',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.xl,
    backgroundColor: colors.background.primary,
    ...shadows.sm,
  },
  welcomeText: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: colors.text.secondary,
  },
  teacherName: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    color: colors.text.primary,
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  logoutButtonText: {
    color: colors.text.light,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  syncNotice: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeIcon: {
    marginLeft: spacing.sm,
  },
  syncNoticeText: {
    fontFamily: fontFamilies.medium,
    color: colors.text.primary,
    textAlign: 'right',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  offlineNotice: {
    backgroundColor: '#fff6e5',
    borderWidth: 1,
    borderColor: colors.warningLight,
  },
  pendingNotice: {
    backgroundColor: '#e8f1ff',
    borderWidth: 1,
    borderColor: colors.infoLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    direction: 'rtl',
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: fontFamilies.bold,
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  addButtonText: {
    color: colors.text.light,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  classesList: {
    paddingBottom: spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['4xl'],
  },
  emptyIconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing['3xl'],
  },
  addFirstClassButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  addFirstClassButtonText: {
    color: colors.text.light,
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
  },
});
