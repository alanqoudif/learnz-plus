// وظائف مساعدة

import { MESSAGES, DATE_FORMATS } from './constants';

// تنسيق التاريخ
export const formatDate = (date: Date, format: string = DATE_FORMATS.DISPLAY): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  switch (format) {
    case DATE_FORMATS.DISPLAY:
      return `${day}/${month}/${year}`;
    case DATE_FORMATS.DISPLAY_WITH_TIME:
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    case DATE_FORMATS.ARABIC:
      return `${year}/${month}/${day}`;
    case DATE_FORMATS.ARABIC_WITH_TIME:
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    default:
      return date.toLocaleDateString('ar-SA');
  }
};

// تنسيق الوقت
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// تنسيق التاريخ باللغة العربية
export const formatDateArabic = (date: Date): string => {
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// تنسيق التاريخ والوقت باللغة العربية
export const formatDateTimeArabic = (date: Date): string => {
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// التحقق من أن التاريخ هو اليوم
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

// التحقق من أن التاريخ هو أمس
export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

// الحصول على النص المناسب للتاريخ
export const getDateText = (date: Date): string => {
  if (isToday(date)) {
    return 'اليوم';
  } else if (isYesterday(date)) {
    return 'أمس';
  } else {
    return formatDateArabic(date);
  }
};

// تنسيق رقم الهاتف
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return cleaned;
};

// تنسيق الاسم (إزالة المسافات الزائدة)
export const formatName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ');
};

// تنسيق اسم الفصل
export const formatClassName = (className: string): string => {
  return className.trim();
};

// تنسيق الشعبة
export const formatSection = (section: string): string => {
  return section.trim();
};

// الحصول على النسبة المئوية
export const getPercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
};

// تنسيق النسبة المئوية
export const formatPercentage = (value: number, total: number): string => {
  const percentage = getPercentage(value, total);
  return `${percentage}%`;
};

// الحصول على لون الحالة
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'present':
      return '#28a745';
    case 'absent':
      return '#dc3545';
    case 'pending':
      return '#ffc107';
    default:
      return '#6c757d';
  }
};

// الحصول على نص الحالة
export const getStatusText = (status: string): string => {
  switch (status) {
    case 'present':
      return 'حاضر';
    case 'absent':
      return 'غائب';
    case 'pending':
      return 'لم يتم التسجيل';
    default:
      return 'غير محدد';
  }
};

// الحصول على لون النسبة المئوية
export const getPercentageColor = (percentage: number): string => {
  if (percentage >= 80) return '#28a745';
  if (percentage >= 60) return '#ffc107';
  return '#dc3545';
};

// الحصول على نص النسبة المئوية مع اللون
export const getPercentageText = (percentage: number): { text: string; color: string } => {
  return {
    text: `${percentage}%`,
    color: getPercentageColor(percentage),
  };
};

// الحصول على رسالة الخطأ المناسبة
export const getErrorMessage = (error: string): string => {
  switch (error) {
    case 'INVALID_NAME':
      return MESSAGES.ERROR.INVALID_NAME;
    case 'INVALID_PHONE':
      return MESSAGES.ERROR.INVALID_PHONE;
    case 'INVALID_CLASS_NAME':
      return MESSAGES.ERROR.INVALID_CLASS_NAME;
    case 'INVALID_SECTION':
      return MESSAGES.ERROR.INVALID_SECTION;
    case 'INVALID_STUDENT_NAME':
      return MESSAGES.ERROR.INVALID_STUDENT_NAME;
    case 'CLASS_EXISTS':
      return MESSAGES.ERROR.CLASS_EXISTS;
    case 'STUDENT_EXISTS':
      return MESSAGES.ERROR.STUDENT_EXISTS;
    case 'NO_STUDENTS':
      return MESSAGES.ERROR.NO_STUDENTS;
    case 'NO_CLASSES':
      return MESSAGES.ERROR.NO_CLASSES;
    case 'NO_ATTENDANCE_RECORDS':
      return MESSAGES.ERROR.NO_ATTENDANCE_RECORDS;
    case 'TEACHER_NOT_FOUND':
      return MESSAGES.ERROR.TEACHER_NOT_FOUND;
    case 'CLASS_NOT_FOUND':
      return MESSAGES.ERROR.CLASS_NOT_FOUND;
    case 'STUDENT_NOT_FOUND':
      return MESSAGES.ERROR.STUDENT_NOT_FOUND;
    default:
      return MESSAGES.ERROR.GENERIC_ERROR;
  }
};

// الحصول على رسالة النجاح المناسبة
export const getSuccessMessage = (action: string): string => {
  switch (action) {
    case 'LOGIN':
      return MESSAGES.SUCCESS.LOGIN;
    case 'ADD_CLASS':
      return MESSAGES.SUCCESS.ADD_CLASS;
    case 'ADD_STUDENT':
      return MESSAGES.SUCCESS.ADD_STUDENT;
    case 'UPDATE_STUDENT':
      return MESSAGES.SUCCESS.UPDATE_STUDENT;
    case 'DELETE_STUDENT':
      return MESSAGES.SUCCESS.DELETE_STUDENT;
    case 'DELETE_CLASS':
      return MESSAGES.SUCCESS.DELETE_CLASS;
    case 'ATTENDANCE_COMPLETE':
      return MESSAGES.SUCCESS.ATTENDANCE_COMPLETE;
    default:
      return 'تم بنجاح';
  }
};

// الحصول على رسالة التحذير المناسبة
export const getWarningMessage = (action: string): string => {
  switch (action) {
    case 'DELETE_CLASS':
      return MESSAGES.WARNING.DELETE_CLASS;
    case 'DELETE_STUDENT':
      return MESSAGES.WARNING.DELETE_STUDENT;
    case 'LOGOUT':
      return MESSAGES.WARNING.LOGOUT;
    case 'UNSAVED_CHANGES':
      return MESSAGES.WARNING.UNSAVED_CHANGES;
    default:
      return 'تحذير';
  }
};

