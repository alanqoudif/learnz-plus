import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { smartAuthService as authService } from '../services/smartService';
import { firestore, COLLECTIONS } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { fontFamilies, spacing, borderRadius, shadows } from '../utils/theme';
import { mediumHaptic, lightHaptic } from '../utils/haptics';

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { state } = useApp();
  const { mode, isDark, setMode, colors } = useTheme();
  const { userProfile, currentTeacher } = state as any;
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(userProfile?.name || currentTeacher?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);

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
              await authService.signOut();
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

      // تحديث الاسم في Firebase Auth
      await updateProfile(user, {
        displayName: newName.trim(),
      });

      // تحديث الاسم في Firestore
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

  const handleThemeChange = async (newMode: 'light' | 'dark' | 'auto') => {
    lightHaptic();
    await setMode(newMode);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background.primary }]}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>الإعدادات</Text>
        </View>

        {/* Account Section */}
        <View style={[styles.section, { backgroundColor: colors.background.primary }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>حسابي</Text>
          
          <View style={styles.accountInfo}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>البريد الإلكتروني</Text>
              <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                {userProfile?.email || currentTeacher?.phoneNumber || 'غير متوفر'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>الاسم</Text>
              {isEditingName ? (
                <View style={styles.editNameContainer}>
                  <TextInput
                    style={[styles.nameInput, { 
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.medium
                    }]}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="أدخل الاسم الجديد"
                    placeholderTextColor={colors.text.tertiary}
                    autoFocus
                  />
                  <View style={styles.editButtons}>
                    <TouchableOpacity
                      style={[styles.cancelEditButton, { backgroundColor: colors.secondary }]}
                      onPress={() => {
                        setNewName(userProfile?.name || currentTeacher?.name || '');
                        setIsEditingName(false);
                      }}
                    >
                      <Text style={[styles.editButtonText, { color: colors.text.light }]}>إلغاء</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveEditButton, { backgroundColor: colors.success }]}
                      onPress={handleUpdateName}
                      disabled={isUpdating}
                    >
                      <Text style={[styles.editButtonText, { color: colors.text.light }]}>
                        {isUpdating ? 'جاري الحفظ...' : 'حفظ'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.nameRow}>
                  <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                    {userProfile?.name || currentTeacher?.name || 'غير متوفر'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: colors.background.secondary }]}
                    onPress={() => {
                      setIsEditingName(true);
                      lightHaptic();
                    }}
                  >
                    <Text style={[styles.editButtonText, { color: colors.primary }]}>تعديل</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: colors.background.primary }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>المظهر</Text>
          
          <View style={styles.themeOptions}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                { 
                  backgroundColor: mode === 'light' ? colors.primary : colors.background.secondary,
                  borderColor: colors.border.medium
                }
              ]}
              onPress={() => handleThemeChange('light')}
            >
              <Text style={[
                styles.themeOptionText,
                { color: mode === 'light' ? colors.text.light : colors.text.primary }
              ]}>
                ☀️ الوضع النهاري
              </Text>
              {mode === 'light' && (
                <Text style={[styles.checkmark, { color: colors.text.light }]}>✓</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { 
                  backgroundColor: mode === 'dark' ? colors.primary : colors.background.secondary,
                  borderColor: colors.border.medium
                }
              ]}
              onPress={() => handleThemeChange('dark')}
            >
              <Text style={[
                styles.themeOptionText,
                { color: mode === 'dark' ? colors.text.light : colors.text.primary }
              ]}>
                🌙 الوضع الليلي
              </Text>
              {mode === 'dark' && (
                <Text style={[styles.checkmark, { color: colors.text.light }]}>✓</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { 
                  backgroundColor: mode === 'auto' ? colors.primary : colors.background.secondary,
                  borderColor: colors.border.medium
                }
              ]}
              onPress={() => handleThemeChange('auto')}
            >
              <Text style={[
                styles.themeOptionText,
                { color: mode === 'auto' ? colors.text.light : colors.text.primary }
              ]}>
                🔄 تلقائي
              </Text>
              {mode === 'auto' && (
                <Text style={[styles.checkmark, { color: colors.text.light }]}>✓</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.danger }]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutButtonText, { color: colors.text.light }]}>
              تسجيل الخروج
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: fontFamilies.bold,
    textAlign: 'right',
  },
  section: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    marginBottom: spacing.lg,
    textAlign: 'right',
  },
  accountInfo: {
    gap: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    textAlign: 'right',
  },
  infoValue: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
    textAlign: 'right',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  editNameContainer: {
    width: '100%',
    marginTop: spacing.md,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    marginBottom: spacing.md,
    textAlign: 'right',
  },
  editButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  cancelEditButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  saveEditButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: fontFamilies.semibold,
  },
  themeOptions: {
    gap: spacing.md,
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  themeOptionText: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
  },
  checkmark: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
  },
  logoutSection: {
    marginTop: spacing.xl,
    marginBottom: spacing['2xl'],
  },
  logoutButton: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
  },
});

