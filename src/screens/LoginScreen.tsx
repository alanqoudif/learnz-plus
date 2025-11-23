import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { validateName, formatName } from '../utils/validation';
import { fontFamilies, spacing, borderRadius, shadows } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { smartAuthService as authService } from '../services/smartService';
import { firestore, COLLECTIONS } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { APP_ADMIN_EMAILS, ADMIN_ACCOUNT_TIER, DEFAULT_ACCOUNT_TIER } from '../config/appConfig';

interface LoginScreenProps {
  navigation: any;
}

type AuthMode = 'login' | 'register';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { colors } = useTheme();

  const normalizedEmail = email.trim().toLowerCase();
  const isAdminEmail = useMemo(() => APP_ADMIN_EMAILS.includes(normalizedEmail), [normalizedEmail]);

  const validateInputs = () => {
    if (!email.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال البريد الإلكتروني');
      return false;
    }

    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert('خطأ', 'يرجى إدخال بريد إلكتروني صحيح');
      return false;
    }

    if (!password.trim() || password.length < 6) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return false;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        Alert.alert('خطأ', 'يرجى إدخال الاسم الكامل');
        return false;
      }

      if (!validateName(name)) {
        Alert.alert('خطأ', 'يرجى إدخال اسم صحيح (حروف فقط)');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);

    try {
      const formattedName = mode === 'register' ? formatName(name) : undefined;
      const tier = isAdminEmail ? ADMIN_ACCOUNT_TIER : DEFAULT_ACCOUNT_TIER;
      const role = isAdminEmail ? 'leader' : 'member';

      if (mode === 'login') {
        const user = await authService.signInWithEmail(normalizedEmail, password);
        console.log('✅ تم تسجيل الدخول بنجاح:', user.uid);

        // حفظ بيانات المستخدم في Firestore
        try {
          await setDoc(
            doc(firestore, COLLECTIONS.USERS, user.uid),
            {
              email: normalizedEmail,
              ...(isAdminEmail ? { tier, isAppAdmin: true, role } : {}),
              updatedAt: new Date(),
            },
            { merge: true }
          );
          console.log('✅ تم حفظ بيانات المستخدم في Firestore');
        } catch (firestoreError: any) {
          console.error('❌ خطأ في حفظ بيانات المستخدم:', firestoreError);
          // لا نرمي خطأ هنا لأن تسجيل الدخول نجح
        }
      } else {
        const user = await authService.createAccount(normalizedEmail, password, formattedName || 'معلم');
        console.log('✅ تم إنشاء الحساب بنجاح:', user.uid);

        // حفظ بيانات المستخدم في Firestore
        try {
          await setDoc(
            doc(firestore, COLLECTIONS.USERS, user.uid),
            {
              email: normalizedEmail,
              name: formattedName,
              schoolId: null,
              role,
              tier,
              isAppAdmin: isAdminEmail,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            { merge: true }
          );
          console.log('✅ تم حفظ بيانات المستخدم الجديد في Firestore');
        } catch (firestoreError: any) {
          console.error('❌ خطأ في حفظ بيانات المستخدم:', firestoreError);
          // لا نرمي خطأ هنا لأن الحساب تم إنشاؤه بنجاح
        }
      }
    } catch (error: any) {
      console.error('❌ خطأ في المصادقة:', error);
      let message = error?.message || 'حدث خطأ أثناء تنفيذ الطلب';

      // ترجمة رسائل الخطأ
      if (error?.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            message = 'لا يوجد حساب بهذا البريد. جرّب إنشاء حساب جديد.';
            break;
          case 'auth/wrong-password':
            message = 'كلمة المرور غير صحيحة';
            break;
          case 'auth/email-already-in-use':
            message = 'البريد الإلكتروني مستخدم بالفعل';
            break;
          case 'auth/invalid-email':
            message = 'البريد الإلكتروني غير صحيح';
            break;
          case 'auth/weak-password':
            message = 'كلمة المرور ضعيفة جداً';
            break;
          case 'auth/network-request-failed':
            message = 'خطأ في الاتصال بالإنترنت. يرجى المحاولة مرة أخرى.';
            break;
        }
      }

      Alert.alert('خطأ', message);
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = useMemo(() => ({
    container: { backgroundColor: colors.background.secondary },
    title: { color: colors.text.primary },
    subtitle: { color: colors.text.secondary },
    modeSwitch: { backgroundColor: colors.background.tertiary },
    modeButtonActive: { backgroundColor: colors.background.primary },
    modeButtonText: { color: colors.text.secondary },
    modeButtonTextActive: { color: colors.text.primary },
    form: { backgroundColor: colors.background.primary },
    label: { color: colors.text.primary },
    input: {
      backgroundColor: colors.background.secondary,
      color: colors.text.primary
    },
    adminHint: { backgroundColor: colors.info + '20' },
    adminHintText: { color: colors.info },
    submitButton: { backgroundColor: colors.primary },
    submitButtonDisabled: { opacity: 0.6 },
    footerText: { color: colors.text.secondary },
  }), [colors]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, dynamicStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, dynamicStyles.title]}>لوحة التحكم للمعلمين</Text>
            <Text style={[styles.subtitle, dynamicStyles.subtitle]}>سجل حضور الطلاب بسهولة سواءً كنت متصلاً بالإنترنت أو لا</Text>
          </View>

          <View style={[styles.modeSwitch, dynamicStyles.modeSwitch]}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'login' && [styles.modeButtonActive, dynamicStyles.modeButtonActive]
              ]}
              onPress={() => setMode('login')}
              disabled={isLoading}
            >
              <Text style={[
                styles.modeButtonText,
                mode === 'login' ? dynamicStyles.modeButtonTextActive : dynamicStyles.modeButtonText
              ]}>
                تسجيل الدخول
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'register' && [styles.modeButtonActive, dynamicStyles.modeButtonActive]
              ]}
              onPress={() => setMode('register')}
              disabled={isLoading}
            >
              <Text style={[
                styles.modeButtonText,
                mode === 'register' ? dynamicStyles.modeButtonTextActive : dynamicStyles.modeButtonText
              ]}>
                إنشاء حساب
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.form, dynamicStyles.form]}>
            {mode === 'register' && (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, dynamicStyles.label]}>الاسم الكامل</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={name}
                  onChangeText={setName}
                  placeholder="أدخل اسمك الكامل"
                  placeholderTextColor={colors.text.tertiary}
                  textAlign="right"
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>البريد الإلكتروني</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={email}
                onChangeText={setEmail}
                placeholder="example@school.edu"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="email-address"
                textAlign="right"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>كلمة المرور</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={password}
                onChangeText={setPassword}
                placeholder="٦ أحرف على الأقل"
                placeholderTextColor={colors.text.tertiary}
                textAlign="right"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {isAdminEmail && (
              <View style={[styles.adminHint, dynamicStyles.adminHint]}>
                <Text style={[styles.adminHintText, dynamicStyles.adminHintText]}>
                  ⚡ سيتم تسجيل الدخول كمدير التطبيق مع صلاحيات كاملة.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                dynamicStyles.submitButton,
                isLoading && dynamicStyles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'جاري المعالجة...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, dynamicStyles.footerText]}>
              التطبيق يدعم العمل دون اتصال. عند العودة للإنترنت يتم مزامنة الحضور تلقائياً.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },
  content: {
    flex: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: spacing['3xl'],
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamilies.bold,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    textAlign: 'right',
    lineHeight: 24,
  },
  modeSwitch: {
    flexDirection: 'row-reverse',
    borderRadius: borderRadius.xl,
    padding: 4,
    marginBottom: spacing['2xl'],
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modeButtonActive: {
    ...shadows.sm,
  },
  modeButtonText: {
    fontFamily: fontFamilies.semibold,
  },
  form: {
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    ...shadows.md,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  input: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontFamily: fontFamilies.regular,
  },
  adminHint: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  adminHintText: {
    fontFamily: fontFamilies.semibold,
    textAlign: 'right',
  },
  submitButton: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  submitButtonText: {
    color: '#ffffff',
    fontFamily: fontFamilies.bold,
    fontSize: 16,
  },
  footer: {
    marginTop: spacing['3xl'],
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  footerText: {
    textAlign: 'center',
    fontFamily: fontFamilies.regular,
    lineHeight: 22,
  },
});
