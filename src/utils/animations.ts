import { Animated, Easing } from 'react-native';

/**
 * تكوينات الـ animations القياسية
 */
export const animationConfig = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    default: Easing.bezier(0.4, 0.0, 0.2, 1), // Material Design Standard
    easeIn: Easing.in(Easing.ease),
    easeOut: Easing.out(Easing.ease),
    easeInOut: Easing.inOut(Easing.ease),
    spring: Easing.elastic(1),
  },
};

/**
 * Fade in animation
 */
export const fadeIn = (
  animatedValue: Animated.Value,
  duration: number = animationConfig.duration.normal,
  toValue: number = 1,
  callback?: () => void
) => {
  Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: animationConfig.easing.easeOut,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Fade out animation
 */
export const fadeOut = (
  animatedValue: Animated.Value,
  duration: number = animationConfig.duration.normal,
  toValue: number = 0,
  callback?: () => void
) => {
  Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: animationConfig.easing.easeIn,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Scale animation (للأزرار عند الضغط)
 */
export const scaleButton = (
  animatedValue: Animated.Value,
  toValue: number = 0.95,
  duration: number = animationConfig.duration.fast
) => {
  Animated.sequence([
    Animated.timing(animatedValue, {
      toValue,
      duration,
      easing: animationConfig.easing.easeOut,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      easing: animationConfig.easing.easeIn,
      useNativeDriver: true,
    }),
  ]).start();
};

/**
 * Spring animation - حركة طبيعية أكثر
 */
export const springAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  callback?: () => void
) => {
  Animated.spring(animatedValue, {
    toValue,
    friction: 8,
    tension: 40,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Slide in from right (للشاشات)
 */
export const slideInRight = (
  animatedValue: Animated.Value,
  fromValue: number = 100,
  duration: number = animationConfig.duration.normal,
  callback?: () => void
) => {
  animatedValue.setValue(fromValue);
  Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: animationConfig.easing.easeOut,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Slide out to left (للشاشات)
 */
export const slideOutLeft = (
  animatedValue: Animated.Value,
  toValue: number = -100,
  duration: number = animationConfig.duration.normal,
  callback?: () => void
) => {
  Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: animationConfig.easing.easeIn,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Pulse animation - للتأكيدات والتنبيهات
 */
export const pulseAnimation = (
  animatedValue: Animated.Value,
  minScale: number = 0.95,
  maxScale: number = 1.05,
  duration: number = animationConfig.duration.normal
) => {
  Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: maxScale,
        duration,
        easing: animationConfig.easing.easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: minScale,
        duration,
        easing: animationConfig.easing.easeInOut,
        useNativeDriver: true,
      }),
    ])
  ).start();
};

/**
 * Shake animation - للأخطاء
 */
export const shakeAnimation = (
  animatedValue: Animated.Value,
  callback?: () => void
) => {
  Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: 10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: -10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 50,
      useNativeDriver: true,
    }),
  ]).start(callback);
};

/**
 * Stagger animation - لقوائم العناصر
 */
export const staggerAnimation = (
  animatedValues: Animated.Value[],
  delay: number = 100,
  callback?: () => void
) => {
  const animations = animatedValues.map((value, index) =>
    Animated.timing(value, {
      toValue: 1,
      duration: animationConfig.duration.normal,
      delay: index * delay,
      easing: animationConfig.easing.easeOut,
      useNativeDriver: true,
    })
  );

  Animated.parallel(animations).start(callback);
};

/**
 * إنشاء animated value جديد
 */
export const createAnimatedValue = (initialValue: number = 0): Animated.Value => {
  return new Animated.Value(initialValue);
};

