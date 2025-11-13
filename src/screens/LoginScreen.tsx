import React, { useMemo, useState } from 'react';
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
import { fontFamilies } from '../utils/theme';
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
        await setDoc(
          doc(firestore, COLLECTIONS.USERS, user.uid),
          {
            email: normalizedEmail,
            ...(isAdminEmail ? { tier, isAppAdmin: true, role } : {}),
          },
          { merge: true }
        );
      } else {
        const user = await authService.createAccount(normalizedEmail, password, formattedName || 'معلم');
        await setDoc(
          doc(firestore, COLLECTIONS.USERS, user.uid),
          {
            email: normalizedEmail,
            name: formattedName,
            schoolId: null,
            role,
            tier,
            isAppAdmin: isAdminEmail,
          },
          { merge: true }
        );
      }
    } catch (error: any) {
      console.error('❌ خطأ في المصادقة:', error);
      const message = error?.message || 'حدث خطأ أثناء تنفيذ الطلب';
      Alert.alert('خطأ', message.includes('auth/user-not-found') ? 'لا يوجد حساب بهذا البريد. جرّب إنشاء حساب جديد.' : message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>لوحة التحكم للمعلمين</Text>
            <Text style={styles.subtitle}>سجل حضور الطلاب بسهولة سواءً كنت متصلاً بالإنترنت أو لا</Text>
          </View>

          <View style={styles.modeSwitch}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
              onPress={() => setMode('login')}
              disabled={isLoading}
            >
              <Text style={[styles.modeButtonText, mode === 'login' && styles.modeButtonTextActive]}>تسجيل الدخول</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'register' && styles.modeButtonActive]}
              onPress={() => setMode('register')}
              disabled={isLoading}
            >
              <Text style={[styles.modeButtonText, mode === 'register' && styles.modeButtonTextActive]}>إنشاء حساب</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {mode === 'register' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>الاسم الكامل</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="أدخل اسمك الكامل"
                  placeholderTextColor="#999"
                  textAlign="right"
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="example@school.edu"
                placeholderTextColor="#999"
                keyboardType="email-address"
                textAlign="right"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>كلمة المرور</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="٦ أحرف على الأقل"
                placeholderTextColor="#999"
                textAlign="right"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {isAdminEmail && (
              <View style={styles.adminHint}>
                <Text style={styles.adminHintText}>⚡ سيتم تسجيل الدخول كمدير التطبيق مع صلاحيات كاملة.</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'جاري المعالجة...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
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
    backgroundColor: '#f5f6fa',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  content: {
    flex: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 28,
    color: '#2c3e50',
    fontFamily: fontFamilies.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    fontFamily: fontFamilies.regular,
    textAlign: 'right',
    lineHeight: 24,
  },
  modeSwitch: {
    flexDirection: 'row-reverse',
    backgroundColor: '#ecf0f1',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  modeButtonText: {
    fontFamily: fontFamilies.semibold,
    color: '#95a5a6',
  },
  modeButtonTextActive: {
    color: '#2c3e50',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontFamily: fontFamilies.semibold,
    color: '#2c3e50',
    fontSize: 14,
    marginBottom: 6,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#f5f6fa',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: fontFamilies.regular,
    color: '#2c3e50',
  },
  adminHint: {
    backgroundColor: '#f1f8ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  adminHintText: {
    color: '#1f6feb',
    fontFamily: fontFamilies.semibold,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontFamily: fontFamilies.bold,
    fontSize: 16,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  footerText: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontFamily: fontFamilies.regular,
    lineHeight: 22,
  },
});