// الحصول على رسالة المعلومات المناسبة
export const getInfoMessage = (action: string): string => {
  switch (action) {
    case 'ADD_FIRST_CLASS':
      return MESSAGES.INFO.ADD_FIRST_CLASS;
    case 'ADD_FIRST_STUDENT':
      return MESSAGES.INFO.ADD_FIRST_STUDENT;
    case 'START_ATTENDANCE':
      return MESSAGES.INFO.START_ATTENDANCE;
    case 'NO_ATTENDANCE_TODAY':
      return MESSAGES.INFO.NO_ATTENDANCE_TODAY;
    default:
      return 'معلومة';
  }
};

// الحصول على النص المناسب للزر
export const getButtonText = (action: string): string => {
  switch (action) {
    case 'LOGIN':
      return 'تسجيل الدخول';
    case 'LOGOUT':
      return 'تسجيل الخروج';
    case 'ADD':
      return 'إضافة';
    case 'EDIT':
      return 'تعديل';
    case 'DELETE':
      return 'حذف';
    case 'SAVE':
      return 'حفظ';
    case 'CANCEL':
      return 'إلغاء';
    case 'CONFIRM':
      return 'تأكيد';
    case 'BACK':
      return 'رجوع';
    case 'NEXT':
      return 'التالي';
    case 'PREVIOUS':
      return 'السابق';
    case 'FINISH':
      return 'إنهاء';
    case 'START':
      return 'بدء';
    case 'CONTINUE':
      return 'متابعة';
    case 'CLOSE':
      return 'إغلاق';
    case 'OK':
      return 'موافق';
    case 'YES':
      return 'نعم';
    case 'NO':
      return 'لا';
    default:
      return action;
  }
};

// الحصول على النص المناسب للحقل
export const getFieldLabel = (field: string): string => {
  switch (field) {
    case 'NAME':
      return 'الاسم';
    case 'PHONE':
      return 'رقم الهاتف';
    case 'CLASS_NAME':
      return 'اسم الفصل';
    case 'SECTION':
      return 'الشعبة';
    case 'STUDENT_NAME':
      return 'اسم الطالب';
    case 'DATE':
      return 'التاريخ';
    case 'TIME':
      return 'الوقت';
    case 'STATUS':
      return 'الحالة';
    case 'PRESENT':
      return 'حاضر';
    case 'ABSENT':
      return 'غائب';
    case 'TOTAL':
      return 'المجموع';
    default:
      return field;
  }
};

// الحصول على النص المناسب للعنوان
export const getTitle = (title: string): string => {
  switch (title) {
    case 'APP_NAME':
      return 'تطبيق الحضور والغياب';
    case 'LOGIN':
      return 'تسجيل الدخول';
    case 'DASHBOARD':
      return 'الصفحة الرئيسية';
    case 'ADD_CLASS':
      return 'إضافة فصل دراسي';
    case 'EDIT_CLASS':
      return 'تعديل الفصل الدراسي';
    case 'STUDENT_MANAGEMENT':
      return 'إدارة الطلاب';
    case 'ADD_STUDENT':
      return 'إضافة طالب';
    case 'EDIT_STUDENT':
      return 'تعديل الطالب';
    case 'ATTENDANCE':
      return 'تسجيل الحضور';
    case 'ATTENDANCE_HISTORY':
      return 'تاريخ الحضور';
    case 'CLASSES':
      return 'الفصول الدراسية';
    case 'STUDENTS':
      return 'الطلاب';
    case 'ATTENDANCE_RECORDS':
      return 'سجلات الحضور';
    default:
      return title;
  }
};

// الحصول على النص المناسب للوصف
export const getDescription = (description: string): string => {
  switch (description) {
    case 'APP_DESCRIPTION':
      return 'تطبيق بسيط وسهل لإدارة حضور وغياب الطلاب';
    case 'LOGIN_DESCRIPTION':
      return 'أدخل اسمك ورقم هاتفك للدخول';
    case 'ADD_CLASS_DESCRIPTION':
      return 'أدخل تفاصيل الفصل الدراسي';
    case 'ADD_STUDENT_DESCRIPTION':
      return 'أدخل اسم الطالب';
    case 'ATTENDANCE_DESCRIPTION':
      return 'اسحب الكارت لليمين للحضور أو لليسار للغياب';
    case 'HISTORY_DESCRIPTION':
      return 'عرض سجلات الحضور السابقة';
    default:
      return description;
  }
};

// الحصول على النصائح المناسبة
export const getTips = (tips: string): string[] => {
  switch (tips) {
    case 'ADD_CLASS':
      return [
        'يمكنك إضافة عدة شعب لنفس الفصل (مثل: الخامس أ، الخامس ب)',
        'بعد إضافة الفصل، يمكنك إضافة الطلاب إليه',
        'يمكنك تسجيل الحضور والغياب للطلاب',
      ];
    case 'ADD_STUDENT':
      return [
        'أدخل اسم الطالب كاملاً',
        'يمكنك إضافة عدة طلاب في نفس الوقت',
        'يمكنك تعديل أو حذف الطلاب لاحقاً',
      ];
    case 'ATTENDANCE':
      return [
        'اسحب الكارت لليمين لتسجيل الحضور',
        'اسحب الكارت لليسار لتسجيل الغياب',
        'يمكنك استخدام الأزرار اليدوية أيضاً',
        'سيتم حفظ السجل تلقائياً عند الانتهاء',
      ];
    default:
      return [];
  }
};
