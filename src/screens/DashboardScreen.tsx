import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Class } from '../types';
import { fontFamilies } from '../utils/theme';
import { supabase } from '../config/supabase';

interface DashboardScreenProps {
  navigation: any;
}

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { state, dispatch, deleteClass } = useApp();
  const { currentTeacher, classes, isLoading } = state;

  const handleAddClass = () => {
    navigation.navigate('AddClass');
  };

  const handleClassPress = (classItem: Class) => {
    // يمكن إضافة شاشة تفاصيل الفصل لاحقاً
    console.log('Class pressed:', classItem.id);
  };

  const handleDeleteClass = (classId: string, className: string) => {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من حذف الفصل "${className}"؟ سيتم حذف جميع الطلاب وسجلات الحضور المرتبطة به.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClass(classId);
              Alert.alert('تم بنجاح', 'تم حذف الفصل الدراسي بنجاح');
            } catch (error) {
              console.error('Error deleting class:', error);
              Alert.alert('خطأ', 'حدث خطأ أثناء حذف الفصل');
            }
          },
        },
      ]
    );
  };

  const renderClassItem = ({ item }: { item: Class }) => (
    <TouchableOpacity
      style={styles.classCard}
      onPress={() => handleClassPress(item)}
      onLongPress={() => handleDeleteClass(item.id, `${item.name} ${item.section}`)}
    >
      <View style={styles.classHeader}>
        <Text style={styles.className}>{item.name}</Text>
        <Text style={styles.classSection}>شعبة {item.section}</Text>
      </View>
      <View style={styles.classInfo}>
        <Text style={styles.studentCount}>
          عدد الطلاب: {item.students.length}
        </Text>
        <Text style={styles.classDate}>
          تم الإنشاء: {new Date(item.createdAt).toLocaleDateString('en-US')}
        </Text>
      </View>
      <View style={styles.classActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('StudentManagement', { classId: item.id })}
        >
          <Text style={styles.actionButtonText}>إدارة الطلاب</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.attendanceButton]}
          onPress={() => navigation.navigate('Attendance', { classId: item.id })}
        >
          <Text style={[styles.actionButtonText, styles.attendanceButtonText]}>
            تسجيل الحضور
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.historyButton}
        onPress={() => navigation.navigate('AttendanceHistory', { classId: item.id })}
      >
        <Text style={styles.historyButtonText}>عرض تاريخ الحضور</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>لا توجد فصول دراسية</Text>
      <Text style={styles.emptyStateSubtitle}>
        ابدأ بإضافة فصل دراسي جديد لإدارة حضور وغياب الطلاب
      </Text>
      <TouchableOpacity style={styles.addFirstClassButton} onPress={handleAddClass}>
        <Text style={styles.addFirstClassButtonText}>إضافة فصل دراسي</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>مرحباً</Text>
          <Text style={styles.teacherName}>{currentTeacher?.name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={() => {
          Alert.alert(
            'تسجيل الخروج',
            'هل أنت متأكد من تسجيل الخروج؟',
            [
              { text: 'إلغاء', style: 'cancel' },
              {
                text: 'تسجيل الخروج',
                style: 'destructive',
                onPress: async () => {
                  await supabase.auth.signOut();
                  // سيتم الانتقال تلقائياً عند تحديث state.currentTeacher
                },
              },
            ]
          );
        }}>
          <Text style={styles.logoutButtonText}>خروج</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>الفصول الدراسية</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.addButton} onPress={handleAddClass}>
              <Text style={styles.addButtonText}>+ إضافة فصل</Text>
            </TouchableOpacity>
          </View>
        </View>

        {classes.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={classes}
            renderItem={renderClassItem}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.classesList}
          />
        )}
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  welcomeText: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
  },
  teacherName: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: 'white',
    fontFamily: fontFamilies.semibold,
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
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
  classesList: {
    paddingBottom: 20,
  },
  classCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  className: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
  },
  classSection: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
  },
  classInfo: {
    marginBottom: 12,
  },
  studentCount: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: '#495057',
    marginBottom: 4,
  },
  classDate: {
    fontSize: 12,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
  },
  classActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    direction: 'rtl',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  attendanceButton: {
    backgroundColor: '#007bff',
  },
  actionButtonText: {
    color: 'white',
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  attendanceButtonText: {
    color: 'white',
  },
  historyButton: {
    backgroundColor: '#17a2b8',
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  historyButtonText: {
    color: 'white',
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
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
    marginBottom: 30,
  },
  addFirstClassButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstClassButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
  },
});
