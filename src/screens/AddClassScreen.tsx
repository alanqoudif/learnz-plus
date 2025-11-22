import React, { useState, useEffect } from 'react';
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
import { useTheme } from '../context/ThemeContext';
import { Class } from '../types';
import { fontFamilies, spacing, borderRadius, shadows } from '../utils/theme';

interface AddClassScreenProps {
  navigation: any;
  route?: {
    params?: {
      classId?: string;
      editMode?: boolean;
      existingClass?: any;
    };
  };
}

export default function AddClassScreen({ navigation, route }: AddClassScreenProps) {
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { state, dispatch, createClass, updateClass } = useApp();
  const { colors } = useTheme();

  // التحقق من وضع التعديل
  const editMode = route?.params?.editMode || false;
  const existingClass = route?.params?.existingClass;

  // تحميل بيانات الفصل في وضع التعديل
  useEffect(() => {
    if (editMode && existingClass) {
      setClassName(existingClass.name);
      setSection(existingClass.section);
    }
  }, [editMode, existingClass]);

  const handleAddClass = async () => {
    if (!className.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الفصل');
      return;
    }

    if (!section.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال الشعبة');
      return;
    }

    if (!state.currentTeacher) {
      Alert.alert('خطأ', 'لم يتم العثور على بيانات المعلم');
      return;
    }

    // التحقق من عدم وجود فصل بنفس الاسم والشعبة (في وضع الإضافة فقط)
    if (!editMode) {
      const existingClass = state.classes.find(
        cls => cls.name === className.trim() && cls.section === section.trim()
      );

      if (existingClass) {
        Alert.alert('خطأ', 'يوجد بالفعل فصل بنفس الاسم والشعبة');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (editMode && existingClass) {
        // تحديث الفصل الموجود
        console.log('🔄 محاولة تحديث الفصل:', existingClass.id);
        await updateClass(existingClass.id, {
          name: className.trim(),
          section: section.trim(),
        });
        console.log('✅ تم تحديث الفصل بنجاح');
        Alert.alert(
          'تم بنجاح',
          'تم تحديث الفصل الدراسي بنجاح',
          [
            {
              text: 'موافق',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // إضافة فصل جديد
        console.log('🔄 محاولة إضافة فصل جديد:', className.trim());
        const newClass = await createClass({
          name: className.trim(),
          section: section.trim(),
          teacherId: state.currentTeacher.id,
        });
        console.log('✅ تم إضافة الفصل بنجاح:', newClass.id);
        Alert.alert(
          'تم بنجاح',
          'تم إضافة الفصل الدراسي بنجاح',
          [
            {
              text: 'موافق',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ خطأ في حفظ الفصل:', error);
      let errorMessage = editMode ? 'حدث خطأ أثناء تحديث الفصل' : 'حدث خطأ أثناء إضافة الفصل';
      
      if (error?.code === 'permission-denied' || error?.message?.includes('PERMISSION_DENIED')) {
        errorMessage = 'لا توجد صلاحية لحفظ البيانات. يرجى التحقق من إعدادات Firebase.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('خطأ', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = {
    container: { backgroundColor: colors.background.secondary },
    title: { color: colors.text.primary },
    subtitle: { color: colors.text.secondary },
    form: { backgroundColor: colors.background.primary },
    label: { color: colors.text.primary },
    input: { 
      backgroundColor: colors.background.secondary,
      borderColor: colors.border.medium,
      color: colors.text.primary
    },
    previewContainer: { backgroundColor: colors.background.secondary },
    previewLabel: { color: colors.text.secondary },
    previewText: { color: colors.text.primary },
    cancelButton: { backgroundColor: colors.secondary },
    addButton: { backgroundColor: colors.success },
    addButtonDisabled: { backgroundColor: colors.secondary, opacity: 0.6 },
    helpContainer: { backgroundColor: colors.background.primary },
    helpTitle: { color: colors.text.primary },
    helpText: { color: colors.text.secondary },
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, dynamicStyles.container]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, dynamicStyles.title]}>
              {editMode ? 'تعديل الفصل الدراسي' : 'إضافة فصل دراسي جديد'}
            </Text>
            <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
              {editMode ? 'عدّل تفاصيل الفصل الدراسي' : 'أدخل تفاصيل الفصل الدراسي'}
            </Text>
          </View>

          <View style={[styles.form, dynamicStyles.form]}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>اسم الفصل</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={className}
                onChangeText={setClassName}
                placeholder="مثال: الخامس، السادس، الأول"
                placeholderTextColor={colors.text.tertiary}
                textAlign="right"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, dynamicStyles.label]}>الشعبة</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={section}
                onChangeText={setSection}
                placeholder="مثال: أ، ب، ج، الأولى، الثانية"
                placeholderTextColor={colors.text.tertiary}
                textAlign="right"
                autoCapitalize="words"
              />
            </View>

            <View style={[styles.previewContainer, dynamicStyles.previewContainer]}>
              <Text style={[styles.previewLabel, dynamicStyles.previewLabel]}>معاينة:</Text>
              <Text style={[styles.previewText, dynamicStyles.previewText]}>
                {className.trim() && section.trim() 
                  ? `فصل ${className.trim()} - شعبة ${section.trim()}`
                  : 'سيظهر اسم الفصل هنا'
                }
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.cancelButton, dynamicStyles.cancelButton]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.addButton, 
                  dynamicStyles.addButton, 
                  isLoading && dynamicStyles.addButtonDisabled
                ]}
                onPress={handleAddClass}
                disabled={isLoading}
              >
                <Text style={styles.addButtonText}>
                  {isLoading 
                    ? (editMode ? 'جاري التحديث...' : 'جاري الإضافة...') 
                    : (editMode ? 'تحديث الفصل' : 'إضافة الفصل')
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.helpContainer, dynamicStyles.helpContainer]}>
            <Text style={[styles.helpTitle, dynamicStyles.helpTitle]}>نصائح:</Text>
            <Text style={[styles.helpText, dynamicStyles.helpText]}>
              • يمكنك إضافة عدة شعب لنفس الفصل (مثل: الخامس أ، الخامس ب)
            </Text>
            <Text style={[styles.helpText, dynamicStyles.helpText]}>
              • بعد إضافة الفصل، يمكنك إضافة الطلاب إليه
            </Text>
            <Text style={[styles.helpText, dynamicStyles.helpText]}>
              • يمكنك تسجيل الحضور والغياب للطلاب
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
    direction: 'rtl',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  title: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    textAlign: 'center',
  },
  form: {
    borderRadius: borderRadius.xl,
    padding: spacing['2xl'],
    ...shadows.md,
    marginBottom: spacing.xl,
    direction: 'rtl',
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: fontFamilies.regular,
  },
  previewContainer: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  previewLabel: {
    fontSize: 14,
    fontFamily: fontFamilies.semibold,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  previewText: {
    fontSize: 16,
    fontFamily: fontFamilies.medium,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    direction: 'rtl',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
  },
  addButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
  },
  helpContainer: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  helpTitle: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    marginBottom: spacing.md,
    textAlign: 'right',
  },
  helpText: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    lineHeight: 20,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
});
