import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import { colors, fontFamilies, shadows, borderRadius, spacing } from '../utils/theme';
import StudentItem from '../components/StudentItem';
import { StudentListSkeleton } from '../components/SkeletonLoader';
import { lightHaptic, mediumHaptic, successHaptic } from '../utils/haptics';

interface StudentManagementScreenProps {
  navigation: any;
  route: {
    params: {
      classId: string;
    };
  };
}

export default function StudentManagementScreen({ navigation, route }: StudentManagementScreenProps) {
  const { classId } = route.params;
  const { state, dispatch, createStudent, deleteStudent, refreshData } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [extractedStudents, setExtractedStudents] = useState<Array<{ number: string; name: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Real-time updates are handled by Firebase through AppContext
  // No need for additional listeners here

  const currentClass = state.classes.find(cls => cls.id === classId);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    lightHaptic();
    await refreshData();
    setIsRefreshing(false);
  }, [refreshData]);

  const handleAddStudent = useCallback(async () => {
    if (!newStudentName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم الطالب');
      return;
    }

    if (!currentClass) {
      Alert.alert('خطأ', 'لم يتم العثور على الفصل الدراسي');
      return;
    }

    // التحقق من عدم وجود طالب بنفس الاسم
    const existingStudent = currentClass.students.find(
      student => student.name.toLowerCase() === newStudentName.trim().toLowerCase()
    );

    if (existingStudent) {
      Alert.alert('خطأ', 'يوجد بالفعل طالب بنفس الاسم');
      return;
    }

    setIsLoading(true);

    try {
      const newStudent = await createStudent({
        name: newStudentName.trim(),
        classId: classId,
      });
      
      successHaptic();
      setNewStudentName('');
      setShowAddModal(false);
      Alert.alert('تم بنجاح', 'تم إضافة الطالب بنجاح');
    } catch (error) {
      console.error('Error adding student:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إضافة الطالب');
    } finally {
      setIsLoading(false);
    }
  }, [newStudentName, currentClass, createStudent, classId]);

  const handleDeleteStudent = useCallback((studentId: string, studentName: string) => {
    mediumHaptic();
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف الطالب "${studentName}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStudent(studentId);
              successHaptic();
              Alert.alert('تم بنجاح', 'تم حذف الطالب بنجاح');
            } catch (error) {
              console.error('Error deleting student:', error);
              Alert.alert('خطأ', 'حدث خطأ أثناء حذف الطالب');
            }
          },
        },
      ]
    );
  }, [deleteStudent]);

  const pickImage = async () => {
    try {
      // طلب صلاحية الوصول للصور
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('خطأ', 'نحتاج إلى صلاحية الوصول للصور');
        return;
      }

      // اختيار الصورة
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setIsProcessing(true);
        await processImageWithOCR(result.assets[0].base64 || '');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء اختيار الصورة');
    }
  };

  const processImageWithOCR = async (base64Image: string) => {
    try {
      // استخدام OpenAI GPT-4 Vision API لقراءة النص العربي بدقة عالية
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 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',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `هذه صورة تحتوي على قائمة بأسماء الطلاب مع أرقامهم. 
                  
يرجى استخراج الأسماء والأرقام بالتنسيق التالي بالضبط (كل سطر يحتوي على رقم ثم نقطة ثم اسم الطالب):

مثال:
1. أحمد محمد علي
2. فاطمة حسن أحمد
3. محمد علي حسين

مهم جداً:
- اكتب الأسماء كما هي في الصورة تماماً
- كل طالب في سطر منفصل
- ابدأ كل سطر بالرقم ثم نقطة ثم مسافة ثم الاسم
- لا تضف أي تعليقات أو شروحات، فقط القائمة
- إذا كانت الأرقام عربية (١، ٢، ٣) حولها إلى إنجليزية (1، 2، 3)
- حافظ على ترتيب الأرقام كما هو في الصورة`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('OpenAI Response:', JSON.stringify(result, null, 2));
      
      if (result.choices && result.choices[0] && result.choices[0].message) {
        const text = result.choices[0].message.content;
        console.log('Extracted text:', text);
        
        if (text && text.trim()) {
          parseStudentsFromText(text);
        } else {
          // لم يتم العثور على نص
          Alert.alert(
            'لم يتم العثور على قائمة',
            'لم نتمكن من العثور على قائمة طلاب في الصورة.\n\nتأكد من أن الصورة تحتوي على:\n• أرقام وأسماء واضحة\n• نص عربي مقروء\n• إضاءة جيدة وخط واضح',
            [
              {
                text: 'إعادة المحاولة',
                onPress: () => {
                  setIsProcessing(false);
                  pickImage();
                }
              },
              {
                text: 'حسناً',
                onPress: () => setIsProcessing(false)
              }
            ]
          );
        }
      } else {
        // خطأ في الاستجابة
        Alert.alert(
          'خطأ في قراءة الصورة',
          'حدث خطأ غير متوقع أثناء معالجة الصورة. يرجى المحاولة مرة أخرى بصورة أوضح.',
          [
            {
              text: 'حسناً',
              onPress: () => setIsProcessing(false)
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Error processing image:', error);
      
      let errorMessage = 'حدث خطأ أثناء معالجة الصورة.';
      
      if (error.message?.includes('401')) {
        errorMessage = 'خطأ في مفتاح API. يرجى التحقق من صلاحية المفتاح.';
      } else if (error.message?.includes('429')) {
        errorMessage = 'تم تجاوز حد الاستخدام. يرجى المحاولة لاحقاً.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'خطأ في الاتصال بالإنترنت. تحقق من اتصالك.';
      }
      
      Alert.alert(
        'خطأ في المعالجة',
        errorMessage + '\n\nيرجى المحاولة مرة أخرى أو استخدام الإضافة اليدوية.',
        [
          {
            text: 'حسناً',
            onPress: () => setIsProcessing(false)
          }
        ]
      );
    }
  };

  const parseStudentsFromText = (text: string) => {
    try {
      // تقسيم النص إلى أسطر
      const lines = text.split('\n').filter(line => line.trim());
      const students: Array<{ number: string; name: string }> = [];

      // البحث عن نمط: رقم متبوع باسم
      // مثال: "1. أحمد محمد" أو "1 - أحمد محمد" أو "١. أحمد محمد"
      lines.forEach((line) => {
        // محاولة استخراج الرقم والاسم
        // نمط 1: رقم. اسم
        let match = line.match(/^(\d+|[٠-٩]+)[\.\-\s:)]+(.+)$/);
        
        if (match) {
          const number = convertArabicNumbersToEnglish(match[1].trim());
          const name = match[2].trim();
          
          if (name && name.length > 1) {
            students.push({ number, name });
          }
        }
      });

      if (students.length > 0) {
        // ترتيب الطلاب حسب الرقم
        students.sort((a, b) => parseInt(a.number) - parseInt(b.number));
        setExtractedStudents(students);
        setShowImageModal(true);
      } else {
        Alert.alert(
          'تنبيه',
          'لم نتمكن من استخراج أسماء الطلاب تلقائياً. تأكد من أن الصورة تحتوي على قائمة بالأرقام والأسماء.'
        );
      }
    } catch (error) {
      console.error('Error parsing students:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحليل البيانات');
    } finally {
      setIsProcessing(false);
    }
  };

  const convertArabicNumbersToEnglish = (num: string): string => {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    
    let result = num;
    for (let i = 0; i < 10; i++) {
      result = result.replace(new RegExp(arabicNumbers[i], 'g'), englishNumbers[i]);
    }
    return result;
  };

  const handleAddExtractedStudents = async () => {
    if (!currentClass) return;

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const student of extractedStudents) {
        try {
          // التحقق من عدم وجود طالب بنفس الاسم
          const existingStudent = currentClass.students.find(
            s => s.name.toLowerCase() === student.name.toLowerCase()
          );

          if (!existingStudent) {
            await createStudent({
              name: student.name,
              classId: classId,
            });
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error('Error adding student:', student.name, error);
          errorCount++;
        }
      }

      setShowImageModal(false);
      setSelectedImage(null);
      setExtractedStudents([]);

      if (successCount > 0) {
        Alert.alert(
          'تم بنجاح',
          `تم إضافة ${successCount} طالب بنجاح${errorCount > 0 ? `\nتخطي ${errorCount} طالب (موجود مسبقاً أو خطأ)` : ''}`
        );
      } else {
        Alert.alert('تنبيه', 'لم يتم إضافة أي طالب (جميع الأسماء موجودة مسبقاً)');
      }
    } catch (error) {
      console.error('Error adding students:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إضافة الطلاب');
    } finally {
      setIsLoading(false);
    }
  };

  const removeExtractedStudent = (index: number) => {
    setExtractedStudents(prev => prev.filter((_, i) => i !== index));
  };

  const renderStudentItem = useCallback(({ item, index }: { item: Student; index: number }) => (
    <StudentItem
      student={item}
      index={index}
      onDelete={handleDeleteStudent}
    />
  ), [handleDeleteStudent]);

  const keyExtractor = useCallback((item: Student, index: number) => `student-${item.id}-${index}`, []);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>لا يوجد طلاب</Text>
      <Text style={styles.emptyStateSubtitle}>
        ابدأ بإضافة الطلاب إلى هذا الفصل
      </Text>
    </View>
  );

  if (!currentClass) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>لم يتم العثور على الفصل الدراسي</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← رجوع</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>إدارة الطلاب</Text>
          <Text style={styles.headerSubtitle}>
            {currentClass.name} - شعبة {currentClass.section}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            قائمة الطلاب ({currentClass.students.length})
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.imageButton, isProcessing && styles.imageButtonDisabled]}
              onPress={pickImage}
              disabled={isProcessing}
            >
              <View style={styles.imageButtonContent}>
                <Ionicons
                  name={isProcessing ? 'time-outline' : 'image-outline'}
                  size={18}
                  color="#ffffff"
                  style={styles.imageButtonIcon}
                />
                <Text style={styles.imageButtonText}>
                  {isProcessing ? 'جاري المعالجة...' : 'رفع صورة'}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addButtonText}>+ إضافة طالب</Text>
            </TouchableOpacity>
          </View>
        </View>

        {state.isLoading ? (
          <StudentListSkeleton />
        ) : currentClass.students.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={currentClass.students}
            renderItem={renderStudentItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.studentsList}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            // Performance optimizations
            windowSize={5}
            maxToRenderPerBatch={10}
            removeClippedSubviews={true}
            initialNumToRender={15}
            updateCellsBatchingPeriod={50}
          />
        )}
      </View>

      {/* Modal لإضافة طالب جديد */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>إضافة طالب جديد</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>اسم الطالب</Text>
              <TextInput
                style={styles.input}
                value={newStudentName}
                onChangeText={setNewStudentName}
                placeholder="أدخل اسم الطالب"
                placeholderTextColor="#999"
                textAlign="right"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setNewStudentName('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalAddButton, isLoading && styles.modalAddButtonDisabled]}
                onPress={handleAddStudent}
                disabled={isLoading}
              >
                <Text style={styles.modalAddButtonText}>
                  {isLoading ? 'جاري الإضافة...' : 'إضافة'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal للطلاب المستخرجين من الصورة */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowImageModal(false);
          setSelectedImage(null);
          setExtractedStudents([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.imageModalContent]}>
            <Text style={styles.modalTitle}>الطلاب المستخرجين من الصورة</Text>
            
            {selectedImage && (
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}

            <Text style={styles.extractedCountText}>
              تم استخراج {extractedStudents.length} طالب
            </Text>

            <ScrollView style={styles.extractedStudentsList} showsVerticalScrollIndicator={true}>
              {extractedStudents.map((student, index) => (
                <View key={index} style={styles.extractedStudentItem}>
                  <View style={styles.extractedStudentInfo}>
                    <Text style={styles.extractedStudentNumber}>{student.number}</Text>
                    <Text style={styles.extractedStudentName}>{student.name}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeExtractedStudent(index)}
                    style={styles.removeExtractedButton}
                  >
                    <Text style={styles.removeExtractedButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowImageModal(false);
                  setSelectedImage(null);
                  setExtractedStudents([]);
                }}
              >
                <Text style={styles.modalCancelButtonText}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalAddButton, (isLoading || extractedStudents.length === 0) && styles.modalAddButtonDisabled]}
                onPress={handleAddExtractedStudents}
                disabled={isLoading || extractedStudents.length === 0}
              >
                <Text style={styles.modalAddButtonText}>
                  {isLoading ? 'جاري الإضافة...' : `إضافة ${extractedStudents.length} طالب`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    direction: 'rtl',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  imageButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  imageButtonDisabled: {
    opacity: 0.75,
  },
  imageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageButtonIcon: {
    marginRight: 6,
  },
  imageButtonText: {
    color: 'white',
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  studentsList: {
    paddingBottom: 20,
  },
  studentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    direction: 'rtl',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentNumber: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    color: '#6c757d',
    marginRight: 12,
    minWidth: 30,
  },
  studentName: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: '#2c3e50',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontFamily: fontFamilies.semibold,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    color: '#6c757d',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    direction: 'rtl',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: 'white',
    fontFamily: fontFamilies.semibold,
  },
  modalAddButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  modalAddButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  modalAddButtonText: {
    color: 'white',
    fontFamily: fontFamilies.semibold,
  },
  imageModalContent: {
    maxHeight: '90%',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  extractedCountText: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 12,
  },
  extractedStudentsList: {
    maxHeight: 250,
    marginBottom: 16,
  },
  extractedStudentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    direction: 'rtl',
  },
  extractedStudentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  extractedStudentNumber: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    color: '#007bff',
    marginRight: 12,
    minWidth: 30,
  },
  extractedStudentName: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: '#2c3e50',
    flex: 1,
  },
  removeExtractedButton: {
    backgroundColor: '#dc3545',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeExtractedButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
