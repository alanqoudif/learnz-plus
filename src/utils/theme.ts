// ألوان التطبيق - نظام حديث ومحسّن
export const colors = {
  // الألوان الأساسية - Modern & Professional
  primary: '#6366f1', // Indigo - أكثر حداثة
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',

  secondary: '#64748b', // Slate - أنعم من الرمادي القديم
  secondaryLight: '#94a3b8',
  secondaryDark: '#475569',

  success: '#10b981', // Emerald - أكثر حيوية
  successLight: '#34d399',
  successDark: '#059669',

  danger: '#ef4444', // Red - أكثر نعومة
  dangerLight: '#f87171',
  dangerDark: '#dc2626',

  warning: '#f59e0b', // Amber - أفضل من الأصفر الفاقع
  warningLight: '#fbbf24',
  warningDark: '#d97706',

  info: '#06b6d4', // Cyan - أكثر إشراقاً
  infoLight: '#22d3ee',
  infoDark: '#0891b2',

  // ألوان النص - محسّنة للوضوح
  text: {
    primary: '#1e293b', // Slate 800 - تباين ممتاز
    secondary: '#64748b', // Slate 500
    tertiary: '#94a3b8', // Slate 400
    light: '#ffffff',
    dark: '#0f172a', // Slate 900
    muted: '#cbd5e1', // Slate 300
  },

  // ألوان الخلفية - تدرجات ناعمة
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc', // Slate 50 - أنعم من القديم
    tertiary: '#f1f5f9', // Slate 100
    light: '#ffffff',
    dark: '#0f172a', // Slate 900
    card: '#ffffff',
    overlay: 'rgba(15, 23, 42, 0.5)',
  },

  // ألوان الحدود - تدرجات متناسقة
  border: {
    light: '#f1f5f9', // Slate 100
    medium: '#e2e8f0', // Slate 200
    dark: '#cbd5e1', // Slate 300
    focus: '#6366f1', // Primary للتركيز
  },

  // ألوان الحالة - واضحة وجذابة
  status: {
    present: '#10b981', // Green
    presentBg: '#d1fae5', // Green 100
    absent: '#ef4444', // Red
    absentBg: '#fee2e2', // Red 100
    pending: '#f59e0b', // Amber
    pendingBg: '#fef3c7', // Amber 100
  },

  // ألوان Accent للتفاصيل
  accent: {
    purple: '#a855f7',
    pink: '#ec4899',
    orange: '#f97316',
    teal: '#14b8a6',
  },
};

// أحجام الخطوط
export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
};

// أوزان الخطوط
export const fontWeights = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

// عائلات الخطوط
export const fontFamilies = {
  regular: 'TheYearofHandicrafts-Regular',
  medium: 'TheYearofHandicrafts-Medium',
  semibold: 'TheYearofHandicrafts-SemiBold',
  bold: 'TheYearofHandicrafts-Bold',
  black: 'TheYearofHandicrafts-Black',
};

// المسافات
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

// أنماط الظلال
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
};

// أنماط الحدود
export const borderRadius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  full: 9999,
};

