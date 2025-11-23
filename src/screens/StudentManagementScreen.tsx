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
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Student } from '../types';
import { fontFamilies, shadows, borderRadius, spacing, colors as baseColors } from '../utils/theme';
import StudentItem from '../components/StudentItem';
import { StudentListSkeleton } from '../components/SkeletonLoader';
import { lightHaptic, mediumHaptic, successHaptic } from '../utils/haptics';
import { ocrService } from '../services/ocrService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
      console.log('🔄 محاولة إضافة طالب جديد:', newStudentName.trim());
      const newStudent = await createStudent({
        name: newStudentName.trim(),
        classId: classId,
      });

      console.log('✅ تم إضافة الطالب بنجاح:', newStudent.id);
      successHaptic();
      setNewStudentName('');
      setShowAddModal(false);
      Alert.alert('تم بنجاح', 'تم إضافة الطالب بنجاح');
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
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const assets = 'assets' in result && Array.isArray(result.assets)
        ? result.assets
        : (result as any).assets
          ? (result as any).assets
          : [(result as any)];

      const uris = assets.map((item: any) => item.uri).filter(Boolean);
      if (!uris.length) {
        Alert.alert('خطأ', 'لم يتم اختيار أي ملف.');
        return;
      }

      setSelectedSheets(assets.map((item: any) => item.name || item.uri?.split('/').pop() || 'ملف بدون اسم'));
      await processSheetsWithOCR(uris);
    } catch (error) {
      console.error('Error picking sheets:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء اختيار الملفات');
    }
  };

  const processSheetsWithOCR = async (uris: string[]) => {
    try {
      setIsProcessing(true);
      const parsedStudents = await ocrService.processSheets(uris);

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
      Alert.alert(
        'خطأ في معالجة الملفات',
        error?.message || 'تأكد من وضوح الصور ثم حاول مرة أخرى.'
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
          <View style={styles.headerButtons}>
            <TouchableOpacity
                style={styles.imageButton}
                onPress={pickSheets}
                disabled={isProcessing}
              >
                <Text style={styles.imageButtonText}>
                  {isProcessing ? 'جاري المعالجة...' : 'رفع ملفات الطلاب (OCR)'}
                </Text>
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
    backgroundColor: baseColors.primary,
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
    backgroundColor: baseColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
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
    backgroundColor: baseColors.text.secondary,
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
    backgroundColor: baseColors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  modalAddButtonDisabled: {
    backgroundColor: baseColors.text.secondary,
  },
  modalAddButtonText: {
    color: 'white',
    fontFamily: fontFamilies.semibold,
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
