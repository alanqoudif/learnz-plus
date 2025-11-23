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
  RefreshControl,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Student } from '../types';
import { fontFamilies, shadows, borderRadius, spacing, colors as baseColors } from '../utils/theme';
import StudentItem from '../components/StudentItem';
import { StudentListSkeleton } from '../components/SkeletonLoader';
import { lightHaptic, mediumHaptic, successHaptic } from '../utils/haptics';
import { ocrService, type SheetFileInput } from '../services/ocrService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildSheetFilesFromAssets, fallbackNameFromUri } from '../utils/sheetUpload';

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
  const { state, createStudent, deleteStudent, refreshData } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [extractedStudents, setExtractedStudents] = useState<Array<{ number: string; name: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Real-time updates are handled by Firebase through AppContext
  // No need for additional listeners here

  const currentClass = state.classes.find(cls => cls.id === classId);
  const userProfile = (state as any)?.userProfile;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    lightHaptic();
    await refreshData();
    setIsRefreshing(false);
  }, [refreshData]);

  const handleAddStudent = useCallback(async () => {
    if (!newStudentName.trim()) {
      lightHaptic();
      Alert.alert('يرجى إدخال اسم الطالب', '', [{ text: 'حسناً' }]);
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
      lightHaptic();
      Alert.alert('يوجد بالفعل طالب بنفس الاسم', '', [{ text: 'حسناً' }]);
      return;
    }

    setIsLoading(true);
    lightHaptic();

    try {
      console.log('🔄 محاولة إضافة طالب جديد:', newStudentName.trim());
      const newStudent = await createStudent({
        name: newStudentName.trim(),
        classId: classId,
      });

      console.log('✅ تم إضافة الطالب بنجاح:', newStudent.id);
      successHaptic();
      const addedName = newStudentName.trim();
      setNewStudentName('');
      setShowAddModal(false);
      // إظهار رسالة نجاح بسيطة بدون Alert
      setTimeout(() => {
        // يمكن إضافة toast message هنا لاحقاً
      }, 100);
    } catch (error: any) {
      console.error('❌ خطأ في إضافة الطالب:', error);
      let errorMessage = 'حدث خطأ أثناء إضافة الطالب';

      if (error?.code === 'permission-denied' || error?.message?.includes('PERMISSION_DENIED')) {
        errorMessage = 'لا توجد صلاحية لحفظ البيانات. يرجى التحقق من إعدادات Firebase.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Alert.alert('خطأ', errorMessage);
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

  const pickSheets = async () => {
    lightHaptic();
    
    if (Platform.OS === 'ios') {
      // استخدام ActionSheet على iOS لتجربة أفضل
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['إلغاء', 'الكاميرا', 'الألبوم'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await handleCameraPick();
          } else if (buttonIndex === 2) {
            await handleGalleryPick();
          }
        }
      );
    } else {
      // استخدام Alert على Android
      Alert.alert(
        'اختر المصدر',
        '',
        [
          {
            text: 'إلغاء',
            style: 'cancel',
          },
          {
            text: 'الكاميرا',
            onPress: handleCameraPick,
          },
          {
            text: 'الألبوم',
            onPress: handleGalleryPick,
          },
        ]
      );
    }
  };

  const handleCameraPick = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('صلاحيات مطلوبة', 'يرجى منح إذن الوصول للكاميرا لالتقاط صورة كشف الحضور.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 0.8, // تقليل الجودة قليلاً لتسريع المعالجة
        allowsEditing: false,
      });

      if (result.canceled) {
        return;
      }

      const files = buildSheetFilesFromAssets(result.assets || []);
      if (!files.length) {
        Alert.alert('خطأ', 'لم يتم التقاط أي صورة.');
        return;
      }

      await processSheetsWithOCR(files);
    } catch (error) {
      console.error('Error taking photo with camera:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء التقاط الصورة بالكاميرا.');
    }
  };

  const handleGalleryPick = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('صلاحيات مطلوبة', 'يرجى منح إذن الوصول إلى ألبوم الصور لاختيار الكشف.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: 'images',
        selectionLimit: 10,
        quality: 0.8, // تقليل الجودة قليلاً لتسريع المعالجة
      });

      if (result.canceled) {
        return;
      }

      const files = buildSheetFilesFromAssets(result.assets || []);
      if (!files.length) {
        Alert.alert('خطأ', 'لم يتم اختيار أي صورة من الألبوم.');
        return;
      }

      await processSheetsWithOCR(files);
    } catch (error) {
      console.error('Error picking images from gallery:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء اختيار الصور من ألبوم الجهاز.');
    }
  };

  const processSheetsWithOCR = async (files: SheetFileInput[]) => {
    if (!files.length) {
      Alert.alert('خطأ', 'لم يتم اختيار أي ملف.');
      return;
    }

    setSelectedSheets(files.map(file => file.name || fallbackNameFromUri(file.uri)));
    try {
      setIsProcessing(true);
      const parsedStudents = await ocrService.processSheets(files);

      if (!parsedStudents.length) {
        Alert.alert(
          'لم يتم اكتشاف طلاب',
          'تأكد من أن الشيت يحتوي على أرقام وأسماء واضحة.'
        );
        return;
      }

      const formatted = parsedStudents.map((student, index) => ({
        number: `${index + 1}`,
        name: student.name.trim(),
      }));

      setExtractedStudents(formatted);
      setShowExtractModal(true);
    } catch (error: any) {
      console.error('Error processing roster image:', error);
      let errorMessage = error?.message || 'تأكد من وضوح الصور ثم حاول مرة أخرى.';
      
      // رسائل خطأ أكثر وضوحاً
      if (errorMessage.includes('مفتاح OpenAI API') || errorMessage.includes('API key')) {
        errorMessage = 'لم يتم إعداد مفتاح OpenAI API.\n\nيرجى إضافة EXPO_PUBLIC_OPENAI_API_KEY في ملف .env ثم إعادة تشغيل التطبيق.';
      } else if (errorMessage.includes('فشل معالجة الصورة')) {
        errorMessage = 'فشل معالجة الصورة. تأكد من:\n• وضوح الصورة وجودتها\n• وجود نص قابل للقراءة في الصورة\n• اتصال الإنترنت يعمل';
      }
      
      Alert.alert(
        'خطأ في معالجة الملفات',
        errorMessage
      );
    } finally {
      setIsProcessing(false);
    }
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

      setShowExtractModal(false);
      setSelectedSheets([]);
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
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.errorText}>لم يتم العثور على الفصل الدراسي</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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

      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            قائمة الطلاب ({currentClass.students.length})
          </Text>
        </View>
        
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.addButton]}
            onPress={() => {
              lightHaptic();
              setShowAddModal(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={20} color="white" />
            <Text style={styles.addButtonText}>إضافة طالب</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.imageButton]}
            onPress={pickSheets}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="document-text-outline" size={20} color="white" />
            )}
            <Text style={styles.imageButtonText}>
              {isProcessing ? 'جاري المعالجة...' : 'قراءة من الشيت'}
            </Text>
          </TouchableOpacity>
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

      {/* Modal لإضافة طالب جديد - محسّن */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowAddModal(false);
          setNewStudentName('');
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowAddModal(false);
            setNewStudentName('');
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إضافة طالب جديد</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowAddModal(false);
                  setNewStudentName('');
                }}
              >
                <Ionicons name="close" size={24} color={colors.text?.secondary || '#6c757d'} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { borderColor: colors.border?.light || '#e0e0e0', backgroundColor: colors.background?.secondary || '#f8f9fa', color: colors.text?.primary || '#2c3e50' }]}
                value={newStudentName}
                onChangeText={setNewStudentName}
                placeholder="أدخل اسم الطالب"
                placeholderTextColor={colors.text?.tertiary || '#999'}
                textAlign="right"
                autoCapitalize="words"
                autoFocus={true}
                returnKeyType="done"
                onSubmitEditing={handleAddStudent}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalAddButton, (isLoading || !newStudentName.trim()) && styles.modalAddButtonDisabled]}
              onPress={handleAddStudent}
              disabled={isLoading || !newStudentName.trim()}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.modalAddButtonText}>إضافة</Text>
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal للطلاب المستخرجين من الملفات */}
      <Modal
        visible={showExtractModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowExtractModal(false);
          setSelectedSheets([]);
          setExtractedStudents([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.imageModalContent]}>
            <Text style={styles.modalTitle}>الطلاب المستخرجين من الملفات</Text>

            {selectedSheets.length > 0 && (
              <View style={styles.selectedSheetsList}>
                {selectedSheets.map((file, idx) => (
                  <Text key={`${file}-${idx}`} style={styles.fileLabel}>
                    • {file}
                  </Text>
                ))}
              </View>
            )}

            <Text style={styles.extractedCountText}>
              تم استخراج {extractedStudents.length} طالب
            </Text>

            <ScrollView style={styles.extractedStudentsList} showsVerticalScrollIndicator={true}>
              {extractedStudents.map((student, index) => (
                <View key={index} style={styles.extractedStudentItem}>
                  <View style={styles.extractedStudentInfo}>
                    <Text style={styles.extractedStudentNumber}>{student.number}</Text>
                    <TextInput
                      value={student.name}
                      onChangeText={(text) => {
                        const updated = [...extractedStudents];
                        updated[index].name = text;
                        setExtractedStudents(updated);
                      }}
                      style={styles.extractedStudentNameInput}
                      placeholder="اضغط لتعديل الاسم"
                      placeholderTextColor={colors.text.tertiary}
                      selectTextOnFocus={true}
                    />
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
                  setShowExtractModal(false);
                  setSelectedSheets([]);
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    ...shadows.sm,
  },
  addButton: {
    backgroundColor: '#1d72e5',
  },
  addButtonText: {
    color: 'white',
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
  },
  imageButton: {
    backgroundColor: baseColors.primary,
  },
  imageButtonText: {
    color: 'white',
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
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
    backgroundColor: baseColors.danger,
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
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    fontFamily: fontFamilies.regular,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
    textAlign: 'right',
    minHeight: 56,
  },
  modalAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: baseColors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    ...shadows.sm,
  },
  modalAddButtonDisabled: {
    backgroundColor: '#c0c0c0',
    opacity: 0.6,
  },
  modalAddButtonText: {
    color: 'white',
    fontFamily: fontFamilies.bold,
    fontSize: 16,
  },
  imageModalContent: {
    maxHeight: '90%',
  },
  selectedSheetsList: {
    marginBottom: 12,
  },
  fileLabel: {
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
    textAlign: 'right',
    marginBottom: 4,
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
    color: baseColors.primary,
    marginRight: 12,
    minWidth: 30,
  },
  extractedStudentNameInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: '#2c3e50',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 6,
    backgroundColor: '#fff',
    minHeight: 36,
  },
  extractedStudentName: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: '#2c3e50',
    flex: 1,
  },
  removeExtractedButton: {
    backgroundColor: baseColors.danger,
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
