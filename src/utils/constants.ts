// ثوابت التطبيق

// رسائل التنبيهات
export const MESSAGES = {
  // رسائل النجاح
  SUCCESS: {
    LOGIN: 'تم تسجيل الدخول بنجاح',
    ADD_CLASS: 'تم إضافة الفصل الدراسي بنجاح',
    ADD_STUDENT: 'تم إضافة الطالب بنجاح',
    UPDATE_STUDENT: 'تم تحديث بيانات الطالب بنجاح',
    DELETE_STUDENT: 'تم حذف الطالب بنجاح',
    DELETE_CLASS: 'تم حذف الفصل الدراسي بنجاح',
    ATTENDANCE_COMPLETE: 'تم تسجيل الحضور بنجاح',
  },
  
  // رسائل الخطأ
  ERROR: {
    LOGIN_FAILED: 'فشل في تسجيل الدخول',
    INVALID_NAME: 'يرجى إدخال اسم صحيح',
    INVALID_PHONE: 'يرجى إدخال رقم هاتف صحيح',
    INVALID_CLASS_NAME: 'يرجى إدخال اسم فصل صحيح',
    INVALID_SECTION: 'يرجى إدخال شعبة صحيحة',
    INVALID_STUDENT_NAME: 'يرجى إدخال اسم طالب صحيح',
    CLASS_EXISTS: 'يوجد بالفعل فصل بنفس الاسم والشعبة',
    STUDENT_EXISTS: 'يوجد بالفعل طالب بنفس الاسم',
    NO_STUDENTS: 'لا يوجد طلاب في هذا الفصل',
    NO_CLASSES: 'لا توجد فصول دراسية',
    NO_ATTENDANCE_RECORDS: 'لا توجد سجلات حضور',
    TEACHER_NOT_FOUND: 'لم يتم العثور على بيانات المعلم',
    CLASS_NOT_FOUND: 'لم يتم العثور على الفصل الدراسي',
    STUDENT_NOT_FOUND: 'لم يتم العثور على الطالب',
    GENERIC_ERROR: 'حدث خطأ غير متوقع',
  },
  
  // رسائل التحذير
  WARNING: {
    DELETE_CLASS: 'سيتم حذف جميع الطلاب وسجلات الحضور المرتبطة بهذا الفصل',
    DELETE_STUDENT: 'سيتم حذف جميع سجلات الحضور المرتبطة بهذا الطالب',
    LOGOUT: 'هل أنت متأكد من تسجيل الخروج؟',
    UNSAVED_CHANGES: 'لديك تغييرات غير محفوظة',
  },
  
  // رسائل المعلومات
  INFO: {
    ADD_FIRST_CLASS: 'ابدأ بإضافة فصل دراسي جديد لإدارة حضور وغياب الطلاب',
    ADD_FIRST_STUDENT: 'ابدأ بإضافة الطلاب إلى هذا الفصل',
    START_ATTENDANCE: 'اسحب الكارت لليمين للحضور أو لليسار للغياب',
    NO_ATTENDANCE_TODAY: 'لم يتم تسجيل الحضور اليوم',
  },
};

// نصوص الأزرار
export const BUTTON_TEXTS = {
  LOGIN: 'تسجيل الدخول',
  LOGOUT: 'تسجيل الخروج',
  ADD: 'إضافة',
  EDIT: 'تعديل',
  DELETE: 'حذف',
  SAVE: 'حفظ',
  CANCEL: 'إلغاء',
  CONFIRM: 'تأكيد',
  BACK: 'رجوع',
  NEXT: 'التالي',
  PREVIOUS: 'السابق',
  FINISH: 'إنهاء',
  START: 'بدء',
  CONTINUE: 'متابعة',
  CLOSE: 'إغلاق',
  OK: 'موافق',
  YES: 'نعم',
  NO: 'لا',
};

// نصوص الحقول
export const FIELD_LABELS = {
  NAME: 'الاسم',
  PHONE: 'رقم الهاتف',
  CLASS_NAME: 'اسم الفصل',
  SECTION: 'الشعبة',
  STUDENT_NAME: 'اسم الطالب',
  DATE: 'التاريخ',
  TIME: 'الوقت',
  STATUS: 'الحالة',
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  TOTAL: 'المجموع',
};

