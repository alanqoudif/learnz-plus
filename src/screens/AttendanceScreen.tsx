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

  // Animation values
  const fadeAnim = useState(new Animated.Value(1))[0];
  const scaleAnim = useState(new Animated.Value(1))[0];

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
        
        // تجاهل التحديثات الآنية تماماً أثناء جلسة الحضور النشطة
        console.log('⏸️ تجاهل التحديث الآني أثناء الجلسة النشطة');
        // لا نفعل شيء - سيتم تحديث البيانات فقط عند إعادة فتح الشاشة
      }
    );

    return () => {
      console.log('Cleaning up attendance realtime listener for class:', classId);
      attendanceSubscription.unsubscribe();
    };
  }, [classId]);

  // تحميل الجلسة الموجودة عند فتح الشاشة فقط - مرة واحدة
  useEffect(() => {
    console.log('🔍 فحص وجود جلسة سابقة...');
    const today = new Date().toDateString();
    const existingSession = state.attendanceSessions.find(
      session => session.classId === classId && new Date(session.date).toDateString() === today
    );

    if (existingSession) {
      console.log('📂 تم العثور على جلسة موجودة:', existingSession.id);
      setIsSessionStarted(true);
      setSessionId(existingSession.id);
      
      // تحميل سجلات الحضور الموجودة
      const records: { [key: string]: 'present' | 'absent' } = {};
      existingSession.records.forEach(record => {
        records[record.studentId] = record.status;
      });
      setAttendanceRecords(records);
      
      // حساب عدد الطلاب المسجلين وتحديد الفهرس التالي
      const recordedStudentsCount = existingSession.records.length;
      console.log(`📊 عدد الطلاب المسجلين: ${recordedStudentsCount} من أصل ${students.length}`);
      
      if (recordedStudentsCount > 0 && recordedStudentsCount < students.length) {
        setCurrentStudentIndex(recordedStudentsCount);
        console.log(`📍 الانتقال للطالب رقم ${recordedStudentsCount + 1} لاستكمال التسجيل`);
      }
    } else {
      console.log('✨ لا توجد جلسة سابقة - جاهز لبدء جلسة جديدة');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // فقط عند تحميل الشاشة - مرة واحدة

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
    if (!currentStudent || !sessionId) {
      console.log('❌ لا يمكن تسجيل الحضور - بيانات غير مكتملة');
      return;
    }

    if (isRecording) {
      console.log('⏸️ تسجيل جاري، يرجى الانتظار');
      return;
    }

    // حفظ البيانات المطلوبة في متغيرات محلية
    const studentToRecord = currentStudent;
    const currentIndex = currentStudentIndex;
    const nextIndex = currentIndex + 1;
    const isLastStudent = nextIndex >= students.length;
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎯 تسجيل ${status} للطالب: ${studentToRecord.name}`);
    console.log(`📍 الفهرس: ${currentIndex + 1}/${students.length} ${isLastStudent ? '(آخر طالب)' : ''}`);
    
    // قفل التسجيل
    setIsRecording(true);

    try {
      // تأثير بصري للضغط
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // حفظ سجل الحضور
      await recordAttendance({
        studentId: studentToRecord.id,
        classId: classId,
        sessionId: sessionId,
        status: status,
        attendanceTime: new Date(),
      });

      console.log(`✅ تم حفظ السجل في قاعدة البيانات`);

      // تحديث السجلات المحلية
      const updatedRecords = {
        ...attendanceRecords,
        [studentToRecord.id]: status,
      };
      
      setAttendanceRecords(updatedRecords);
      console.log(`📝 تم تحديث السجلات المحلية`);

      // تحديد ما يجب فعله بعد ذلك
      if (isLastStudent) {
        // آخر طالب - انتظر قليلاً ثم أنهِ الجلسة
        console.log(`🏁 هذا آخر طالب - جاري إنهاء الجلسة`);
        setTimeout(() => {
          setIsRecording(false);
          finishAttendanceSessionWithRecords(updatedRecords);
        }, 400);
      } else {
        // ليس آخر طالب - انتقل للتالي مع animation
        console.log(`➡️ الانتقال للطالب التالي: ${students[nextIndex].name}`);
        
        // Fade out animation
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start(() => {
          // تحديث الفهرس بعد الـ fade out
          setCurrentStudentIndex(nextIndex);
          
          // Fade in animation للطالب الجديد
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            // فك القفل بعد انتهاء الـ animation
            setIsRecording(false);
          });
        });
      }
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
    } catch (error) {
      console.error('❌ خطأ في تسجيل الحضور:', error);
      showErrorAlert('حدث خطأ أثناء تسجيل الحضور');
      setIsRecording(false);
      // إعادة تعيين الـ animations في حالة الخطأ
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  };

  const finishAttendanceSessionWithRecords = (records: { [key: string]: 'present' | 'absent' }) => {
    if (!sessionId) return;
      // حساب الإحصائيات بدقة - فقط للطلاب المسجلين فعلياً
      const actualPresentCount = students.filter(s => records[s.id] === 'present').length;
      const actualAbsentCount = students.filter(s => records[s.id] === 'absent').length;
      const totalStudents = students.length;
      const totalRecorded = actualPresentCount + actualAbsentCount;
      
      // تشخيص مفصل للإحصائيات
      console.log('🔍 تشخيص إحصائيات الحضور النهائية:', {
        totalStudents,
        totalRecorded,
        actualPresentCount,
        actualAbsentCount,
        attendanceRecords: records,
        sessionId: sessionId,
        verification: {
          presentStudents: students.filter(s => records[s.id] === 'present').map(s => s.name),
          absentStudents: students.filter(s => records[s.id] === 'absent').map(s => s.name),
          unrecordedStudents: students.filter(s => !records[s.id]).map(s => s.name)
        }
      });

      // التحقق من أن جميع الطلاب تم تسجيل حضورهم
      const missingStudents = students.filter(student => !records[student.id]);
      
      // التحقق من دقة الإحصائيات
      const verificationPresent = Object.values(records).filter(status => status === 'present').length;
      const verificationAbsent = Object.values(records).filter(status => status === 'absent').length;
      
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




  const renderStudentCard = () => {
    if (!currentStudent) return null;

    return (
      <Animated.View 
        style={[
          styles.studentCard, 
          { 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }] 
          }
        ]}
      >
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
                   console.log('🔘 تم الضغط على زر غائب');
                   console.log('   • الطالب الحالي:', currentStudent?.name || 'غير موجود');
                   console.log('   • الفهرس:', currentStudentIndex);
                   console.log('   • حالة التسجيل:', isRecording ? 'مقفل' : 'متاح');
                   
                   if (!isRecording && currentStudent) {
                     markAttendance('absent');
                   } else {
                     console.log('   ⚠️ لا يمكن التسجيل:', {
                       isRecording,
                       hasCurrentStudent: !!currentStudent
                     });
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
                   console.log('🔘 تم الضغط على زر حاضر');
                   console.log('   • الطالب الحالي:', currentStudent?.name || 'غير موجود');
                   console.log('   • الفهرس:', currentStudentIndex);
                   console.log('   • حالة التسجيل:', isRecording ? 'مقفل' : 'متاح');
                   
                   if (!isRecording && currentStudent) {
                     markAttendance('present');
                   } else {
                     console.log('   ⚠️ لا يمكن التسجيل:', {
                       isRecording,
                       hasCurrentStudent: !!currentStudent
                     });
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
