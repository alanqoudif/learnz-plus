import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { firestore, COLLECTIONS } from '../config/firebase';
import { AccountTier, UserRole } from '../types';
import { fontFamilies } from '../utils/theme';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  tier: AccountTier;
  role: UserRole;
  isAppAdmin?: boolean;
  schoolId?: string | null;
}

export default function AppAdminScreen() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(firestore, COLLECTIONS.USERS));
      const mapped: AdminUserRow[] = snapshot.docs.map((docSnap) => {
        const data: any = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || 'بدون اسم',
          email: data.email || 'غير محدد',
          tier: (data.tier || 'free') as AccountTier,
          role: (data.role || 'member') as UserRole,
          isAppAdmin: !!data.isAppAdmin,
          schoolId: data.schoolId ?? null,
        };
      });
      setUsers(mapped.sort((a, b) => a.email.localeCompare(b.email)));
    } catch (error) {
      console.error('Failed to load users', error);
      Alert.alert('خطأ', 'تعذر تحميل قائمة المستخدمين');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleTier = async (user: AdminUserRow) => {
    try {
      const nextTier: AccountTier = user.tier === 'plus' ? 'free' : 'plus';
      await updateDoc(doc(firestore, COLLECTIONS.USERS, user.id), { tier: nextTier });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, tier: nextTier } : u)));
    } catch (error) {
      console.error('Failed to update tier', error);
      Alert.alert('خطأ', 'تعذر تحديث حالة الاشتراك');
    }
  };

  const handleToggleRole = async (user: AdminUserRow) => {
    try {
      const nextRole: UserRole = user.role === 'leader' ? 'member' : 'leader';
      await updateDoc(doc(firestore, COLLECTIONS.USERS, user.id), { role: nextRole });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
    } catch (error) {
      console.error('Failed to update role', error);
      Alert.alert('خطأ', 'تعذر تحديث دور المستخدم');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const renderUser = ({ item }: { item: AdminUserRow }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.userName}>{item.name}</Text>
        {item.isAppAdmin && <Text style={styles.adminBadge}>مدير التطبيق</Text>}
      </View>
      <Text style={styles.userEmail}>{item.email}</Text>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>الحالة</Text>
          <Text style={[styles.metaValue, item.tier === 'plus' ? styles.plusValue : styles.freeValue]}>
            {item.tier === 'plus' ? 'Plus' : 'مجاني'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>الدور</Text>
          <Text style={styles.metaValue}>{item.role === 'leader' ? 'قائد مدرسة' : 'معلّم'}</Text>
        </View>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleTier(item)}>
          <Text style={styles.actionText}>
            {item.tier === 'plus' ? 'تحويل إلى مجاني' : 'ترقية إلى Plus'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={() => handleToggleRole(item)}>
          <Text style={[styles.actionText, styles.secondaryText]}>
            {item.role === 'leader' ? 'تعيين معلّم' : 'تعيين قائد'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>لوحة إدارة الاشتراكات</Text>
      <Text style={styles.subHeader}>
        يمكنك ترقية أي معلم إلى خطة Plus أو إعادته إلى الخطة المجانية. عدد المستخدمين: {users.length}
      </Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderUser}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>لا يوجد معلمون مسجلون حتى الآن.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
    textAlign: 'right',
    marginBottom: 6,
  },
  subHeader: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: '#7f8c8d',
    textAlign: 'right',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  userName: {
    fontFamily: fontFamilies.semibold,
    color: '#2c3e50',
    fontSize: 16,
  },
  adminBadge: {
    fontFamily: fontFamilies.semibold,
    color: '#1f6feb',
  },
  userEmail: {
    fontFamily: fontFamilies.regular,
    color: '#7f8c8d',
    textAlign: 'right',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaItem: {
    flex: 1,
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontFamily: fontFamilies.regular,
    color: '#95a5a6',
    marginBottom: 4,
  },
  metaValue: {
    fontFamily: fontFamilies.semibold,
    color: '#2c3e50',
  },
  plusValue: {
    color: '#27ae60',
  },
  freeValue: {
    color: '#e67e22',
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2ecc71',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontFamily: fontFamilies.semibold,
  },
  secondaryButton: {
    backgroundColor: '#ecf0f1',
  },
  secondaryText: {
    color: '#2c3e50',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontFamily: fontFamilies.regular,
    color: '#95a5a6',
  },
});