// نصوص العناوين
export const TITLES = {
  APP_NAME: 'تطبيق الحضور والغياب',
  LOGIN: 'تسجيل الدخول',
  DASHBOARD: 'الصفحة الرئيسية',
  ADD_CLASS: 'إضافة فصل دراسي',
  EDIT_CLASS: 'تعديل الفصل الدراسي',
  STUDENT_MANAGEMENT: 'إدارة الطلاب',
  ADD_STUDENT: 'إضافة طالب',
  EDIT_STUDENT: 'تعديل الطالب',
  ATTENDANCE: 'تسجيل الحضور',
  ATTENDANCE_HISTORY: 'تاريخ الحضور',
  CLASSES: 'الفصول الدراسية',
  STUDENTS: 'الطلاب',
  ATTENDANCE_RECORDS: 'سجلات الحضور',
};

// نصوص الوصف
export const DESCRIPTIONS = {
  APP_DESCRIPTION: 'تطبيق بسيط وسهل لإدارة حضور وغياب الطلاب',
  LOGIN_DESCRIPTION: 'أدخل اسمك ورقم هاتفك للدخول',
  ADD_CLASS_DESCRIPTION: 'أدخل تفاصيل الفصل الدراسي',
  ADD_STUDENT_DESCRIPTION: 'أدخل اسم الطالب',
  ATTENDANCE_DESCRIPTION: 'اسحب الكارت لليمين للحضور أو لليسار للغياب',
  HISTORY_DESCRIPTION: 'عرض سجلات الحضور السابقة',
};

// نصائح الاستخدام
export const TIPS = {
  ADD_CLASS: [
    'يمكنك إضافة عدة شعب لنفس الفصل (مثل: الخامس أ، الخامس ب)',
    'بعد إضافة الفصل، يمكنك إضافة الطلاب إليه',
    'يمكنك تسجيل الحضور والغياب للطلاب',
  ],
  ADD_STUDENT: [
    'أدخل اسم الطالب كاملاً',
    'يمكنك إضافة عدة طلاب في نفس الوقت',
    'يمكنك تعديل أو حذف الطلاب لاحقاً',
  ],
  ATTENDANCE: [
    'اسحب الكارت لليمين لتسجيل الحضور',
    'اسحب الكارت لليسار لتسجيل الغياب',
    'يمكنك استخدام الأزرار اليدوية أيضاً',
    'سيتم حفظ السجل تلقائياً عند الانتهاء',
  ],
};

// حدود التحقق
export const VALIDATION_LIMITS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  PHONE_MIN_LENGTH: 8,
  PHONE_MAX_LENGTH: 15,
  CLASS_NAME_MIN_LENGTH: 1,
  CLASS_NAME_MAX_LENGTH: 20,
  SECTION_MIN_LENGTH: 1,
  SECTION_MAX_LENGTH: 10,
  STUDENT_NAME_MIN_LENGTH: 2,
  STUDENT_NAME_MAX_LENGTH: 50,
};

// إعدادات التطبيق
export const APP_SETTINGS = {
  MAX_CLASSES_PER_TEACHER: 50,
  MAX_STUDENTS_PER_CLASS: 100,
  MAX_ATTENDANCE_RECORDS_PER_SESSION: 1000,
  AUTO_SAVE_INTERVAL: 30000, // 30 ثانية
  SESSION_TIMEOUT: 3600000, // ساعة واحدة
};

// أنماط التاريخ والوقت
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_WITH_TIME: 'dd/MM/yyyy HH:mm',
  ARABIC: 'yyyy/MM/dd',
  ARABIC_WITH_TIME: 'yyyy/MM/dd HH:mm',
};

// أنواع الحالة
export const STATUS_TYPES = {
  PRESENT: 'present',
  ABSENT: 'absent',
  PENDING: 'pending',
} as const;

// أنواع الإجراءات
export const ACTION_TYPES = {
  ADD: 'add',
  EDIT: 'edit',
  DELETE: 'delete',
  VIEW: 'view',
} as const;