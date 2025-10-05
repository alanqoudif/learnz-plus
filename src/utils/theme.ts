// ألوان التطبيق
export const colors = {
  // الألوان الأساسية
  primary: '#007bff',
  secondary: '#6c757d',
  success: '#28a745',
  danger: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8',
  
  // ألوان النص
  text: {
    primary: '#2c3e50',
    secondary: '#6c757d',
    light: '#ffffff',
    dark: '#212529',
  },
  
  // ألوان الخلفية
  background: {
    primary: '#ffffff',
    secondary: '#f8f9fa',
    light: '#ffffff',
    dark: '#343a40',
  },
  
  // ألوان الحدود
  border: {
    light: '#e9ecef',
    medium: '#dee2e6',
    dark: '#adb5bd',
  },
  
  // ألوان الحالة
  status: {
    present: '#28a745',
    absent: '#dc3545',
    pending: '#ffc107',
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

// أنماط الأزرار
export const buttonStyles = {
  primary: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  secondary: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  success: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  danger: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};

// أنماط النصوص
export const textStyles = {
  heading: {
    fontSize: fontSizes['2xl'],
    fontFamily: fontFamilies.bold,
    color: colors.text.primary,
  },
  subheading: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.semibold,
    color: colors.text.primary,
  },
  body: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.regular,
    color: colors.text.primary,
  },
  caption: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.regular,
    color: colors.text.secondary,
  },
  button: {
    fontSize: fontSizes.base,
    fontFamily: fontFamilies.semibold,
    color: colors.text.light,
  },
};

// أنماط الحاويات
export const containerStyles = {
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  section: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  modal: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.lg,
  },
};
