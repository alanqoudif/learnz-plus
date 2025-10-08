import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { AttendanceRecord, AttendanceSession } from '../types';
import { showErrorAlert, showAttendanceCompleteAlert } from '../utils/notifications';
import { fontFamilies } from '../utils/theme';
import { RealtimeService } from '../services/realtimeService';
import { FirebaseRealtimeService } from '../services/firebaseRealtimeService';
import RealtimeNotification from '../components/RealtimeNotification';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

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
  const { state, dispatch, createAttendanceSession, recordAttendance, refreshData } = useApp();
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [attendanceRecords, setAttendanceRecords] = useState<{ [key: string]: 'present' | 'absent' }>({});
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const { notifications, addNotification, removeNotification } = useRealtimeNotifications();

  const translateX = new Animated.Value(0);
  const scale = new Animated.Value(1);

  const currentClass = state.classes.find(cls => cls.id === classId);
  const students = currentClass?.students || [];
  const currentStudent = students[currentStudentIndex];

  // Real-time listener for attendance changes in this class
  useEffect(() => {
    console.log('Setting up realtime listener for class:', classId);
    
    const attendanceSubscription = RealtimeService.subscribeToClassAttendance(
      classId,
      async (payload) => {
        console.log('📅 Attendance change detected for class:', classId, payload.eventType);
        
        // تحديث البيانات من قاعدة البيانات
        try {
          await refreshData();
          
          // تحديث حالة الجلسة بناءً على التغييرات
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
            
            // إظهار إشعار للمستخدم عند تحديث الحضور
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              console.log('🔄 Attendance updated in real-time!');
              addNotification('تم تحديث الحضور تلقائياً', 'success');
            }
          }
        } catch (error) {
          console.error('❌ فشل في تحديث البيانات:', error);
        }
      }
    );

    return () => {
      console.log('Cleaning up attendance realtime listener for class:', classId);
      attendanceSubscription.unsubscribe();
    };
  }, [classId]); // إزالة state.attendanceSessions من dependencies لتجنب إعادة إنشاء الـ subscription

  // تحديث البيانات المحلية عند تغيير state.attendanceSessions
  useEffect(() => {
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
  }, [state.attendanceSessions, classId]);

  const startAttendanceSession = async () => {
    if (students.length === 0) {
      showErrorAlert('لا يوجد طلاب في هذا الفصل');
      return;
    }

    try {
      const newSession = await createAttendanceSession({
        classId: classId,
        date: new Date(),
      });

      setSessionId(newSession.id);
      setIsSessionStarted(true);
      setCurrentStudentIndex(0);
      setAttendanceRecords({});
    } catch (error) {
      console.error('Error starting attendance session:', error);
      showErrorAlert('حدث خطأ أثناء بدء جلسة الحضور');
    }
  };

  const markAttendance = async (status: 'present' | 'absent') => {
    if (!currentStudent || !sessionId || isRecording) {
      console.log('❌ لا يمكن تسجيل الحضور:', { 
        currentStudent: !!currentStudent, 
        sessionId, 
        isRecording,
        currentStudentIndex,
        totalStudents: students.length
      });
      return;
    }

    // التأكد من أن الطالب الحالي موجود في قائمة الطلاب
    if (currentStudentIndex >= students.length) {
      console.log('❌ فهرس الطالب خارج النطاق:', currentStudentIndex, students.length);
      return;
    }

    // السماح بتعديل حالة الطالب إذا كان مسجلاً مسبقاً
    if (attendanceRecords[currentStudent.id]) {
      console.log('🔄 تعديل حالة الطالب:', currentStudent.name, 'من', attendanceRecords[currentStudent.id], 'إلى', status);
    }

    setIsRecording(true);

    try {
      const attendanceTime = new Date();
      
      // التأكد من صحة التاريخ
      if (isNaN(attendanceTime.getTime())) {
        throw new Error('تاريخ غير صحيح');
      }
      
      console.log(`🎯 تسجيل ${status} للطالب:`, {
        studentName: currentStudent.name,
        studentId: currentStudent.id,
        sessionId,
        attendanceTime: attendanceTime.toLocaleString('ar-SA', { timeZone: 'Asia/Muscat' }),
        utcTime: attendanceTime.toISOString(),
        timestamp: attendanceTime.getTime(),
        isValid: !isNaN(attendanceTime.getTime())
      });
      
      // حفظ سجل الحضور في قاعدة البيانات
      const savedRecord = await recordAttendance({
        studentId: currentStudent.id,
        classId: classId,
        sessionId: sessionId,
        status: status,
        attendanceTime: attendanceTime,
      });

      console.log('✅ تم حفظ السجل في قاعدة البيانات:', savedRecord);

      // تحديث السجلات المحلية
      const newRecords = {
        ...attendanceRecords,
        [currentStudent.id]: status,
      };
      
      setAttendanceRecords(newRecords);
      
      console.log('📝 السجلات المحلية المحدثة:', newRecords);
      
      // التأكد من أن التحديث تم قبل الانتقال
      console.log('🔄 تم تسجيل الحضور بنجاح، جاري الانتقال للطالب التالي...');

      // إظهار رسالة تأكيد إذا تم تعديل الحالة
      if (attendanceRecords[currentStudent.id]) {
        const previousStatus = attendanceRecords[currentStudent.id];
        if (previousStatus !== status) {
          console.log(`✅ تم تعديل حالة ${currentStudent.name} من ${previousStatus} إلى ${status}`);
        }
      }

      // الانتقال للطالب التالي
      const nextIndex = currentStudentIndex + 1;
      console.log(`🔄 الانتقال للطالب التالي: ${currentStudentIndex + 1} -> ${nextIndex + 1} من أصل ${students.length}`);
      
      if (nextIndex < students.length) {
        // تأثير بصري عند الانتقال
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 0.95,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();
        
        // الانتقال الفوري للطالب التالي
        setCurrentStudentIndex(nextIndex);
        setIsRecording(false);
        console.log(`✅ تم الانتقال للطالب: ${students[nextIndex].name} (${nextIndex + 1}/${students.length})`);
      } else {
        // انتهاء تسجيل الحضور
        console.log('🏁 انتهاء تسجيل الحضور لجميع الطلاب');
        setIsRecording(false);
        finishAttendanceSession();
      }
    } catch (error) {
      console.error('❌ خطأ في تسجيل الحضور:', error);
      
      // معالجة أخطاء التاريخ بشكل خاص
      if (error instanceof Error && error.message.includes('تاريخ')) {
        showErrorAlert('خطأ في التاريخ: ' + error.message);
      } else {
        showErrorAlert('حدث خطأ أثناء تسجيل الحضور');
      }
      
      setIsRecording(false);
    }
  };

  const finishAttendanceSession = () => {
    if (!sessionId) return;
      // حساب الإحصائيات بدقة - فقط للطلاب المسجلين فعلياً
      const actualPresentCount = students.filter(s => attendanceRecords[s.id] === 'present').length;
      const actualAbsentCount = students.filter(s => attendanceRecords[s.id] === 'absent').length;
      const totalStudents = students.length;
      const totalRecorded = actualPresentCount + actualAbsentCount;
      
      // تشخيص مفصل للإحصائيات
      console.log('🔍 تشخيص إحصائيات الحضور النهائية:', {
        totalStudents,
        totalRecorded,
        actualPresentCount,
        actualAbsentCount,
        attendanceRecords: attendanceRecords,
        sessionId: sessionId,
        verification: {
          presentStudents: students.filter(s => attendanceRecords[s.id] === 'present').map(s => s.name),
          absentStudents: students.filter(s => attendanceRecords[s.id] === 'absent').map(s => s.name),
          unrecordedStudents: students.filter(s => !attendanceRecords[s.id]).map(s => s.name)
        }
      });

      // التحقق من أن جميع الطلاب تم تسجيل حضورهم
      const missingStudents = students.filter(student => !attendanceRecords[student.id]);
      
      // التحقق من دقة الإحصائيات
      const verificationPresent = Object.values(attendanceRecords).filter(status => status === 'present').length;
      const verificationAbsent = Object.values(attendanceRecords).filter(status => status === 'absent').length;
      
      console.log('✅ التحقق النهائي من الإحصائيات:', {
        actualPresent: actualPresentCount,
        verificationPresent: verificationPresent,
        actualAbsent: actualAbsentCount,
        verificationAbsent: verificationAbsent,
        isAccurate: actualPresentCount === verificationPresent && actualAbsentCount === verificationAbsent
      });

      // إذا لم يتم تسجيل جميع الطلاب، إظهار تحذير
      if (totalRecorded < totalStudents) {
        Alert.alert(
          'تحذير',
          `لم يتم تسجيل حضور جميع الطلاب.\nتم تسجيل ${totalRecorded} من أصل ${totalStudents} طالب.\n\nالطلاب غير المسجلين: ${missingStudents.map(s => s.name).join(', ')}`,
          [
            { text: 'متابعة', onPress: () => showAttendanceCompleteAlert(actualPresentCount, actualAbsentCount, () => navigation.goBack()) },
            { text: 'إلغاء', style: 'cancel' }
          ]
        );
      } else {
        // التأكد من دقة الإحصائيات قبل العرض
        const finalPresentCount = Math.max(0, actualPresentCount);
        const finalAbsentCount = Math.max(0, actualAbsentCount);
        
        console.log('🎯 الإحصائيات النهائية المقدمة للمستخدم:', {
          present: finalPresentCount,
          absent: finalAbsentCount,
          total: totalStudents,
          sessionId: sessionId
        });
        
        // إرسال تحديث في الوقت الفعلي لإعلام الشاشات الأخرى
        try {
          FirebaseRealtimeService.sendAttendanceUpdate(state.currentTeacher?.id || '', {
            type: 'session_completed',
            sessionId: sessionId,
            classId: classId,
            presentCount: finalPresentCount,
            absentCount: finalAbsentCount,
            totalStudents: totalStudents,
            timestamp: Date.now()
          });
        } catch (error) {
          console.warn('⚠️ فشل في إرسال تحديث انتهاء الجلسة:', error);
        }
        
        showAttendanceCompleteAlert(finalPresentCount, finalAbsentCount, () => navigation.goBack());
      }
  };




  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  // تم إزالة دالة onHandlerStateChange لأنها تستخدم PanGestureHandler غير المتوفر

  const renderStudentCard = () => {
    if (!currentStudent) return null;

    return (
      <Animated.View style={[styles.studentCard, { transform: [{ scale }] }]}>
        <View style={styles.studentNumber}>
          <Text style={styles.studentNumberText}>{currentStudentIndex + 1}</Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{currentStudent.name}</Text>
        </View>
      </Animated.View>
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
              اضغط على الأزرار لتسجيل حضور أو غياب الطلاب
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

             <View style={styles.manualButtons}>
               <TouchableOpacity
                 style={[
                   styles.manualButton, 
                   styles.absentButton,
                   (isRecording || !currentStudent) && styles.disabledButton
                 ]}
                 onPress={() => {
                   if (!isRecording && currentStudent) {
                     console.log('🔴 الضغط على زر غائب للطالب:', currentStudent.name);
                     markAttendance('absent');
                   }
                 }}
                 disabled={isRecording || !currentStudent}
               >
                 <Text style={styles.manualButtonText}>غائب</Text>
               </TouchableOpacity>
               <TouchableOpacity
                 style={[
                   styles.manualButton, 
                   styles.presentButton,
                   (isRecording || !currentStudent) && styles.disabledButton
                 ]}
                 onPress={() => {
                   if (!isRecording && currentStudent) {
                     console.log('🟢 الضغط على زر حاضر للطالب:', currentStudent.name);
                     markAttendance('present');
                   }
                 }}
                 disabled={isRecording || !currentStudent}
               >
                 <Text style={styles.manualButtonText}>حاضر</Text>
               </TouchableOpacity>
             </View>
          </View>
        )}
      </View>

      {/* إشعارات Realtime */}
      {notifications.map((notification) => (
        <RealtimeNotification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          visible={true}
          onHide={() => removeNotification(notification.id)}
        />
      ))}
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
    marginBottom: 0,
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
    justifyContent: 'center',
  },
  studentName: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
    textAlign: 'center',
  },
  manualButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    direction: 'rtl',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  manualButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  absentButton: {
    backgroundColor: '#dc3545',
  },
  presentButton: {
    backgroundColor: '#28a745',
  },
  manualButtonText: {
    color: 'white',
    fontSize: 18,
    fontFamily: fontFamilies.bold,
  },
  disabledButton: {
    opacity: 0.6,
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
