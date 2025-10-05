import { Alert } from 'react-native';

// أنواع التنبيهات
export type AlertType = 'success' | 'error' | 'warning' | 'info';

// وظيفة لعرض التنبيهات
export const showAlert = (
  type: AlertType,
  title: string,
  message: string,
  buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>
) => {
  const defaultButtons = [
    {
      text: 'موافق',
      style: 'default' as const,
    },
  ];

  Alert.alert(title, message, buttons || defaultButtons);
};

// تنبيهات مخصصة للاستخدامات الشائعة
export const showSuccessAlert = (message: string, onPress?: () => void) => {
  showAlert('success', 'تم بنجاح', message, [
    {
      text: 'موافق',
      onPress,
    },
  ]);
};

export const showErrorAlert = (message: string, onPress?: () => void) => {
  showAlert('error', 'خطأ', message, [
    {
      text: 'موافق',
      onPress,
    },
  ]);
};

export const showWarningAlert = (message: string, onPress?: () => void) => {
  showAlert('warning', 'تحذير', message, [
    {
      text: 'موافق',
      onPress,
    },
  ]);
};

export const showInfoAlert = (message: string, onPress?: () => void) => {
  showAlert('info', 'معلومة', message, [
    {
      text: 'موافق',
      onPress,
    },
  ]);
};

// تنبيه تأكيد الحذف
export const showDeleteConfirmation = (
  itemName: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  showAlert('warning', 'تأكيد الحذف', `هل أنت متأكد من حذف "${itemName}"؟`, [
    {
      text: 'إلغاء',
      style: 'cancel',
      onPress: onCancel,
    },
    {
      text: 'حذف',
      style: 'destructive',
      onPress: onConfirm,
    },
  ]);
};

// تنبيه تأكيد تسجيل الخروج
export const showLogoutConfirmation = (onConfirm: () => void) => {
  showAlert('warning', 'تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
    {
      text: 'إلغاء',
      style: 'cancel',
    },
    {
      text: 'تسجيل الخروج',
      style: 'destructive',
      onPress: onConfirm,
    },
  ]);
};

// تنبيه انتهاء تسجيل الحضور
export const showAttendanceCompleteAlert = (
  presentCount: number,
  absentCount: number,
  onPress?: () => void
) => {
  showAlert('success', 'تم الانتهاء', `تم تسجيل الحضور بنجاح!\n\nالحاضرون: ${presentCount}\nالغائبون: ${absentCount}`, [
    {
      text: 'موافق',
      onPress,
    },
  ]);
};
