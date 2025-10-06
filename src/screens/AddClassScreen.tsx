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
import { Class } from '../types';
import { fontFamilies } from '../utils/theme';

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
        await updateClass(existingClass.id, {
          name: className.trim(),
          section: section.trim(),
        });
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
        const newClass = await createClass({
          name: className.trim(),
          section: section.trim(),
          teacherId: state.currentTeacher.id,
        });
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
    } catch (error) {
      console.error('Error saving class:', error);
      Alert.alert('خطأ', editMode ? 'حدث خطأ أثناء تحديث الفصل' : 'حدث خطأ أثناء إضافة الفصل');
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
            <Text style={styles.title}>
              {editMode ? 'تعديل الفصل الدراسي' : 'إضافة فصل دراسي جديد'}
            </Text>
            <Text style={styles.subtitle}>
              {editMode ? 'عدّل تفاصيل الفصل الدراسي' : 'أدخل تفاصيل الفصل الدراسي'}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>اسم الفصل</Text>
              <TextInput
                style={styles.input}
                value={className}
                onChangeText={setClassName}
                placeholder="مثال: الخامس، السادس، الأول"
                placeholderTextColor="#999"
                textAlign="right"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>الشعبة</Text>
              <TextInput
                style={styles.input}
                value={section}
                onChangeText={setSection}
                placeholder="مثال: أ، ب، ج، الأولى، الثانية"
                placeholderTextColor="#999"
                textAlign="right"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>معاينة:</Text>
              <Text style={styles.previewText}>
                {className.trim() && section.trim() 
                  ? `فصل ${className.trim()} - شعبة ${section.trim()}`
                  : 'سيظهر اسم الفصل هنا'
                }
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.addButton, isLoading && styles.addButtonDisabled]}
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

          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>نصائح:</Text>
            <Text style={styles.helpText}>
              • يمكنك إضافة عدة شعب لنفس الفصل (مثل: الخامس أ، الخامس ب)
            </Text>
            <Text style={styles.helpText}>
              • بعد إضافة الفصل، يمكنك إضافة الطلاب إليه
            </Text>
            <Text style={styles.helpText}>
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
    backgroundColor: '#f8f9fa',
    direction: 'rtl',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
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
    marginBottom: 20,
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
  previewContainer: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 14,
    fontFamily: fontFamilies.semibold,
    color: '#495057',
    marginBottom: 8,
    textAlign: 'right',
  },
  previewText: {
    fontSize: 16,
    fontFamily: fontFamilies.medium,
    color: '#2c3e50',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    direction: 'rtl',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginLeft: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
  },
  helpContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  helpTitle: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'right',
  },
  helpText: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
    lineHeight: 20,
    marginBottom: 8,
    textAlign: 'right',
  },
});
