import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { firestore, COLLECTIONS } from '../config/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { fontFamilies, spacing, borderRadius, shadows } from '../utils/theme';
import { mediumHaptic, lightHaptic } from '../utils/haptics';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { leaveSchool } from '../services/schoolService';

interface SettingsScreenProps {
  navigation: any;
}

type SectionKey = 'account' | 'school' | 'teacherCode' | 'appearance' | 'quickTour';

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { state, logout, dispatch } = useApp();
  const { mode, isDark, setMode, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { userProfile, currentTeacher, classes = [] } = state as any;
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(userProfile?.name || currentTeacher?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [teacherCode, setTeacherCode] = useState(userProfile?.userCode || '');
  const [isLeavingSchool, setIsLeavingSchool] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    account: false,
    school: false,
    teacherCode: false,
    appearance: false,
    quickTour: false,
  });
  const hasSchool = Boolean(userProfile?.schoolId);
  const isLeader = userProfile?.role === 'leader';
  const showQuickTour = !Array.isArray(classes) || classes.length === 0;
  const activeThemeMode = mode === 'auto' ? (isDark ? 'dark' : 'light') : mode;
  const toggleSection = useCallback((section: SectionKey) => {
    lightHaptic();
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleCopyCode = useCallback(async () => {
    if (!teacherCode) return;
    await Clipboard.setStringAsync(teacherCode);
    Alert.alert('تم النسخ', 'شارك هذا الرمز مع زملائك لربطهم بمدرستك.');
  }, [teacherCode]);

  const handleLeaveSchool = useCallback(() => {
    if (!currentTeacher?.id || !hasSchool) {
      Alert.alert('تنبيه', 'أنت غير مرتبط بمدرسة حالياً.');
      return;
    }

    mediumHaptic();
    Alert.alert(
      'مغادرة المدرسة',
      'هل أنت متأكد من مغادرة المدرسة الحالية؟ يمكنك الانضمام لاحقاً باستخدام رمز جديد.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مغادرة',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLeavingSchool(true);
              await leaveSchool(currentTeacher.id);
              if (userProfile) {
                dispatch({
                  type: 'SET_USER_PROFILE',
                  payload: {
                    ...userProfile,
                    schoolId: null,
                    schoolName: null,
                    role: 'member',
                  },
                });
              }
              Alert.alert('تم بنجاح', 'تمت مغادرة المدرسة بنجاح.');
            } catch (error: any) {
              console.error('Error leaving school:', error);
              Alert.alert('خطأ', error?.message || 'حدث خطأ أثناء مغادرة المدرسة');
            } finally {
              setIsLeavingSchool(false);
            }
          },
        },
      ]
    );
  }, [currentTeacher?.id, hasSchool, userProfile, dispatch]);

  useEffect(() => {
    setTeacherCode(userProfile?.userCode || '');
  }, [userProfile?.userCode]);

  useEffect(() => {
    if (!currentTeacher?.id) return;
    const codeRef = doc(firestore, COLLECTIONS.TEACHER_CODES, currentTeacher.id);
    const unsubscribe = onSnapshot(codeRef, (snap) => {
      const data: any = snap.data();
      if (data?.code) {
        setTeacherCode(data.code);
      }
    });
    return () => unsubscribe();
  }, [currentTeacher?.id]);

  const handleLogout = () => {
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
            try {
              await logout();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('خطأ', 'حدث خطأ أثناء تسجيل الخروج');
            }
          },
        },
      ]
    );
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم صحيح');
      return;
    }

    setIsUpdating(true);
    lightHaptic();

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('خطأ', 'لم يتم العثور على المستخدم');
        return;
      }

      await updateProfile(user, {
        displayName: newName.trim(),
      });

      const userRef = doc(firestore, COLLECTIONS.USERS, user.uid);
      await updateDoc(userRef, {
        name: newName.trim(),
      });

      setIsEditingName(false);
      Alert.alert('تم بنجاح', 'تم تحديث الاسم بنجاح');
    } catch (error: any) {
      console.error('Error updating name:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحديث الاسم');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleThemeChange = async (newMode: 'light' | 'dark') => {
    lightHaptic();
    await setMode(newMode);
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background.primary }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}
      >
        <View style={[styles.content, { paddingTop: insets.top + spacing.lg }]}>
        <View style={[styles.heroCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
          <View style={styles.heroHeader}>
            <View style={[styles.heroBadge, { backgroundColor: colors.background.tertiary }]}>
              <Text style={[styles.heroBadgeText, { color: colors.primary }]}>ملفك الشخصي</Text>
            </View>
            <Text style={[styles.heroTitle, { color: colors.text.primary }]}>الإعدادات</Text>
          </View>
          <Text style={[styles.heroName, { color: colors.text.primary }]}>
            {userProfile?.name || currentTeacher?.name || 'معلم'}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>
            {userProfile?.email || currentTeacher?.phoneNumber || 'لا يوجد بريد مسجل'}
          </Text>
          <View style={styles.heroPills}>
            <View style={[styles.pill, { backgroundColor: colors.background.tertiary }]}>
              <Text style={[styles.pillText, { color: colors.text.primary }]}>
                {hasSchool ? userProfile?.schoolName || 'مدرستك' : 'بدون مدرسة'}
              </Text>
            </View>
            {isLeader && (
              <View style={[styles.pill, { backgroundColor: colors.background.tertiary }]}>
                <Text style={[styles.pillText, { color: colors.text.primary }]}>قائد المدرسة</Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.sectionHeaderRow}
            onPress={() => toggleSection('account')}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>بيانات الحساب</Text>
            <Ionicons
              name={expandedSections.account ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.text.primary}
            />
          </TouchableOpacity>
          {expandedSections.account && (
            <>
              <View style={[styles.sectionDivider, { backgroundColor: colors.border.light }]} />
              <View style={styles.row}>
                <View style={styles.rowTexts}>
                  <Text style={[styles.rowLabel, { color: colors.text.secondary }]}>البريد الإلكتروني</Text>
                  <Text style={[styles.rowValue, { color: colors.text.primary }]}>
                    {userProfile?.email || currentTeacher?.phoneNumber || 'غير متوفر'}
                  </Text>
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.rowTexts}>
                  <Text style={[styles.rowLabel, { color: colors.text.secondary }]}>الاسم</Text>
                  <Text style={[styles.rowValue, { color: colors.text.primary }]}>
                    {userProfile?.name || currentTeacher?.name || 'غير متوفر'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.chipButton, { backgroundColor: colors.background.tertiary, opacity: isEditingName ? 0.5 : 1 }]}
                  onPress={() => {
                    setIsEditingName(true);
                    lightHaptic();
                  }}
                  disabled={isEditingName}
                >
                  <Text style={[styles.chipButtonText, { color: colors.text.primary }]}>تعديل</Text>
                </TouchableOpacity>
              </View>
              {isEditingName && (
                <View style={[styles.inlineCard, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}>
                  <Text style={[styles.inlineLabel, { color: colors.text.secondary }]}>الاسم الجديد</Text>
                  <TextInput
                    style={[
                      styles.nameInput,
                      {
                        backgroundColor: colors.background.secondary,
                        color: colors.text.primary,
                        borderColor: colors.border.medium,
                      },
                    ]}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="أدخل الاسم"
                    placeholderTextColor={colors.text.tertiary}
                    autoFocus
                  />
                  <View style={styles.editButtons}>
                    <TouchableOpacity
                      style={[styles.cancelButton, { backgroundColor: colors.background.secondary, borderColor: colors.border.medium }]}
                      onPress={() => {
                        setNewName(userProfile?.name || currentTeacher?.name || '');
                        setIsEditingName(false);
                      }}
                    >
                      <Text style={[styles.buttonText, { color: colors.text.primary }]}>إلغاء</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveButton, { backgroundColor: colors.primary }]}
                      onPress={handleUpdateName}
                      disabled={isUpdating}
                    >
                      <Text style={[styles.buttonText, { color: colors.text.light }]}>
                        {isUpdating ? 'جاري الحفظ...' : 'حفظ'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.sectionHeaderRow}
            onPress={() => toggleSection('school')}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>مدرستي</Text>
            <Ionicons
              name={expandedSections.school ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.text.primary}
            />
          </TouchableOpacity>
          {expandedSections.school && (
            <>
              <View style={[styles.sectionDivider, { backgroundColor: colors.border.light }]} />
              <Text style={[styles.sectionHint, { color: colors.text.secondary }]}>
                {hasSchool
                  ? 'أنت مرتبط بالفعل بمدرسة ويمكنك مشاركة الرمز مع فريقك.'
                  : 'اربط حسابك بمدرسة لعرض الفصول المشتركة والحصول على رمز مخصص.'}
              </Text>
              <View style={[styles.inlineCard, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}>
                <Text style={[styles.inlineLabel, { color: colors.text.secondary }]}>اسم المدرسة</Text>
                <Text style={[styles.inlineValue, { color: colors.text.primary }]}>
                  {userProfile?.schoolName || 'لم يتم التعيين بعد'}
                </Text>
              </View>
              {!hasSchool && (
                <TouchableOpacity
                  style={[styles.primaryOutlineButton, { borderColor: colors.primary }]}
                  onPress={() => navigation.navigate('JoinSchool')}
                >
                  <Text style={[styles.primaryOutlineText, { color: colors.primary }]}>
                    انضم إلى مدرسة باستخدام رمز زميلك
                  </Text>
                </TouchableOpacity>
              )}
              {hasSchool && (
                <TouchableOpacity
                  style={[
                    styles.dangerOutlineButton,
                    {
                      borderColor: colors.danger,
                      opacity: isLeavingSchool ? 0.6 : 1,
                      backgroundColor: colors.background.primary,
                    },
                  ]}
                  onPress={handleLeaveSchool}
                  disabled={isLeavingSchool}
                >
                  <Text style={[styles.primaryOutlineText, { color: colors.danger }]}>
                    {isLeavingSchool ? 'جاري المغادرة...' : 'مغادرة المدرسة'}
                  </Text>
                </TouchableOpacity>
              )}
              <View style={[styles.infoCard, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}>
                <Text style={[styles.infoTitle, { color: colors.text.primary }]}>المشاركة مع الفريق</Text>
                <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                  شارك رمز المعلم مع زملائك للانضمام إلى نفس المدرسة. بعد الربط، ستظهر لهم الفصول المتاحة ويمكنهم تسجيل الحضور.
                </Text>
                {!teacherCode && (
                  <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                    يتم إنشاء الرمز تلقائياً بعد إنشاء المدرسة بدقائق قليلة.
                  </Text>
                )}
                {isLeader && (
                  <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                    أداة "إدارة المدرسة" ستظهر في الشريط السفلي لمراجعة الفصول وتعيين الصلاحيات.
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.sectionHeaderRow}
            onPress={() => toggleSection('teacherCode')}
          >
            <View style={styles.sectionHeaderContent}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>رمز المعلم</Text>
              {hasSchool && !!teacherCode && (
                <Text style={[styles.badge, { color: colors.primary, borderColor: colors.primary }]}>جاهز للمشاركة</Text>
              )}
            </View>
            <Ionicons
              name={expandedSections.teacherCode ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.text.primary}
            />
          </TouchableOpacity>
          {expandedSections.teacherCode && (
            <>
              <View style={[styles.sectionDivider, { backgroundColor: colors.border.light }]} />
              <View style={[styles.codeContainer, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}>
                <Text style={[styles.codeValue, { color: colors.text.primary }]}>
                  {hasSchool && teacherCode ? teacherCode : '------'}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.copyButton,
                    { backgroundColor: hasSchool && teacherCode ? colors.primary : colors.border.medium },
                  ]}
                  onPress={handleCopyCode}
                  disabled={!hasSchool || !teacherCode}
                >
                  <Text
                    style={[
                      styles.copyButtonText,
                      { color: hasSchool && teacherCode ? colors.text.light : colors.text.primary },
                    ]}
                  >
                    نسخ الرمز
                  </Text>
                </TouchableOpacity>
                {hasSchool && teacherCode ? (
                  <Text style={[styles.sectionHint, { color: colors.text.secondary, marginTop: spacing.md }]}>
                    شارك هذا الرمز مع زملائك ليربطوا حساباتهم بمدرستك.
                  </Text>
                ) : null}
              </View>
            </>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.sectionHeaderRow}
            onPress={() => toggleSection('appearance')}
          >
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>المظهر</Text>
            <Ionicons
              name={expandedSections.appearance ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.text.primary}
            />
          </TouchableOpacity>
          {expandedSections.appearance && (
            <>
              <View style={[styles.sectionDivider, { backgroundColor: colors.border.light }]} />
              <Text style={[styles.sectionHint, { color: colors.text.secondary }]}>
                اختر النمط الذي يناسبك. يمكن تغيير الوضع في أي وقت.
              </Text>
              <View style={styles.themeRow}>
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    {
                      borderColor: activeThemeMode === 'light' ? colors.primary : colors.border.medium,
                      backgroundColor: activeThemeMode === 'light' ? colors.background.primary : colors.background.tertiary,
                    },
                  ]}
                  onPress={() => handleThemeChange('light')}
                >
                  <Text style={[styles.themeLabel, { color: colors.text.primary }]}>نهاري</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.themeOption,
                    {
                      borderColor: activeThemeMode === 'dark' ? colors.primary : colors.border.medium,
                      backgroundColor: activeThemeMode === 'dark' ? colors.background.primary : colors.background.tertiary,
                    },
                  ]}
                  onPress={() => handleThemeChange('dark')}
                >
                  <Text style={[styles.themeLabel, { color: colors.text.primary }]}>ليلي</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {showQuickTour && (
          <View style={[styles.sectionCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sectionHeaderRow}
              onPress={() => toggleSection('quickTour')}
            >
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>جولة سريعة</Text>
              <Ionicons
                name={expandedSections.quickTour ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.text.primary}
              />
            </TouchableOpacity>
            {expandedSections.quickTour && (
              <>
                <View style={[styles.sectionDivider, { backgroundColor: colors.border.light }]} />
                <View style={styles.bulletRow}>
                  <Text style={[styles.bulletNumber, { color: colors.primary }]}>١</Text>
                  <Text style={[styles.bulletText, { color: colors.text.primary }]}>
                    من تبويب الحضور أنشئ أول فصل واضغط عليه لبدء تسجيل الحضور.
                  </Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={[styles.bulletNumber, { color: colors.primary }]}>٢</Text>
                  <Text style={[styles.bulletText, { color: colors.text.primary }]}>
                    زر الطلاب يسمح لك بضبط بيانات الطلبة ومتابعة التقدم الأكاديمي.
                  </Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={[styles.bulletNumber, { color: colors.primary }]}>٣</Text>
                  <Text style={[styles.bulletText, { color: colors.text.primary }]}>
                    شارك الرمز مع زملائك ثم استخدم إدارة المدرسة لمراقبة الحضور الكامل.
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.danger }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutButtonText, { color: colors.text.light }]}>
            تسجيل الخروج
          </Text>
        </TouchableOpacity>

        <View style={styles.sloganContainer}>
          <Text style={[styles.sloganText, { color: colors.text.secondary }]}>
            تعليم أفضل، حضور أذكى
          </Text>
          <Text style={[styles.sloganSubtext, { color: colors.text.tertiary }]}>
            Learnz Plus
          </Text>
        </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  heroCard: {
    borderRadius: 28,
    padding: spacing['2xl'],
    marginBottom: spacing['2xl'],
    borderWidth: 1,
    ...shadows.md,
  },
  heroHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  heroBadgeText: {
    fontSize: 12,
    fontFamily: fontFamilies.semibold,
  },
  heroTitle: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
  },
  heroName: {
    fontSize: 28,
    fontFamily: fontFamilies.bold,
    textAlign: 'right',
    marginTop: spacing.md,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    textAlign: 'right',
    opacity: 0.9,
  },
  heroPills: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  pillText: {
    fontSize: 14,
    fontFamily: fontFamilies.semibold,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: spacing['2xl'],
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    textAlign: 'right',
  },
  sectionDivider: {
    height: 1,
    width: '100%',
    marginVertical: spacing.lg,
    opacity: 0.1,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionHeaderContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionHint: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    textAlign: 'right',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  rowTexts: {
    flex: 1,
    marginLeft: spacing.md,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    textAlign: 'right',
  },
  rowValue: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    textAlign: 'right',
  },
  chipButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  chipButtonText: {
    fontSize: 14,
    fontFamily: fontFamilies.semibold,
  },
  inlineCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  inlineLabel: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  inlineValue: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    textAlign: 'right',
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    marginBottom: spacing.md,
    textAlign: 'right',
  },
  editButtons: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontFamily: fontFamilies.semibold,
  },
  primaryOutlineButton: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  primaryOutlineText: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  dangerOutlineButton: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  infoText: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    lineHeight: 22,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  rowBetween: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    fontSize: 12,
    fontFamily: fontFamilies.semibold,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  codeContainer: {
    borderWidth: 1,
    borderRadius: borderRadius['2xl'],
    padding: spacing['2xl'],
    alignItems: 'center',
    marginTop: spacing.md,
  },
  codeValue: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    letterSpacing: 4,
    marginBottom: spacing.lg,
  },
  copyButton: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  copyButtonText: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
  },
  qrLink: {
    marginTop: spacing.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  qrLinkText: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
    textAlign: 'center',
  },
  themeRow: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
  },
  themeOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius['2xl'],
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
  },
  bulletRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bulletNumber: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: fontFamilies.bold,
    marginLeft: spacing.sm,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    textAlign: 'right',
    lineHeight: 22,
  },
  qrModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  qrModalCard: {
    width: '90%',
    borderRadius: borderRadius['2xl'],
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  qrModalTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    marginBottom: spacing.xs,
  },
  qrModalSubtitle: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  qrCodeWrapper: {
    borderWidth: 1,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  qrCloseButton: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.sm,
  },
  qrCloseText: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
    color: '#fff',
  },
  logoutButton: {
    marginTop: spacing['2xl'],
    padding: spacing.lg,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    ...shadows.sm,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
  },
  sloganContainer: {
    marginTop: spacing['3xl'],
    marginBottom: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  sloganText: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  sloganSubtext: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    textAlign: 'center',
    opacity: 0.7,
  },
});
