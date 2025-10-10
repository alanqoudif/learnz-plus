import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { AttendanceRecord, AttendanceSession } from '../types';
import { showErrorAlert, showAttendanceCompleteAlert } from '../utils/notifications';
import { colors, fontFamilies, shadows, borderRadius, spacing } from '../utils/theme';
import { fadeIn, fadeOut, scaleButton } from '../utils/animations';
import { lightHaptic, successHaptic, errorHaptic } from '../utils/haptics';
// RealtimeNotification component removed - using simple notifications instead

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
  const [attendanceRecords, setAttendanceRecords] = useState<{ [key: string]: 'present' | 'absent' }>({});
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFinishingRef = useRef(false); // لتجنب تنفيذ finishAttendanceSessionWithRecords مرتين
  // Realtime notifications removed - using simple alerts instead

  // Animation values
  const fadeAnim = useState(new Animated.Value(1))[0];
  const scaleAnim = useState(new Animated.Value(1))[0];

  const currentClass = state.classes.find(cls => cls.id === classId);
  const students = currentClass?.students || [];
  
  // حساب الإحصائيات
  const presentCount = Object.values(attendanceRecords).filter(status => status === 'present').length;
  const absentCount = Object.values(attendanceRecords).filter(status => status === 'absent').length;
  const totalRecorded = presentCount + absentCount;
  const isAllStudentsRecorded = totalRecorded === students.length;

  // Real-time updates are handled by Firebase through AppContext
  // No need for additional listeners here during active attendance session

  // تحميل الجلسة الموجودة عند التركيز على الشاشة
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 الشاشة أصبحت نشطة - إعادة تحميل البيانات...');
      console.log('🔍 حالة الجلسة الحالية:', {
        isSessionCompleted,
        studentsLength: students.length,
        sessionId,
        isFinishing: isFinishingRef.current,
        totalRecorded
      });
      
      // إذا كانت الجلسة مكتملة محلياً أو في حالة إنهاء، لا نعيد تعيين أي شيء
      if (isSessionCompleted || isFinishingRef.current) {
        console.log('✅ الجلسة مكتملة أو في حالة إنهاء - لا حاجة لإعادة التعيين');
        console.log('🔍 حالة الجلسة الحالية:', {
          isSessionCompleted,
          isFinishing: isFinishingRef.current,
          studentsLength: students.length,
          totalRecorded
        });
        return;
      }
      
      // إذا كانت الجلسة نشطة ولا تزال في التقدم، لا نعيد تعيين أي شيء
      if (isSessionStarted && sessionId && !isSessionCompleted) {
        console.log('🔄 الجلسة نشطة - لا حاجة لإعادة التعيين');
        console.log('🔍 حالة الجلسة النشطة:', {
          isSessionStarted,
          sessionId,
          isSessionCompleted,
          studentsLength: students.length,
          totalRecorded
        });
        return;
      }
      
      
      // تحقق من وجود جلسة مكتملة اليوم في قاعدة البيانات
      const today = new Date().toDateString();
      const completedSessionToday = state.attendanceSessions.find(
        session => session.classId === classId && 
        new Date(session.date).toDateString() === today &&
        session.records.length >= students.length
      );
      
      if (completedSessionToday) {
        console.log('✅ تم العثور على جلسة مكتملة اليوم - تحديد حالة الإكمال');
        console.log('🔍 تفاصيل الجلسة المكتملة:', {
          sessionId: completedSessionToday.id,
          recordsCount: completedSessionToday.records.length,
          studentsCount: students.length
        });
        setIsSessionCompleted(true);
        setIsSessionStarted(true);
        setSessionId(completedSessionToday.id);
        
        // تحميل سجلات الحضور الموجودة
        const records: { [key: string]: 'present' | 'absent' } = {};
        completedSessionToday.records.forEach(record => {
          records[record.studentId] = record.status;
        });
        setAttendanceRecords(records);
        
        // لا نعيد تعيين الفهرس - نتركه كما هو
        console.log('🚫 لا نعيد تعيين الفهرس للجلسة المكتملة');
        console.log('🔍 حالة الجلسة المكتملة:', {
          sessionId: completedSessionToday.id,
          recordsCount: completedSessionToday.records.length,
          studentsCount: students.length
        });
        return;
      }
      
      console.log('🔍 فحص وجود جلسة سابقة...');
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
        
        const recordedStudentsCount = existingSession.records.length;
        console.log(`📊 عدد الطلاب المسجلين: ${recordedStudentsCount} من أصل ${students.length}`);
        
        if (recordedStudentsCount >= students.length) {
          // الجلسة مكتملة - تحديد أن الجلسة مكتملة
          setIsSessionCompleted(true);
          console.log(`✅ الجلسة مكتملة - تم تحديد حالة الإكمال`);
        }
      } else {
        console.log('✨ لا توجد جلسة سابقة - جاهز لبدء جلسة جديدة');
        // إعادة تعيين الـ state إلى القيم الافتراضية فقط عند عدم وجود جلسة سابقة
        // ولكن فقط إذا لم تكن الجلسة مكتملة
        if (!isSessionCompleted) {
          console.log('🔄 إعادة تعيين الـ state للجلسة الجديدة');
          setAttendanceRecords({});
          setIsSessionStarted(false);
          setSessionId(null);
          isFinishingRef.current = false; // إعادة تعيين حالة الإنهاء
        } else {
          console.log('🚫 الجلسة مكتملة - لا نعيد تعيين أي شيء');
          console.log('🔍 حالة الجلسة المكتملة:', {
            isSessionCompleted,
            studentsLength: students.length
          });
        }
      }
      
      return () => {
        console.log('🧹 تنظيف عند مغادرة الشاشة...');
      };
    }, [classId, state.attendanceSessions, students.length, isSessionCompleted, totalRecorded])
  );

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
      setAttendanceRecords({});
      
      console.log('🎯 بدء جلسة جديدة:', {
        sessionId: newSession.id,
        studentsCount: students.length
      });
      
    } catch (error) {
      console.error('Error starting attendance session:', error);
      showErrorAlert('حدث خطأ أثناء بدء جلسة الحضور');
    }
  };

  const markStudentAttendance = useCallback((studentId: string, status: 'present' | 'absent') => {
    console.log('🔘 تسجيل حضور محلي للطالب:', studentId, status);

    if (!sessionId) {
      console.log('❌ لا يمكن تسجيل الحضور - لا يوجد sessionId');
      errorHaptic();
      return;
    }

    if (isSessionCompleted) {
      console.log('✅ الجلسة مكتملة - لا يمكن تسجيل حضور إضافي');
      return;
    }

    // تحديث السجلات المحلية فقط
    const updatedRecords = {
      ...attendanceRecords,
      [studentId]: status,
    };
    setAttendanceRecords(updatedRecords);
    console.log(`📝 تم تحديث السجلات المحلية للطالب: ${studentId}`);

    // Success haptic عند تسجيل ناجح
    if (status === 'present') {
      successHaptic();
    }
  }, [sessionId, isSessionCompleted, attendanceRecords]);

  const saveAllAttendanceRecords = useCallback(async () => {
    if (!sessionId) return;

    try {
      // حفظ جميع السجلات دفعة واحدة
      const recordsToSave = students
        .filter(student => attendanceRecords[student.id])
        .map(student => ({
          studentId: student.id,
          classId: classId,
          sessionId: sessionId,
          status: attendanceRecords[student.id],
          attendanceTime: new Date(),
        }));

      console.log(`💾 بدء حفظ ${recordsToSave.length} سجل في قاعدة البيانات...`);

      // حفظ السجلات بالتوازي
      await Promise.all(
        recordsToSave.map(record => recordAttendance(record))
      );

      console.log(`✅ تم حفظ جميع السجلات بنجاح`);
      await finishAttendanceSession();
    } catch (error) {
      console.error('❌ خطأ في حفظ السجلات:', error);
      showErrorAlert('حدث خطأ أثناء حفظ السجلات');
      setIsSubmitting(false);
    }
  }, [sessionId, students, attendanceRecords, classId, recordAttendance]);

  const submitAttendance = useCallback(async () => {
    if (!sessionId) {
      showErrorAlert('لا توجد جلسة نشطة');
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      // التحقق من تسجيل جميع الطلاب
      const missingStudents = students.filter(student => !attendanceRecords[student.id]);
      
      if (missingStudents.length > 0) {
        Alert.alert(
          'تحذير',
          `لم يتم تسجيل حضور جميع الطلاب.\n\nالطلاب غير المسجلين: ${missingStudents.map(s => s.name).join(', ')}\n\nهل تريد المتابعة؟`,
          [
            { text: 'إلغاء', style: 'cancel', onPress: () => setIsSubmitting(false) },
            { text: 'متابعة', onPress: () => saveAllAttendanceRecords() }
          ]
        );
        return;
      }

      await saveAllAttendanceRecords();
    } catch (error) {
      console.error('❌ خطأ في تسليم الحضور:', error);
      showErrorAlert('حدث خطأ أثناء تسليم الحضور');
      setIsSubmitting(false);
    }
  }, [sessionId, isSubmitting, students, attendanceRecords, saveAllAttendanceRecords]);

  const finishAttendanceSession = useCallback(async () => {
    if (!sessionId) return;
    
    // فحص إضافي لمنع التنفيذ المتعدد
    if (isFinishingRef.current && isSessionCompleted) {
      console.log('🚫 الجلسة في حالة إنهاء بالفعل - تجاهل الطلب');
      return;
    }
    
    console.log('🎯 بدء إنهاء الجلسة مع السجلات:', {
      sessionId,
      recordsCount: Object.keys(attendanceRecords).length,
      studentsCount: students.length,
      isSessionCompleted,
      isFinishing: isFinishingRef.current
    });

    // حساب الإحصائيات بدقة
    const actualPresentCount = students.filter(s => attendanceRecords[s.id] === 'present').length;
    const actualAbsentCount = students.filter(s => attendanceRecords[s.id] === 'absent').length;
    const totalStudents = students.length;
    const totalRecorded = actualPresentCount + actualAbsentCount;
    
    console.log('🔍 تشخيص إحصائيات الحضور النهائية:', {
      totalStudents,
      totalRecorded,
      actualPresentCount,
      actualAbsentCount,
      attendanceRecords,
      sessionId: sessionId
    });

    
    // التأكد من أن الجلسة مكتملة
    setIsSessionCompleted(true);
    setIsSubmitting(false);
    
    // عرض التنبيه
    showAttendanceCompleteAlert(actualPresentCount, actualAbsentCount, () => {
      console.log('🚪 العودة للشاشة السابقة بعد إكمال الجلسة');
      navigation.goBack();
    });
  }, [sessionId, attendanceRecords, students, classId, state.currentTeacher?.id, isSessionCompleted, navigation]);





  const renderStudentItem = ({ item: student, index }: { item: any, index: number }) => {
    const studentStatus = attendanceRecords[student.id];

    return (
      <View style={styles.studentItem}>
        <View style={styles.studentInfo}>
          <View style={styles.studentNumber}>
            <Text style={styles.studentNumberText}>{index + 1}</Text>
          </View>
          <Text style={styles.studentName}>{student.name}</Text>
        </View>
        
        <View style={styles.attendanceButtons}>
          <TouchableOpacity
            style={[
              styles.statusButton,
              styles.absentButton,
              studentStatus === 'absent' && styles.selectedButton,
              isSessionCompleted && styles.disabledButton
            ]}
            onPress={() => {
              if (!isSessionCompleted) {
                markStudentAttendance(student.id, 'absent');
              }
            }}
            disabled={isSessionCompleted}
          >
            <Text style={[
              styles.statusButtonText,
              studentStatus === 'absent' && styles.selectedButtonText
            ]}>
              ✗
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.statusButton,
              styles.presentButton,
              studentStatus === 'present' && styles.selectedButton,
              isSessionCompleted && styles.disabledButton
            ]}
            onPress={() => {
              if (!isSessionCompleted) {
                markStudentAttendance(student.id, 'present');
              }
            }}
            disabled={isSessionCompleted}
          >
            <Text style={[
              styles.statusButtonText,
              studentStatus === 'present' && styles.selectedButtonText
            ]}>
              ✓
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
        {isSessionCompleted ? (
          <View style={styles.completedContainer}>
            <Text style={styles.completedTitle}>✅ تم إكمال الجلسة</Text>
            <Text style={styles.completedSubtitle}>
              تم تسجيل حضور جميع الطلاب بنجاح
            </Text>
            <TouchableOpacity
              style={styles.newSessionButton}
              onPress={() => {
                setIsSessionCompleted(false);
                setAttendanceRecords({});
                setIsSessionStarted(false);
                setSessionId(null);
                isFinishingRef.current = false; // إعادة تعيين حالة الإنهاء
                
                // بدء جلسة جديدة فوراً
                setTimeout(() => {
                  startAttendanceSession();
                }, 100);
              }}
            >
              <Text style={styles.newSessionButtonText}>جلسة جديدة</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backToClassesButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backToClassesButtonText}>العودة للفصول</Text>
            </TouchableOpacity>
          </View>
        ) : !isSessionStarted ? (
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
                {totalRecorded} من {students.length} طالب
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(totalRecorded / students.length) * 100}%` }
                  ]} 
                />
              </View>
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                  حاضر: {presentCount} | غائب: {absentCount}
                </Text>
              </View>
            </View>

            <View style={styles.studentsListContainer}>
              <FlatList
                data={students}
                renderItem={renderStudentItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.studentsList}
              />
            </View>

            <View style={styles.submitContainer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!isAllStudentsRecorded || isSubmitting || isSessionCompleted) && styles.disabledButton
                ]}
                onPress={submitAttendance}
                disabled={!isAllStudentsRecorded || isSubmitting || isSessionCompleted}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'جاري التسليم...' : 'تسليم الحضور'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Realtime notifications removed - using simple alerts instead */}
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
    marginBottom: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
  progressText: {
    fontSize: 18,
    fontFamily: fontFamilies.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 12,
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    ...shadows.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  studentsListContainer: {
    flex: 1,
    marginTop: 20,
  },
  studentsList: {
    paddingBottom: 20,
  },
  studentItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  studentNumber: {
    backgroundColor: '#007bff',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentNumberText: {
    color: 'white',
    fontSize: 14,
    fontFamily: fontFamilies.bold,
  },
  studentName: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
    color: '#2c3e50',
    flex: 1,
  },
  attendanceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  absentButton: {
    backgroundColor: '#f8f9fa',
    borderColor: colors.danger,
  },
  presentButton: {
    backgroundColor: '#f8f9fa',
    borderColor: colors.success,
  },
  selectedButton: {
    backgroundColor: colors.primary,
  },
  statusButtonText: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    color: '#6c757d',
  },
  selectedButtonText: {
    color: 'white',
  },
  statsContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: colors.text.secondary,
  },
  submitContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.md,
  },
  submitButtonText: {
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
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  completedTitle: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    color: colors.success,
    marginBottom: 16,
    textAlign: 'center',
  },
  completedSubtitle: {
    fontSize: 18,
    fontFamily: fontFamilies.regular,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 28,
  },
  newSessionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    marginBottom: 16,
    ...shadows.md,
  },
  newSessionButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    textAlign: 'center',
  },
  backToClassesButton: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  backToClassesButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    textAlign: 'center',
  },
});
