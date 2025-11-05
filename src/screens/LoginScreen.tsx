import React, { useState } from 'react';
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
import { useApp } from '../context/AppContext';
import { Teacher } from '../types';
import { validateName, validatePhoneNumber, formatName } from '../utils/validation';
import { fontFamilies } from '../utils/theme';
import { smartAuthService as authService } from '../services/smartService';
import { firestore, COLLECTIONS } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { dispatch } = useApp();

  const handleLogin = async () => {
    // التحقق من صحة البيانات
    if (!name.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم');
      return;
    }

    if (!email.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال البريد الإلكتروني');
      return;
    }

    if (!password.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال كلمة المرور');
      return;
    }

    if (!validateName(name)) {
      Alert.alert('خطأ', 'يرجى إدخال اسم صحيح (حروف فقط)');
      return;
    }

    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('خطأ', 'يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    if (password.length < 6) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsLoading(true);

    try {
      const formattedName = formatName(name);
      const formattedEmail = email.toLowerCase().trim();

      console.log('🔄 بدء عملية تسجيل الدخول للمعلم:', formattedName);

      // استخدام Firebase Auth للتسجيل/تسجيل الدخول
      try {
        // محاولة تسجيل الدخول أولاً
        console.log('🔄 محاولة تسجيل الدخول...');
        const user = await authService.signInWithEmail(formattedEmail, password);
        
        console.log('✅ تم تسجيل الدخول بنجاح');
        // حفظ/تحديث بروفايل المستخدم في Firestore
        await setDoc(doc(firestore, COLLECTIONS.USERS, user.uid), {
          email: formattedEmail,
          name: formattedName,
        }, { merge: true });
        
      } catch (loginError: any) {
        console.log('🔄 فشل تسجيل الدخول، محاولة إنشاء حساب جديد...');
        
        // إذا فشل تسجيل الدخول، جرب التسجيل
        if (loginError.message.includes('المستخدم غير موجود') || 
            loginError.message.includes('كلمة المرور غير صحيحة') ||
            loginError.code === 'auth/user-not-found' || 
            loginError.code === 'auth/wrong-password') {
          
          const user = await authService.createAccount(formattedEmail, password, formattedName);
          console.log('✅ تم إنشاء الحساب بنجاح');
          // حفظ بروفايل المستخدم لأول مرة
          await setDoc(doc(firestore, COLLECTIONS.USERS, user.uid), {
            email: formattedEmail,
            name: formattedName,
            schoolId: null,
            role: 'member'
          }, { merge: true });
          
        } else {
          throw loginError;
        }
      }
      
    } catch (error) {
      console.error('❌ خطأ في تسجيل الدخول:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      Alert.alert('خطأ', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>تطبيق الحضور والغياب</Text>
            <Text style={styles.subtitle}>للمعلمين</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>الاسم</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="أدخل اسمك"
                placeholderTextColor="#999"
                textAlign="right"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="أدخل بريدك الإلكتروني"
                placeholderTextColor="#999"
                keyboardType="email-address"
                textAlign="right"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>كلمة المرور</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="أدخل كلمة المرور (6 أحرف على الأقل)"
                placeholderTextColor="#999"
                textAlign="right"
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              تطبيق بسيط وسهل لإدارة حضور وغياب الطلاب
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
    backgroundColor: '#f8f9fa',
    direction: 'rtl',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: fontFamilies.regular,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    direction: 'rtl',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  loginButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: fontFamilies.semibold,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
  },
});
