import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useApp } from '../context/AppContext';
import { AttendanceRecord, AttendanceSession } from '../types';
import { showErrorAlert, showAttendanceCompleteAlert } from '../utils/notifications';
import { fontFamilies } from '../utils/theme';

interface AttendanceScreenProps {
  navigation: any;
  route: {
    params: {
      classId: string;
    };
  };
}

export default function AttendanceScreen({ navigation, route }: AttendanceScreenProps) {
  const { classId } = route.params;
  const { state, dispatch } = useApp();
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [attendanceRecords, setAttendanceRecords] = useState<{ [key: string]: 'present' | 'absent' }>({});
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const currentClass = state.classes.find(cls => cls.id === classId);
  const students = currentClass?.students || [];
  const currentStudent = students[currentStudentIndex];

  const translateX = new Animated.Value(0);
  const scale = new Animated.Value(1);

  useEffect(() => {
    // التحقق من وجود جلسة حضور اليوم
    const today = new Date().toDateString();
    const existingSession = state.attendanceSessions.find(
      session => session.classId === classId && new Date(session.date).toDateString() === today
    );

    if (existingSession) {
      setIsSessionStarted(true);
      setSessionId(existingSession.id);
      // تحميل سجلات الحضور الموجودة
      const records: { [key: string]: 'present' | 'absent' } = {};
      existingSession.records.forEach(record => {
        records[record.studentId] = record.status;
      });
      setAttendanceRecords(records);
    }
  }, [classId, state.attendanceSessions]);

  const startAttendanceSession = () => {
    if (students.length === 0) {
      showErrorAlert('لا يوجد طلاب في هذا الفصل');
      return;
    }

    const newSession: AttendanceSession = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      classId: classId,
      date: new Date(),
      records: [],
      createdAt: new Date(),
    };

    dispatch({ type: 'ADD_ATTENDANCE_SESSION', payload: newSession });
    setSessionId(newSession.id);
    setIsSessionStarted(true);
    setCurrentStudentIndex(0);
    setAttendanceRecords({});
  };

  const markAttendance = (status: 'present' | 'absent') => {
    if (!currentStudent || !sessionId) return;

    setAttendanceRecords(prev => ({
      ...prev,
      [currentStudent.id]: status,
    }));

    // الانتقال للطالب التالي
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(prev => prev + 1);
    } else {
      // انتهاء تسجيل الحضور
      finishAttendanceSession();
    }
  };

  const finishAttendanceSession = () => {
    if (!sessionId) return;

    // إنشاء سجلات الحضور
    const records: AttendanceRecord[] = students.map(student => ({
      id: `${sessionId}_${student.id}_${Math.random().toString(36).substr(2, 9)}`,
      studentId: student.id,
      classId: classId,
      date: new Date(),
      status: attendanceRecords[student.id] || 'absent',
      createdAt: new Date(),
    }));

    // تحديث جلسة الحضور
    const updatedSession: AttendanceSession = {
      id: sessionId,
      classId: classId,
      date: new Date(),
      records: records,
      createdAt: new Date(),
    };

    dispatch({ type: 'ADD_ATTENDANCE_SESSION', payload: updatedSession });

    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;

    showAttendanceCompleteAlert(presentCount, absentCount, () => navigation.goBack());
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      // إذا كان السحب لليمين (present)
      if (translationX > 100 || velocityX > 500) {
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 300,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          markAttendance('present');
          translateX.setValue(0);
          scale.setValue(1);
        });
      }
      // إذا كان السحب لليسار (absent)
      else if (translationX < -100 || velocityX < -500) {
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: -300,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          markAttendance('absent');
          translateX.setValue(0);
          scale.setValue(1);
        });
      }
      // إرجاع الكارت لمكانه
      else {
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  const renderStudentCard = () => {
    if (!currentStudent) return null;

    const cardStyle = {
      transform: [
        { translateX: translateX },
        { scale: scale },
      ],
    };

    return (
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View style={[styles.studentCard, cardStyle]}>
          <View style={styles.studentNumber}>
            <Text style={styles.studentNumberText}>{currentStudentIndex + 1}</Text>
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{currentStudent.name}</Text>
            <Text style={styles.studentStatus}>
              {attendanceRecords[currentStudent.id] === 'present' ? 'حاضر' :
               attendanceRecords[currentStudent.id] === 'absent' ? 'غائب' : 'لم يتم التسجيل'}
            </Text>
          </View>
        </Animated.View>
      </PanGestureHandler>
    );
  };

  if (!currentClass) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>لم يتم العثور على الفصل الدراسي</Text>
      </View>
    );
  }

  if (students.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← رجوع</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تسجيل الحضور</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>لا يوجد طلاب</Text>
          <Text style={styles.emptyStateSubtitle}>
            يرجى إضافة طلاب إلى هذا الفصل أولاً
          </Text>
        </View>
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
          <Text style={styles.headerTitle}>تسجيل الحضور</Text>
          <Text style={styles.headerSubtitle}>
            {currentClass.name} - شعبة {currentClass.section}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {!isSessionStarted ? (
          <View style={styles.startContainer}>
            <Text style={styles.startTitle}>بدء تسجيل الحضور</Text>
            <Text style={styles.startSubtitle}>
              عدد الطلاب: {students.length}
            </Text>
            <Text style={styles.startInstructions}>
              اسحب الكارت لليمين للحضور أو لليسار للغياب
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={startAttendanceSession}
            >
              <Text style={styles.startButtonText}>بدء التسجيل</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.attendanceContainer}>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {currentStudentIndex + 1} من {students.length}
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${((currentStudentIndex + 1) / students.length) * 100}%` }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.cardContainer}>
              {renderStudentCard()}
            </View>

            <View style={styles.instructionsContainer}>
              <View style={styles.instructionItem}>
                <View style={[styles.instructionColor, { backgroundColor: '#28a745' }]} />
                <Text style={styles.instructionText}>اسحب لليمين = حاضر</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={[styles.instructionColor, { backgroundColor: '#dc3545' }]} />
                <Text style={styles.instructionText}>اسحب لليسار = غائب</Text>
              </View>
            </View>

            <View style={styles.manualButtons}>
              <TouchableOpacity
                style={[styles.manualButton, styles.absentButton]}
                onPress={() => markAttendance('absent')}
              >
                <Text style={styles.manualButtonText}>غائب</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manualButton, styles.presentButton]}
                onPress={() => markAttendance('present')}
              >
                <Text style={styles.manualButtonText}>حاضر</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  startSubtitle: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 24,
    textAlign: 'center',
  },
  startInstructions: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: fontFamilies.semibold,
  },
  attendanceContainer: {
    flex: 1,
    paddingTop: 20,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressText: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 4,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  studentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
    direction: 'rtl',
  },
  studentNumber: {
    backgroundColor: '#007bff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  studentNumberText: {
    color: 'white',
    fontSize: 18,
    fontFamily: fontFamilies.bold,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
    marginBottom: 4,
  },
  studentStatus: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
  },
  instructionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  instructionText: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: '#6c757d',
  },
  manualButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    direction: 'rtl',
  },
  manualButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  absentButton: {
    backgroundColor: '#dc3545',
  },
  presentButton: {
    backgroundColor: '#28a745',
  },
  manualButtonText: {
    color: 'white',
    fontSize: 16,
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
});
