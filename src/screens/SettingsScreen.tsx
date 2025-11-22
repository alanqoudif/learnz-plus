import React, { useState } from 'react';
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
  const { mode, setMode, colors } = useTheme();
  const { userProfile, currentTeacher } = state as any;
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(userProfile?.name || currentTeacher?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);

  // حالة الأقسام المفتوحة/المغلقة
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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

  const handleThemeChange = async (newMode: 'light' | 'dark' | 'auto') => {
    lightHaptic();
    await setMode(newMode);
  };

  const toggleSection = (section: string) => {
    lightHaptic();
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background.primary }]}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>الإعدادات</Text>
        </View>

        {/* Account Section */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}
          onPress={() => toggleSection('account')}
          activeOpacity={0.7}
        >
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>حسابي</Text>
          <Text style={[styles.chevron, { color: colors.text.secondary }]}>
            {expandedSection === 'account' ? '▼' : '◀'}
          </Text>
        </TouchableOpacity>

        {expandedSection === 'account' && (
          <View style={[styles.sectionContent, { backgroundColor: colors.background.primary }]}>
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
                      style={[styles.cancelButton, { backgroundColor: colors.border.medium }]}
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
              ) : (
                <View style={styles.nameRow}>
                  <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                    {userProfile?.name || currentTeacher?.name || 'غير متوفر'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setIsEditingName(true);
                      lightHaptic();
                    }}
                  >
                    <Text style={[styles.buttonText, { color: colors.text.light }]}>تعديل</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Appearance Section */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: colors.background.primary, borderColor: colors.border.light }]}
          onPress={() => toggleSection('appearance')}
          activeOpacity={0.7}
        >
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>المظهر</Text>
          <Text style={[styles.chevron, { color: colors.text.secondary }]}>
            {expandedSection === 'appearance' ? '▼' : '◀'}
          </Text>
        </TouchableOpacity>

        {expandedSection === 'appearance' && (
          <View style={[styles.sectionContent, { backgroundColor: colors.background.primary }]}>
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
                الوضع النهاري
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
                الوضع الليلي
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
                تلقائي
              </Text>
              {mode === 'auto' && (
                <Text style={[styles.checkmark, { color: colors.text.light }]}>✓</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

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
    paddingTop: 60,
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
    direction: 'rtl',
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.semibold,
    textAlign: 'right',
    direction: 'rtl',
  },
  chevron: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
  },
  sectionContent: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    textAlign: 'right',
    direction: 'rtl',
  },
  infoValue: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
    textAlign: 'right',
    direction: 'rtl',
  },
  nameRow: {
    flexDirection: 'row-reverse',
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
    direction: 'rtl',
  },
  editButtons: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
    justifyContent: 'flex-start',
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  saveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: fontFamilies.semibold,
    textAlign: 'center',
  },
  themeOption: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  themeOptionText: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
    textAlign: 'right',
    direction: 'rtl',
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
    textAlign: 'center',
  },
});
