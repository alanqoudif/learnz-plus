import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { fontFamilies, spacing, borderRadius, shadows } from '../utils/theme';
import { communityService } from '../services/communityService';
import { adminService } from '../services/adminService';
import { getSchoolMembers, getSchoolById } from '../services/schoolService';
import type { UserProfile } from '../types';

interface LeaderAdminScreenProps {
  navigation: any;
}

export default function LeaderAdminScreen({ navigation }: LeaderAdminScreenProps) {
  const { state } = useApp();
  const { colors: themeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = (state as any).userProfile as UserProfile | undefined;
  const classes = (state as any).classes || [];
  const totalStudents = classes.reduce((count: number, cls: any) => count + (cls.students?.length || 0), 0);
  const schoolId = user?.schoolId;
  const isLeader = user?.role === 'leader';
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [invite, setInvite] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [credVisible, setCredVisible] = useState(false);
  const [lastCred, setLastCred] = useState<{ email: string; password: string } | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!schoolId || !isLeader) return;
    try {
      setLoadingMembers(true);
      const list = await getSchoolMembers(schoolId);
      setMembers(list);
    } catch (error) {
      console.error('Failed to load members', error);
      Alert.alert('خطأ', 'تعذر تحميل قائمة المعلمين');
    } finally {
      setLoadingMembers(false);
    }
  }, [schoolId, isLeader]);

  const loadInvite = useCallback(async () => {
    if (!schoolId || !isLeader) return;
    try {
      const school = await getSchoolById(schoolId);
      if (school?.inviteCode) {
        setInvite(school.inviteCode);
      }
    } catch (error) {
      console.warn('Failed to load invite code', error);
    }
  }, [schoolId, isLeader]);

  useEffect(() => {
    loadMembers();
    loadInvite();
  }, [loadMembers, loadInvite]);

  const quickActions = useMemo(
    () => [
      {
        key: 'create',
        label: 'إنشاء معلّم',
        icon: 'person-add-outline',
        action: () => setCreateModalVisible(true),
      },
      {
        key: 'members',
        label: 'إدارة المعلمين',
        icon: 'people-outline',
        action: () => navigation.navigate('TeacherManagement'),
      },
      {
        key: 'reports',
        label: 'تقارير المدرسة',
        icon: 'bar-chart-outline',
        action: () => navigation.navigate('SchoolReports'),
      },
      {
        key: 'invite',
        label: 'رمز الانضمام',
        icon: 'key-outline',
        action: () => setInviteModalVisible(true),
      },
    ],
    [navigation]
  );

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

  const handleCopyInvite = useCallback(async () => {
    if (!invite) return;
    await Clipboard.setStringAsync(invite);
    Alert.alert('تم النسخ', 'تم نسخ رمز المدرسة. شاركه مع فريقك.');
  }, [invite]);

  const handleCreateTeacher = useCallback(async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('تنبيه', 'الرجاء إدخال الاسم والبريد الإلكتروني');
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
      setCreateModalVisible(false);
    } catch (error: any) {
      Alert.alert('خطأ', error?.message || 'فشل إنشاء الحساب');
    } finally {
      setCreating(false);
    }
  }, [email, name, loadMembers]);

  const summaryStats = useMemo(
    () => [
      { label: 'المعلمين النشطين', value: members.length, icon: 'people-outline' },
      { label: 'الفصول الحالية', value: classes.length, icon: 'layers-outline' },
      { label: 'عدد الطلاب', value: totalStudents, icon: 'school-outline' },
    ],
    [members.length, classes.length, totalStudents]
  );

  if (!isLeader) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background.primary }]}> 
        <View style={styles.centerMessage}>
          <Text style={[styles.centerText, { color: themeColors.text.secondary }]}>هذه الصفحة خاصة بقائد المدرسة.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background.primary }]}> 
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'], paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.lg }}>
        <View style={[styles.hero, { backgroundColor: themeColors.background.secondary, shadowColor: themeColors.shadow ?? '#000' }]}>
          <View style={styles.heroContent}>
            <Text style={[styles.heroLabel, { color: themeColors.text.secondary }]}>إدارة المدرسة</Text>
            <Text style={[styles.heroTitle, { color: themeColors.text.primary }]}>{user?.schoolName || 'مدرستي'}</Text>
            <Text style={[styles.heroSubtitle, { color: themeColors.text.secondary }]}>نفّذ العمليات الإدارية، شارك الرموز، وتابع أداء المدرسة من مكان واحد.</Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="school-outline" size={32} color={themeColors.primary} />
          </View>
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map(action => (
            <TouchableOpacity key={action.key} style={[styles.quickButton, { backgroundColor: themeColors.background.secondary }]} onPress={action.action}>
              <Ionicons name={action.icon as any} size={22} color={themeColors.primary} />
              <Text style={[styles.quickText, { color: themeColors.text.primary }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsRow}>
          {summaryStats.map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: themeColors.background.secondary }] }>
              <Ionicons name={stat.icon as any} size={18} color={themeColors.primary} />
              <Text style={[styles.statValue, { color: themeColors.text.primary }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: themeColors.text.secondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.infoCard, { backgroundColor: themeColors.background.secondary, borderColor: themeColors.border?.light || '#e5e7eb' }]}>
          <Text style={[styles.infoTitle, { color: themeColors.text.primary }]}>آخر التحديثات</Text>
          {loadingMembers ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={themeColors.primary} />
              <Text style={[styles.loadingText, { color: themeColors.text.secondary }]}>جارٍ تحديث البيانات...</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.infoLine, { color: themeColors.text.secondary }]}>تم ربط {members.length} معلمًا بهذه المدرسة.</Text>
              <Text style={[styles.infoLine, { color: themeColors.text.secondary }]}>استخدم "رمز الانضمام" أو رمز المعلم لربط من تبقى من الفريق.</Text>
              <Text style={[styles.infoLine, { color: themeColors.text.secondary }]}>توجه لتقارير المدرسة لمشاهدة إحصاءات الحضور لكل معلم.</Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* إنشاء معلم */}
      <Modal transparent visible={createModalVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.background.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>إنشاء حساب معلّم</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: themeColors.border?.light || '#e5e5e5', color: themeColors.text.primary }]}
              placeholder="اسم المعلم"
              placeholderTextColor={themeColors.text.secondary}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.modalInput, { borderColor: themeColors.border?.light || '#e5e5e5', color: themeColors.text.primary }]}
              placeholder="البريد الإلكتروني"
              placeholderTextColor={themeColors.text.secondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity
              style={[styles.modalActionButton, { backgroundColor: themeColors.primary, opacity: creating ? 0.6 : 1 }]}
              onPress={handleCreateTeacher}
              disabled={creating}
            >
              <Text style={styles.modalActionText}>{creating ? '...جاري الإنشاء' : 'إنشاء الحساب'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: themeColors.text.secondary }]}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* رمز الدعوة */}
      <Modal transparent visible={inviteModalVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.background.card }]}
          >
            <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>رمز المدرسة</Text>
            <Text style={[styles.inviteHint, { color: themeColors.text.secondary }]}>شارك هذا الرمز مع المعلمين الجدد لربطهم بمدرستك.</Text>
            {invite && (
              <View style={[styles.qrContainer, { backgroundColor: themeColors.background.secondary }]}>
                <QRCode
                  value={invite}
                  size={200}
                  color={themeColors.text.primary}
                  backgroundColor={themeColors.background.secondary}
                />
              </View>
            )}
            <View style={[styles.inviteBox, { borderColor: themeColors.border?.light || '#e5e5e5' }]}>
              <Text style={[styles.inviteCode, { color: themeColors.text.primary }]}>{invite || '------'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.modalActionButton, { backgroundColor: themeColors.primary, opacity: inviteLoading ? 0.6 : 1 }]}
              onPress={handleRefreshInvite}
              disabled={inviteLoading}
            >
              <Text style={styles.modalActionText}>{inviteLoading ? '...جاري تحديث الرمز' : 'تجديد الرمز'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalSecondaryButton, { borderColor: themeColors.border?.light || '#d1d5db' }]} onPress={handleCopyInvite} disabled={!invite}>
              <Text style={[styles.modalSecondaryText, { color: invite ? themeColors.text.primary : themeColors.text.secondary }]}>نسخ الرمز</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: themeColors.text.secondary }]}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* بيانات الاعتماد بعد الإنشاء */}
      <Modal transparent visible={credVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.background.card }]}
          >
            <Text style={[styles.modalTitle, { color: themeColors.text.primary }]}>تم إنشاء الحساب</Text>
            <Text style={[styles.credLine, { color: themeColors.text.primary }]}>البريد: {lastCred?.email}</Text>
            <Text style={[styles.credLine, { color: themeColors.text.primary }]}>كلمة المرور المؤقتة: {lastCred?.password}</Text>
            <TouchableOpacity style={[styles.modalActionButton, { backgroundColor: themeColors.primary }]} onPress={() => setCredVisible(false)}>
              <Text style={styles.modalActionText}>تم</Text>
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
  },
  centerMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  centerText: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
  },
  hero: {
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    ...shadows.sm,
  },
  heroContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  heroIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
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
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickButton: {
    flexBasis: '48%',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    ...shadows.sm,
  },
  quickText: {
    fontFamily: fontFamilies.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flexBasis: '31%',
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statValue: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
  },
  statLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
  },
  infoTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    marginBottom: spacing.sm,
  },
  infoLine: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: fontFamilies.regular,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
  },
  modalTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  modalActionButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  modalActionText: {
    color: '#fff',
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
  },
  modalCancel: {
    textAlign: 'center',
    marginTop: spacing.md,
    fontFamily: fontFamilies.semibold,
  },
  inviteHint: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  inviteBox: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  inviteCode: {
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    letterSpacing: 4,
  },
  modalSecondaryButton: {
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  modalSecondaryText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
  },
  credLine: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
});
