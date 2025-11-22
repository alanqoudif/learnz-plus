import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Class } from '../types';
import { fontFamilies, shadows, borderRadius, spacing } from '../utils/theme';
import ClassCard from '../components/ClassCard';
import { ClassListSkeleton } from '../components/SkeletonLoader';
import { lightHaptic, mediumHaptic } from '../utils/haptics';

interface DashboardScreenProps {
  navigation: any;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { state, deleteClass, refreshData } = useApp();
  const { colors } = useTheme();
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
      `هل أنت متأكد من حذف الشعبة "${className}"؟\n\n⚠️ تحذير: سيتم حذف:\n• جميع الطلاب في هذه الشعبة\n• جميع سجلات الحضور\n• تاريخ الحضور الكامل\n\nهذا الإجراء لا يمكن التراجع عنه!`,
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
    length: 240,
    offset: 240 * index,
    index,
  }), []);

  const dynamicStyles = useMemo(() => ({
    container: { backgroundColor: colors.background.secondary },
    header: { backgroundColor: colors.background.primary },
    welcomeText: { color: colors.text.secondary },
    teacherName: { color: colors.text.primary },
    offlineNotice: { backgroundColor: colors.warning + '20' },
    pendingNotice: { backgroundColor: colors.info + '20' },
    syncNoticeText: { color: colors.text.primary },
    sectionTitle: { color: colors.text.primary },
    addButton: { backgroundColor: colors.success },
    emptyStateTitle: { color: colors.text.secondary },
    emptyStateSubtitle: { color: colors.text.tertiary },
    addFirstClassButton: { backgroundColor: colors.primary },
  }), [colors]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📚</Text>
      <Text style={[styles.emptyStateTitle, dynamicStyles.emptyStateTitle]}>
        لا توجد فصول دراسية
      </Text>
      <Text style={[styles.emptyStateSubtitle, dynamicStyles.emptyStateSubtitle]}>
        ابدأ بإضافة فصل دراسي جديد لإدارة حضور وغياب الطلاب
      </Text>
      <TouchableOpacity
        style={[styles.addFirstClassButton, dynamicStyles.addFirstClassButton]}
        onPress={handleAddClass}
      >
        <Text style={styles.addFirstClassButtonText}>+ إضافة فصل دراسي</Text>
      </TouchableOpacity>
    </View>
  ), [handleAddClass, dynamicStyles]);



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
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header]}>
        <View>
          <Text style={[styles.welcomeText, dynamicStyles.welcomeText]}>مرحباً 👋</Text>
          <Text style={[styles.teacherName, dynamicStyles.teacherName]}>
            {userProfile?.name || currentTeacher?.name}
          </Text>
        </View>
      </View>

      {isOffline && (
        <View style={[styles.syncNotice, dynamicStyles.offlineNotice]}>
          <Text style={[styles.syncNoticeText, dynamicStyles.syncNoticeText]}>
            🛜 التطبيق يعمل حالياً دون اتصال. سيتم حفظ كل شيء ومزامنته تلقائياً عند توفر الإنترنت.
          </Text>
        </View>
      )}
      {!isOffline && pendingCount > 0 && (
        <View style={[styles.syncNotice, dynamicStyles.pendingNotice]}>
          <Text style={[styles.syncNoticeText, dynamicStyles.syncNoticeText]}>
            ⏳ يتم إرسال {pendingCount} عملية معلّقة إلى السحابة...
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>الفصول الدراسية</Text>
          <TouchableOpacity
            style={[styles.addButton, dynamicStyles.addButton]}
            onPress={handleAddClass}
          >
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
    direction: 'rtl',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.xl,
    ...shadows.sm,
  },
  welcomeText: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
  },
  teacherName: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    marginTop: 4,
  },
  syncNotice: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  syncNoticeText: {
    textAlign: 'center',
    fontFamily: fontFamilies.semibold,
  },
  offlineNotice: {
    backgroundColor: '#fdebd0',
  },
  pendingNotice: {
    backgroundColor: '#d6eaf8',
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
  },
  addButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  addButtonText: {
    color: '#ffffff',
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
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing['3xl'],
  },
  addFirstClassButton: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  addFirstClassButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
  },
});
