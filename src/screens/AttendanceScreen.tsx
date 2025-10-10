import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { AttendanceRecord, AttendanceSession } from '../types';
import { showErrorAlert, showAttendanceCompleteAlert } from '../utils/notifications';
import { colors, fontFamilies, shadows, borderRadius, spacing } from '../utils/theme';
import { fadeIn, fadeOut, scaleButton } from '../utils/animations';
import { lightHaptic, successHaptic, errorHaptic } from '../utils/haptics';
import { FirebaseRealtimeService } from '../services/firebaseRealtimeService';
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
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [attendanceRecords, setAttendanceRecords] = useState<{ [key: string]: 'present' | 'absent' }>({});
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);
  const isFinishingRef = useRef(false); // لتجنب تنفيذ finishAttendanceSessionWithRecords مرتين
  // Realtime notifications removed - using simple alerts instead

  // Animation values
  const fadeAnim = useState(new Animated.Value(1))[0];
  const scaleAnim = useState(new Animated.Value(1))[0];

  const currentClass = state.classes.find(cls => cls.id === classId);
  const students = currentClass?.students || [];
  
  // استخدام useMemo لضمان تحديث currentStudent بشكل صحيح
  const currentStudent = useMemo(() => {
    const student = students[currentStudentIndex];
    console.log(`🔍 useMemo: حساب الطالب الحالي - الفهرس: ${currentStudentIndex}, الطالب: ${student?.name || 'غير موجود'}`);
    console.log(`🔍 useMemo: تفاصيل إضافية - students.length: ${students.length}, student.id: ${student?.id || 'غير موجود'}`);
    return student;
  }, [students, currentStudentIndex]);

  // إعادة تعيين الـ animations عند تغيير الطالب
  useEffect(() => {
    console.log(`━━━ تحديث الطالب ━━━`);
    console.log(`📍 الفهرس: ${currentStudentIndex}`);
    console.log(`👤 الطالب: ${currentStudent?.name || 'غير موجود'}`);
    console.log(`🆔 معرف الطالب: ${currentStudent?.id || 'غير موجود'}`);
    console.log(`📊 إجمالي الطلاب: ${students.length}`);
    console.log(`🔒 حالة التسجيل: ${isRecording ? 'مقفل' : 'متاح'}`);
    console.log(`✅ حالة الجلسة: ${isSessionCompleted ? 'مكتملة' : 'جارية'}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━`);
  }, [currentStudentIndex, currentStudent, isRecording, isSessionCompleted, students.length]);

  // Real-time updates are handled by Firebase through AppContext
  // No need for additional listeners here during active attendance session

  // تحميل الجلسة الموجودة عند التركيز على الشاشة
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 الشاشة أصبحت نشطة - إعادة تحميل البيانات...');
      console.log('🔍 حالة الجلسة الحالية:', {
        isSessionCompleted,
        currentStudentIndex,
        studentsLength: students.length,
        sessionId,
        isFinishing: isFinishingRef.current
      });
      
      // إذا كانت الجلسة مكتملة محلياً أو في حالة إنهاء، لا نعيد تعيين أي شيء
      if (isSessionCompleted || isFinishingRef.current) {
        console.log('✅ الجلسة مكتملة أو في حالة إنهاء - لا حاجة لإعادة التعيين');
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
        
        // حساب عدد الطلاب المسجلين وتحديد الفهرس التالي
        const recordedStudentsCount = existingSession.records.length;
        console.log(`📊 عدد الطلاب المسجلين: ${recordedStudentsCount} من أصل ${students.length}`);
        
        if (recordedStudentsCount > 0 && recordedStudentsCount < students.length) {
          setCurrentStudentIndex(recordedStudentsCount);
          console.log(`📍 الانتقال للطالب رقم ${recordedStudentsCount + 1} لاستكمال التسجيل`);
        } else if (recordedStudentsCount >= students.length) {
          // الجلسة مكتملة - تحديد أن الجلسة مكتملة
          setIsSessionCompleted(true);
          console.log(`✅ الجلسة مكتملة - تم تحديد حالة الإكمال`);
          // لا نعيد تعيين الفهرس للجلسة المكتملة
          console.log('🚫 لا نعيد تعيين الفهرس للجلسة المكتملة الموجودة');
        }
      } else {
        console.log('✨ لا توجد جلسة سابقة - جاهز لبدء جلسة جديدة');
        // إعادة تعيين الـ state إلى القيم الافتراضية فقط عند عدم وجود جلسة سابقة
        // ولكن فقط إذا لم تكن الجلسة مكتملة
        if (!isSessionCompleted) {
          setCurrentStudentIndex(0);
          setAttendanceRecords({});
          setIsSessionStarted(false);
          setSessionId(null);
          setIsRecording(false);
          isFinishingRef.current = false; // إعادة تعيين حالة الإنهاء
        } else {
          console.log('🚫 الجلسة مكتملة - لا نعيد تعيين أي شيء');
        }
      }
      
      return () => {
        console.log('🧹 تنظيف عند مغادرة الشاشة...');
      };
    }, [classId, state.attendanceSessions, students.length, isSessionCompleted, currentStudentIndex])
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
      setCurrentStudentIndex(0);
      setAttendanceRecords({});
      
      // إرسال تحديث في الوقت الفعلي لبدء الجلسة
      try {
        FirebaseRealtimeService.sendAttendanceUpdate(state.currentTeacher?.id || '', {
          type: 'session_started',
          sessionId: newSession.id,
          classId: classId,
          timestamp: Date.now()
        });
        console.log('📡 تم إرسال تحديث بدء الجلسة للشاشات الأخرى');
      } catch (error) {
        console.warn('⚠️ فشل في إرسال تحديث بدء الجلسة:', error);
      }
    } catch (error) {
      console.error('Error starting attendance session:', error);
      showErrorAlert('حدث خطأ أثناء بدء جلسة الحضور');
    }
  };

  const markAttendance = useCallback(async (status: 'present' | 'absent') => {
    console.log('🔘 بدء دالة markAttendance');
    console.log('   • الطالب الحالي:', currentStudent?.name || 'غير موجود');
    console.log('   • sessionId:', sessionId);
    console.log('   • isRecording:', isRecording);
    console.log('   • isSessionCompleted:', isSessionCompleted);
    console.log('   • currentStudentIndex:', currentStudentIndex);
    console.log('   • students.length:', students.length);

    if (!currentStudent || !sessionId) {
      console.log('❌ لا يمكن تسجيل الحضور - بيانات غير مكتملة');
      console.log('   • currentStudent:', !!currentStudent);
      console.log('   • sessionId:', !!sessionId);
      errorHaptic();
      return;
    }

    if (isRecording) {
      console.log('⏸️ تسجيل جاري، يرجى الانتظار');
      return;
    }

    if (isSessionCompleted) {
      console.log('✅ الجلسة مكتملة - لا يمكن تسجيل حضور إضافي');
      return;
    }

    // حفظ البيانات المطلوبة في متغيرات محلية قبل أي تحديث
    const studentToRecord = { ...currentStudent };
    const currentIndex = currentStudentIndex;
    const nextIndex = currentIndex + 1;
    const isLastStudent = nextIndex >= students.length;
    
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎯 تسجيل ${status} للطالب: ${studentToRecord.name}`);
    console.log(`📍 الفهرس الحالي: ${currentIndex}`);
    console.log(`📍 العدد الكلي: ${students.length}`);
    console.log(`📍 الفهرس التالي: ${nextIndex} ${isLastStudent ? '(آخر طالب)' : ''}`);
    console.log(`📍 الطالب التالي: ${!isLastStudent ? students[nextIndex]?.name : 'لا يوجد'}`);
    
    // Haptic feedback للتسجيل
    lightHaptic();
    
    // قفل التسجيل لمنع الضغط المتكرر
    console.log('🔒 قفل التسجيل');
    setIsRecording(true);

    try {
      // تأثير بصري محسّن
      scaleButton(scaleAnim);

      // حفظ سجل الحضور في قاعدة البيانات
      console.log('💾 بدء حفظ السجل في قاعدة البيانات...');
      await recordAttendance({
        studentId: studentToRecord.id,
        classId: classId,
        sessionId: sessionId,
        status: status,
        attendanceTime: new Date(),
      });

      console.log(`✅ تم حفظ السجل في قاعدة البيانات للطالب: ${studentToRecord.name}`);

      // تحديث السجلات المحلية
      const updatedRecords = {
        ...attendanceRecords,
        [studentToRecord.id]: status,
      };
      setAttendanceRecords(updatedRecords);
      console.log(`📝 تم تحديث السجلات المحلية`);
      
      // إرسال تحديث في الوقت الفعلي لتسجيل حضور الطالب
      try {
        FirebaseRealtimeService.sendAttendanceUpdate(state.currentTeacher?.id || '', {
          type: 'attendance_recorded',
          sessionId: sessionId,
          classId: classId,
          studentId: studentToRecord.id,
          status: status,
          timestamp: Date.now()
        });
        console.log('📡 تم إرسال تحديث تسجيل حضور الطالب للشاشات الأخرى');
      } catch (error) {
        console.warn('⚠️ فشل في إرسال تحديث تسجيل الحضور:', error);
      }

      // Success haptic عند تسجيل ناجح
      if (status === 'present') {
        successHaptic();
      }

      // إذا كان آخر طالب
      if (isLastStudent) {
        console.log(`🏁 هذا آخر طالب - جاري إنهاء الجلسة`);
        console.log(`🔍 تفاصيل آخر طالب:`, {
          studentName: studentToRecord.name,
          currentIndex: currentIndex,
          nextIndex: nextIndex,
          studentsLength: students.length,
          isLastStudent: isLastStudent,
          sessionId: sessionId
        });
        successHaptic(); // Haptic للإنجاز
        
        // تحديد أن الجلسة مكتملة فوراً لمنع أي تداخل
        setIsSessionCompleted(true);
        isFinishingRef.current = true; // منع التنفيذ المتعدد
        console.log(`✅ تم تحديد الجلسة كمكتملة`);
        
        // فك القفل فوراً
        console.log('🔓 فك قفل التسجيل (آخر طالب)');
        setIsRecording(false);
        
        // تأخير قصير لضمان اكتمال تحديث الـ state قبل إنهاء الجلسة
        setTimeout(() => {
          finishAttendanceSessionWithRecords(updatedRecords);
        }, 50);
      } else {
        // الانتقال للطالب التالي - طريقة محسنة
        console.log(`➡️ جاري الانتقال من "${studentToRecord.name}" إلى "${students[nextIndex].name}"`);
        console.log(`🔍 تفاصيل الانتقال:`, {
          fromIndex: currentIndex,
          toIndex: nextIndex,
          fromStudent: studentToRecord.name,
          toStudent: students[nextIndex]?.name,
          totalStudents: students.length
        });
        
        // فك القفل أولاً
        console.log('🔓 فك قفل التسجيل (انتقال للطالب التالي)');
        setIsRecording(false);
        
        // تحديث الفهرس مباشرة
        console.log(`📍 تحديث الفهرس من ${currentIndex} إلى ${nextIndex}`);
        setCurrentStudentIndex(nextIndex);
        
        console.log(`✅ اكتمل الانتقال - الطالب الحالي: ${students[nextIndex]?.name}`);
      }
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
    } catch (error) {
      console.error('❌ خطأ في تسجيل الحضور:', error);
      showErrorAlert('حدث خطأ أثناء تسجيل الحضور');
      console.log('🔓 فك قفل التسجيل (خطأ)');
      setIsRecording(false);
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [currentStudent, sessionId, isRecording, currentStudentIndex, students.length, classId, recordAttendance, state.currentTeacher?.id, attendanceRecords]);

  const finishAttendanceSessionWithRecords = (records: { [key: string]: 'present' | 'absent' }) => {
    if (!sessionId) return;
    
    // فحص إضافي لمنع التنفيذ المتعدد
    if (isFinishingRef.current && isSessionCompleted) {
      console.log('🚫 الجلسة في حالة إنهاء بالفعل - تجاهل الطلب');
      return;
    }
    
    console.log('🎯 بدء إنهاء الجلسة مع السجلات:', {
      sessionId,
      recordsCount: Object.keys(records).length,
      studentsCount: students.length,
      isSessionCompleted,
      isFinishing: isFinishingRef.current
    });
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
            { text: 'متابعة', onPress: () => {
              setIsSessionCompleted(true);
              showAttendanceCompleteAlert(actualPresentCount, actualAbsentCount, () => {
                console.log('🚪 العودة للشاشة السابقة بعد إكمال الجلسة الجزئية');
                // التأكد من أن الجلسة مكتملة قبل العودة
                setIsSessionCompleted(true);
                isFinishingRef.current = false; // إعادة تعيين حالة الإنهاء
                navigation.goBack();
              });
            }},
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
          console.log('📡 تم إرسال تحديث انتهاء الجلسة للشاشات الأخرى');
        } catch (error) {
          console.warn('⚠️ فشل في إرسال تحديث انتهاء الجلسة:', error);
        }
        
        // التأكد من أن الجلسة مكتملة (قد تكون محددة مسبقاً)
        setIsSessionCompleted(true);
        
        // عرض التنبيه مباشرة بدون تأخير
        showAttendanceCompleteAlert(finalPresentCount, finalAbsentCount, () => {
          console.log('🚪 العودة للشاشة السابقة بعد إكمال الجلسة');
          // التأكد من أن الجلسة مكتملة قبل العودة
          setIsSessionCompleted(true);
          isFinishingRef.current = false; // إعادة تعيين حالة الإنهاء
          navigation.goBack();
        });
      }
  };




  const renderStudentCard = () => {
    if (!currentStudent) return null;

    return (
      <Animated.View 
        key={`student-${currentStudentIndex}-${currentStudent.id}`}
        style={[
          styles.studentCard, 
          { 
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
                setCurrentStudentIndex(0);
                setAttendanceRecords({});
                setIsSessionStarted(false);
                setSessionId(null);
                setIsRecording(false);
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
                   console.log('   • sessionId:', sessionId);
                   console.log('   • isSessionCompleted:', isSessionCompleted);
                   console.log('   • students.length:', students.length);
                   
                   if (!isRecording && currentStudent && !isSessionCompleted) {
                     console.log('✅ بدء تسجيل الغياب...');
                     markAttendance('absent');
                   } else {
                     console.log('   ⚠️ لا يمكن التسجيل:', {
                       isRecording,
                       hasCurrentStudent: !!currentStudent,
                       isSessionCompleted,
                       hasSessionId: !!sessionId
                     });
                   }
                 }}
                 disabled={isRecording || !currentStudent || isSessionCompleted}
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
                   console.log('   • sessionId:', sessionId);
                   console.log('   • isSessionCompleted:', isSessionCompleted);
                   console.log('   • students.length:', students.length);
                   
                   if (!isRecording && currentStudent && !isSessionCompleted) {
                     console.log('✅ بدء تسجيل الحضور...');
                     markAttendance('present');
                   } else {
                     console.log('   ⚠️ لا يمكن التسجيل:', {
                       isRecording,
                       hasCurrentStudent: !!currentStudent,
                       isSessionCompleted,
                       hasSessionId: !!sessionId
                     });
                   }
                 }}
                 disabled={isRecording || !currentStudent || isSessionCompleted}
               >
                 <Text style={styles.manualButtonText}>حاضر</Text>
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
    backgroundColor: colors.danger,
    ...shadows.md,
  },
  presentButton: {
    backgroundColor: colors.success,
    ...shadows.md,
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
