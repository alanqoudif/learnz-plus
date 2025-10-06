import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import { fontFamilies } from '../utils/theme';
import { supabase } from '../config/supabase';

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
  const { state, dispatch, createStudent, deleteStudent } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Real-time listener for students in this class
  useEffect(() => {
    const studentsSubscription = supabase
      .channel(`students_class_${classId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'students',
          filter: `class_id=eq.${classId}`
        }, 
        (payload) => {
          console.log('Students change detected for class:', classId, payload);
          // The AppContext will handle updating the classes with new students
        }
      )
      .subscribe();

    return () => {
      studentsSubscription.unsubscribe();
    };
  }, [classId]);

  const currentClass = state.classes.find(cls => cls.id === classId);

  const handleAddStudent = async () => {
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
      
      setNewStudentName('');
      setShowAddModal(false);
      Alert.alert('تم بنجاح', 'تم إضافة الطالب بنجاح');
    } catch (error) {
      console.error('Error adding student:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إضافة الطالب');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
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
              Alert.alert('تم بنجاح', 'تم حذف الطالب بنجاح');
            } catch (error) {
              console.error('Error deleting student:', error);
              Alert.alert('خطأ', 'حدث خطأ أثناء حذف الطالب');
            }
          },
        },
      ]
    );
  };

  const renderStudentItem = ({ item, index }: { item: Student; index: number }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentNumber}>{index + 1}</Text>
        <Text style={styles.studentName}>{item.name}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteStudent(item.id, item.name)}
      >
        <Text style={styles.deleteButtonText}>حذف</Text>
      </TouchableOpacity>
    </View>
  );

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
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+ إضافة طالب</Text>
          </TouchableOpacity>
        </View>

        {currentClass.students.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={currentClass.students}
            renderItem={renderStudentItem}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.studentsList}
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
  addButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontFamily: fontFamilies.semibold,
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
});
