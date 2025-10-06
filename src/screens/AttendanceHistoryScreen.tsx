import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { AttendanceSession } from '../types';
import { fontFamilies } from '../utils/theme';
import { RealtimeService } from '../services/realtimeService';
import RealtimeStatus from '../components/RealtimeStatus';

interface AttendanceHistoryScreenProps {
  navigation: any;
  route: {
    params: {
      classId: string;
    };
  };
}

export default function AttendanceHistoryScreen({ navigation, route }: AttendanceHistoryScreenProps) {
  const { classId } = route.params;
  const { state } = useApp();
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);

  const currentClass = state.classes.find(cls => cls.id === classId);
  const classSessions = state.attendanceSessions
    .filter(session => session.classId === classId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Real-time listener for attendance changes in this class
  useEffect(() => {
    console.log('Setting up realtime listener for attendance history, class:', classId);
    
    const attendanceSubscription = RealtimeService.subscribeToClassAttendance(
      classId,
      (payload) => {
        console.log('📅 Attendance change detected in history:', payload.eventType);
        // البيانات ستتحدث تلقائياً من خلال AppContext
      }
    );

    return () => {
      console.log('Cleaning up attendance history realtime listener for class:', classId);
      attendanceSubscription.unsubscribe();
    };
  }, [classId]);

  const getAttendanceStats = (session: AttendanceSession) => {
    const presentCount = session.records.filter(r => r.status === 'present').length;
    const absentCount = session.records.filter(r => r.status === 'absent').length;
    const totalStudents = currentClass?.students.length || 0;
    const totalRecorded = presentCount + absentCount;
    
    // إضافة تشخيص للإحصائيات
    console.log('إحصائيات الجلسة:', {
      sessionId: session.id,
      sessionDate: session.date,
      totalStudents,
      totalRecords: session.records.length,
      presentCount,
      absentCount,
      totalRecorded,
      records: session.records.map(r => ({ studentId: r.studentId, status: r.status }))
    });
    
    return { presentCount, absentCount, totalCount: totalStudents };
  };

  const renderSessionItem = ({ item }: { item: AttendanceSession }) => {
    const stats = getAttendanceStats(item);
    const date = new Date(item.date);
    
    return (
      <TouchableOpacity
        style={styles.sessionCard}
        onPress={() => setSelectedSession(item)}
      >
        <View style={styles.sessionHeader}>
          <Text style={styles.sessionDate}>
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <Text style={styles.sessionTime}>
            {date.toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </Text>
        </View>
        
        <View style={styles.sessionStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.presentCount}</Text>
            <Text style={styles.statLabel}>حاضر</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.absentNumber]}>{stats.absentCount}</Text>
            <Text style={styles.statLabel}>غائب</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalCount}</Text>
            <Text style={styles.statLabel}>المجموع</Text>
          </View>
        </View>
        
        {/* إظهار تحذير إذا لم يتم تسجيل جميع الطلاب */}
        {stats.presentCount + stats.absentCount < stats.totalCount && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ لم يتم تسجيل {stats.totalCount - (stats.presentCount + stats.absentCount)} طالب
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderStudentRecord = ({ item }: { item: any }) => {
    const student = currentClass?.students.find(s => s.id === item.studentId);
    if (!student) return null;

    const attendanceTime = new Date(item.attendanceTime || item.date);
    
    // إضافة تشخيص للوقت
    console.log('Attendance time for', student.name, ':', {
      raw: item.attendanceTime || item.date,
      parsed: attendanceTime,
      formatted: attendanceTime.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    });

    return (
      <View style={styles.studentRecord}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.attendanceTime}>
            {attendanceTime.toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          item.status === 'present' ? styles.presentBadge : styles.absentBadge
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'present' ? styles.presentText : styles.absentText
          ]}>
            {item.status === 'present' ? 'حاضر' : 'غائب'}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>لا توجد سجلات حضور</Text>
      <Text style={styles.emptyStateSubtitle}>
        ابدأ بتسجيل الحضور لرؤية التاريخ هنا
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
          <Text style={styles.headerTitle}>تاريخ الحضور</Text>
          <Text style={styles.headerSubtitle}>
            {currentClass.name} - شعبة {currentClass.section}
          </Text>
        </View>
        <RealtimeStatus />
      </View>

      <View style={styles.content}>
        {classSessions.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={classSessions}
            renderItem={renderSessionItem}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sessionsList}
          />
        )}
      </View>

      {/* Modal لعرض تفاصيل الجلسة */}
      {selectedSession && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                تفاصيل الحضور - {new Date(selectedSession.date).toLocaleDateString('en-US')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedSession(null)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedSession.records}
              renderItem={renderStudentRecord}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              style={styles.recordsList}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedSession(null)}
              >
                <Text style={styles.modalCloseButtonText}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  sessionsList: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  sessionCard: {
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
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionDate: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
  },
  sessionTime: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    direction: 'rtl',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    color: '#28a745',
  },
  absentNumber: {
    color: '#dc3545',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
    marginTop: 2,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
  },
  recordsList: {
    maxHeight: 300,
  },
  studentRecord: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontFamily: fontFamilies.medium,
    color: '#2c3e50',
    marginBottom: 4,
  },
  attendanceTime: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  presentBadge: {
    backgroundColor: '#d4edda',
  },
  absentBadge: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 12,
    fontFamily: fontFamilies.semibold,
  },
  presentText: {
    color: '#155724',
  },
  absentText: {
    color: '#721c24',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalCloseButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  warningContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  warningText: {
    fontSize: 12,
    fontFamily: fontFamilies.regular,
    color: '#856404',
    textAlign: 'center',
  },
});
