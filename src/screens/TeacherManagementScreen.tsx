import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { fontFamilies, spacing, borderRadius, shadows } from '../utils/theme';
import { getSchoolMembers, updateMemberRole } from '../services/schoolService';
import type { UserProfile, UserRole } from '../types';

export default function TeacherManagementScreen() {
  const { state } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = (state as any).userProfile as UserProfile | undefined;
  const schoolId = user?.schoolId;
  const isLeader = user?.role === 'leader';
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!schoolId || !isLeader) return;
    try {
      setLoading(true);
      const list = await getSchoolMembers(schoolId);
      setMembers(list);
    } catch (error) {
      console.error('Failed to load members', error);
      Alert.alert('خطأ', 'تعذر تحميل قائمة المعلمين');
    } finally {
      setLoading(false);
    }
  }, [schoolId, isLeader]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const onRefresh = useCallback(async () => {
    if (!schoolId || !isLeader) return;
    try {
      setRefreshing(true);
      const list = await getSchoolMembers(schoolId);
      setMembers(list);
    } catch (error) {
      Alert.alert('خطأ', 'تعذر تحديث القائمة');
    } finally {
      setRefreshing(false);
    }
  }, [schoolId, isLeader]);

  const handleToggleRole = useCallback(
    async (member: UserProfile) => {
      if (!isLeader || member.id === user?.id) return;
      const nextRole: UserRole = member.role === 'leader' ? 'member' : 'leader';
      setRoleUpdatingId(member.id);
      try {
        await updateMemberRole(member.id, nextRole);
        setMembers(prev => prev.map(item => (item.id === member.id ? { ...item, role: nextRole } : item)));
      } catch (error: any) {
        Alert.alert('خطأ', error?.message || 'تعذر تحديث دور المعلم');
      } finally {
        setRoleUpdatingId(null);
      }
    },
    [isLeader, user?.id]
  );

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
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'], paddingHorizontal: spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={[styles.headerCard, { backgroundColor: colors.background.secondary, shadowColor: '#000' }]}>
          <View>
            <Text style={[styles.headerLabel, { color: colors.text.secondary }]}>قسم الموارد البشرية</Text>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>إدارة المعلمين</Text>
            <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>تتبع جميع المعلمين، شارك الرموز وامنح صلاحيات القائد.</Text>
          </View>
          <Ionicons name="people-outline" size={28} color={colors.primary} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>جارٍ تحميل القائمة...</Text>
          </View>
        ) : members.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>لا يوجد معلمون مسجلون</Text>
            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>استخدم زر "إنشاء معلم" من صفحة إدارة المدرسة لإضافة حسابات جديدة.</Text>
          </View>
        ) : (
          members.map(member => (
            <View key={member.id} style={[styles.memberCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.light }]}>
              <View style={styles.memberHeader}>
                <View>
                  <Text style={[styles.memberName, { color: colors.text.primary }]}>{member.name || 'بدون اسم'}</Text>
                  <Text style={[styles.memberEmail, { color: colors.text.secondary }]}>{member.email || '—'}</Text>
                </View>
                <View style={[styles.roleBadge, member.role === 'leader' ? styles.leaderBadge : styles.memberBadge]}>
                  <Text style={styles.roleBadgeText}>{member.role === 'leader' ? 'قائد' : 'معلم'}</Text>
                </View>
              </View>
              <Text style={[styles.memberMeta, { color: colors.text.secondary }]}>رمز المعلم: {member.userCode || '------'}</Text>
              {member.id !== user?.id && (
                <TouchableOpacity
                  style={[styles.roleButton, { backgroundColor: colors.primary, opacity: roleUpdatingId === member.id ? 0.6 : 1 }]}
                  onPress={() => handleToggleRole(member)}
                  disabled={roleUpdatingId === member.id}
                >
                  <Text style={styles.roleButtonText}>
                    {member.role === 'leader' ? 'إرجاع كمعلم' : 'منح صلاحية قائد'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
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
  headerCard: {
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.sm,
  },
  headerLabel: {
    fontSize: 12,
    fontFamily: fontFamilies.semibold,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  loadingText: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.regular,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing['2xl'],
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  memberCard: {
    borderWidth: 1,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  memberName: {
    fontSize: 18,
    fontFamily: fontFamilies.semibold,
  },
  memberEmail: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    marginTop: spacing.xs,
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
  memberMeta: {
    fontSize: 13,
    fontFamily: fontFamilies.medium,
    marginTop: spacing.xs,
  },
  roleButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  roleButtonText: {
    fontFamily: fontFamilies.semibold,
    color: '#fff',
  },
});
