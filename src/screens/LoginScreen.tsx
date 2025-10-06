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
import { supabase } from '../config/supabase';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { dispatch } = useApp();

  const handleLogin = async () => {
    // التحقق من صحة البيانات
    if (!name.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم الهاتف');
      return;
    }

    if (!validateName(name)) {
      Alert.alert('خطأ', 'يرجى إدخال اسم صحيح (حروف فقط)');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert('خطأ', 'يرجى إدخال رقم هاتف صحيح (8 أرقام على الأقل)');
      return;
    }

    setIsLoading(true);

    try {
      const formattedPhone = phoneNumber.replace(/\s/g, '');
      const formattedName = formatName(name);

      // استخدام Supabase Auth للتسجيل/تسجيل الدخول
      // إنشاء إيميل وهمي من رقم الهاتف (مخفي من المستخدم)
      const email = `${formattedPhone}@teacher.local`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'default123', // كلمة مرور افتراضية
      });

      if (error) {
        // إذا فشل تسجيل الدخول، جرب التسجيل
        if (error.message.includes('Invalid login credentials') || error.message.includes('User not found')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: 'default123',
            options: {
              data: {
                name: formattedName,
                phone_number: formattedPhone,
              }
            }
          });

          if (signUpError) {
            console.error('Sign up error:', signUpError);
            throw signUpError;
          }

          // إنشاء معلم في جدول المعلمين
          const teacher: Teacher = {
            id: signUpData.user!.id,
            name: formattedName,
            phoneNumber: formattedPhone,
            createdAt: new Date(),
          };

          // حفظ بيانات المعلم في Context
          dispatch({ type: 'SET_TEACHER', payload: teacher });
        } else {
          console.error('Login error:', error);
          throw error;
        }
      } else {
        // تسجيل الدخول نجح
        const teacher: Teacher = {
          id: data.user.id,
          name: formattedName,
          phoneNumber: formattedPhone,
          createdAt: new Date(data.user.created_at),
        };

        // حفظ بيانات المعلم في Context
        dispatch({ type: 'SET_TEACHER', payload: teacher });
      }
      
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      Alert.alert('خطأ', `حدث خطأ أثناء تسجيل الدخول: ${errorMessage}`);
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
              <Text style={styles.label}>رقم الهاتف</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="أدخل رقم هاتفك (8 أرقام على الأقل)"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                textAlign="right"
                maxLength={15}
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
