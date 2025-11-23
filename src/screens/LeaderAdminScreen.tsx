import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { useApp } from '../context/AppContext';
import { fontFamilies, colors } from '../utils/theme';
import { communityService } from '../services/communityService';
import { adminService } from '../services/adminService';
import { getSchoolMembers, updateMemberRole } from '../services/schoolService';
import type { UserRole } from '../types';

export default function LeaderAdminScreen() {
  const { state } = useApp();
  const user = (state as any).userProfile;
  const [members, setMembers] = useState<any[]>([]);
  const [invite, setInvite] = useState<string>('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [credVisible, setCredVisible] = useState(false);
  const [lastCred, setLastCred] = useState<{ email: string; password: string } | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  const schoolId = user?.schoolId;
  const isLeader = user?.role === 'leader';

  useEffect(() => {
    const load = async () => {
      if (!schoolId || !isLeader) return;
      const list = await getSchoolMembers(schoolId);
      setMembers(list);
    };
    load();
  }, [schoolId, isLeader]);

  const handleRefreshInvite = async () => {
    if (!schoolId) return;
    const res = await communityService.refreshInviteCode(schoolId);
    setInvite(res.inviteCode);
    Alert.alert('تم', `تم إنشاء رمز جديد: ${res.inviteCode}`);
  };

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
      if (schoolId) {
        const list = await getSchoolMembers(schoolId);
        setMembers(list);
      }
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'فشل إنشاء الحساب');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleRole = useCallback(async (memberId: string, currentRole: UserRole) => {
    if (!isLeader || memberId === user?.id) return;
    const nextRole: UserRole = currentRole === 'leader' ? 'member' : 'leader';
    setRoleUpdatingId(memberId);
    try {
      await updateMemberRole(memberId, nextRole);
      setMembers(prev => prev.map(member => member.id === memberId ? { ...member, role: nextRole } : member));
      if (memberId === user?.id) {
        Alert.alert('تنبيه', 'لقد غيرت دورك. أعد فتح الصفحة للتأكد من التحديث.');
      }
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'تعذر تحديث دور العضو');
    } finally {
      setRoleUpdatingId(null);
    }
  }, [isLeader, user?.id]);

  const handleSeedSchool = async () => {
    // Create school once for this leader if they don't have schoolId
    if (!isLeader) return;
    if (schoolId) {
      Alert.alert('تنبيه', 'تم ربط حسابك بمدرسة بالفعل');
      return;
    }
    try {
      setSeedLoading(true);
      const res = await communityService.createSchool('مدرسه فلاح وفيصل', user?.id);
      setInvite(res.inviteCode || '');
      Alert.alert('تم', `تم إنشاء المدرسة.
schoolId: ${res.id}
رمز الدعوة: ${res.inviteCode}`);
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'فشل إنشاء المدرسة');
    } finally {
      setSeedLoading(false);
    }
  };

  if (!isLeader) {
    return (
      <View style={styles.center}>
        <Text style={styles.note}>هذه الصفحة خاصة بقائد المدرسة</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>إدارة أعضاء المدرسة</Text>
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
        <TouchableOpacity disabled={creating} onPress={handleCreateTeacher} style={[styles.createBtn, creating && { opacity: 0.5 }]}>
          <Text style={styles.createText}>{creating ? 'جاري الإنشاء...' : 'إنشاء حساب معلّم'}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.inviteBtn} onPress={handleRefreshInvite}>
        <Text style={styles.inviteText}>تجديد رمز الدعوة</Text>
      </TouchableOpacity>
      {!schoolId && (
        <TouchableOpacity style={[styles.inviteBtn, { backgroundColor: colors.primary }]} onPress={handleSeedSchool} disabled={seedLoading}>
          <Text style={styles.inviteText}>{seedLoading ? 'جاري الإنشاء...' : 'إنشاء مدرسة "مدرسه فلاح وفيصل"'}</Text>
        </TouchableOpacity>
      )}
      {invite ? <Text style={styles.inviteCode}>الرمز: {invite}</Text> : null}
      <FlatList
        data={members}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.memberHeader}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={[styles.roleBadge, item.role === 'leader' ? styles.leaderBadge : styles.memberBadge]}>
                <Text style={styles.roleBadgeText}>{item.role === 'leader' ? 'قائد' : 'معلم'}</Text>
              </View>
            </View>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.codeText}>رمز المعلم: {item.userCode || '------'}</Text>
            {isLeader && item.id !== user?.id && (
              <TouchableOpacity
                style={[styles.roleButton, roleUpdatingId === item.id && { opacity: 0.6 }]}
                onPress={() => handleToggleRole(item.id, item.role)}
                disabled={roleUpdatingId === item.id}
              >
                <Text style={styles.roleButtonText}>
                  {item.role === 'leader' ? 'إرجاع كمعلم' : 'منح صلاحية قائد'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { fontSize: 20, fontFamily: fontFamilies.bold, color: '#2c3e50', padding: 16 },
  inviteBtn: { backgroundColor: colors.primary, marginHorizontal: 16, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  inviteText: { color: '#fff', fontFamily: fontFamilies.semibold },
  inviteCode: { textAlign: 'center', marginTop: 8, color: '#2c3e50' },
  formRow: { backgroundColor: '#fff', borderRadius: 12, margin: 16, padding: 16, borderWidth: 1, borderColor: '#eee' },
  input: { backgroundColor: '#f4f6f7', borderRadius: 8, padding: 12, fontFamily: fontFamilies.regular, color: '#2c3e50', marginBottom: 10 },
  createBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  createText: { color: '#fff', fontFamily: fontFamilies.semibold },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  name: { fontFamily: fontFamilies.semibold, color: '#2c3e50' },
  roleBadge: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  leaderBadge: { backgroundColor: '#E6F4EA' },
  memberBadge: { backgroundColor: '#E7E9F5' },
  roleBadgeText: { fontFamily: fontFamilies.semibold, color: '#2c3e50', fontSize: 12 },
  email: { fontFamily: fontFamilies.regular, color: '#7f8c8d', marginTop: 6 },
  codeText: { fontFamily: fontFamilies.semibold, color: '#2c3e50', marginTop: 8 },
  roleButton: { marginTop: 12, borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.primary },
  roleButtonText: { color: '#fff', fontFamily: fontFamilies.semibold },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  note: { fontFamily: fontFamilies.regular, color: '#7f8c8d' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '80%' },
  modalTitle: { fontFamily: fontFamilies.bold, color: '#2c3e50', fontSize: 18, marginBottom: 8, textAlign: 'center' },
  modalLine: { fontFamily: fontFamilies.regular, color: '#2c3e50', marginVertical: 4, textAlign: 'center' },
  modalBtn: { marginTop: 12, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontFamily: fontFamilies.semibold },
});
