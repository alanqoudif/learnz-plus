import * as Haptics from 'expo-haptics';

/**
 * تشغيل haptic feedback خفيف
 * مثالي للنقرات العادية والتفاعلات الخفيفة
 */
export const lightHaptic = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    // تجاهل الأخطاء - haptics اختياري
    console.debug('Haptics not available:', error);
  }
};

/**
 * تشغيل haptic feedback متوسط
 * مثالي للأزرار المهمة والتفاعلات الرئيسية
 */
export const mediumHaptic = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    console.debug('Haptics not available:', error);
  }
};

/**
 * تشغيل haptic feedback قوي
 * مثالي للإجراءات المهمة جداً والتنبيهات
 */
export const heavyHaptic = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    console.debug('Haptics not available:', error);
  }
};

/**
 * تشغيل haptic feedback للنجاح
 * عند إتمام عملية بنجاح
 */
export const successHaptic = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.debug('Haptics not available:', error);
  }
};

/**
 * تشغيل haptic feedback للتحذير
 * عند حدوث تحذير أو إجراء يحتاج انتباه
 */
export const warningHaptic = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    console.debug('Haptics not available:', error);
  }
};

/**
 * تشغيل haptic feedback للخطأ
 * عند حدوث خطأ أو فشل عملية
 */
export const errorHaptic = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    console.debug('Haptics not available:', error);
  }
};

/**
 * تشغيل haptic feedback للاختيار
 * عند تغيير القيمة في picker أو switch
 */
export const selectionHaptic = async () => {
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.debug('Haptics not available:', error);
  }
};

