// ألوان النظام - تصميم بنفسجي وأبيض نظيف
export const lightColors = {
  primary: '#7C3AED', // بنفسجي
  secondary: '#8B5CF6', // بنفسجي فاتح
  success: '#10B981', // أخضر للنجاح (مبقي عليه للحالات الضرورية)
  danger: '#EF4444', // أحمر للخطر
  warning: '#F59E0B',
  info: '#7C3AED', // بنفسجي للمعلومات

  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    card: '#FFFFFF',
  },

  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    light: '#FFFFFF',
  },

  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
  },
};

export const darkColors = {
  primary: '#8B5CF6', // بنفسجي للوضع الداكن
  secondary: '#A78BFA',
  success: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',
  info: '#8B5CF6',

  background: {
    primary: '#1F2937',
    secondary: '#111827',
    tertiary: '#374151',
    card: '#1F2937',
  },

  text: {
    primary: '#F9FAFB',
    secondary: '#D1D5DB',
    tertiary: '#9CA3AF',
    light: '#FFFFFF',
  },

  border: {
    light: '#374151',
    medium: '#4B5563',
    dark: '#6B7280',
  },
};

// تصدير الألوان الافتراضية
export const colors = lightColors;

// أحجام الخطوط
export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

// عائلات الخطوط
export const fontFamilies = {
  regular: 'TheYearofHandicrafts-Regular',
  medium: 'TheYearofHandicrafts-Medium',
  semibold: 'TheYearofHandicrafts-SemiBold',
  bold: 'TheYearofHandicrafts-Bold',
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
};

// الظلال
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
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
