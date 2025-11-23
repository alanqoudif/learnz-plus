import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { fontFamilies, spacing, borderRadius, shadows } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { joinSchoolByTeacherCode } from '../services/schoolService';

export default function JoinSchoolScreen({ navigation }: any) {
  const { state, dispatch } = useApp();
  const { colors } = useTheme();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async () => {
    if (!state.userProfile?.id) return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('خطأ', 'يرجى إدخال رمز الدعوة');
      return;
    }
    setIsJoining(true);
    try {
      const school = await joinSchoolByTeacherCode(state.userProfile.id, trimmed);
      if ((state as any).userProfile) {
        dispatch({
          type: 'SET_USER_PROFILE',
          payload: {
            ...(state as any).userProfile,
            schoolId: school.id,
            schoolName: school.name,
            role: 'member',
          },
        });
      }
      Alert.alert('تم', 'تم الانضمام للمدرسة بنجاح');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'تعذر الانضمام');
    } finally {
      setIsJoining(false);
    }
  };


  const dynamicStyles = useMemo(() => ({
    container: { backgroundColor: colors.background.secondary },
    title: { color: colors.text.primary },
    subtitle: { color: colors.text.secondary },
    input: { 
      backgroundColor: colors.background.primary,
      borderColor: colors.border.medium,
      color: colors.text.primary
    },
    joinButton: { backgroundColor: colors.primary },
  }), [colors]);

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.title, dynamicStyles.title]}>الانضمام للمدرسة</Text>
      <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
        أدخل رمز المعلم أو رمز المدرسة الذي شاركه قائدك.
      </Text>
      <TextInput
        style={[styles.input, dynamicStyles.input]}
        value={code}
        onChangeText={setCode}
        placeholder="مثال: AB23F9"
        placeholderTextColor={colors.text.tertiary}
        autoCapitalize="characters"
        textAlign="center"
      />
      <TouchableOpacity
        style={[styles.joinButton, dynamicStyles.joinButton, isJoining && { opacity: 0.7 }]}
        onPress={handleJoin}
        disabled={isJoining}
      >
        {isJoining ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinText}>انضمام</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  title: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    marginBottom: spacing.sm,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  joinButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing['2xl'],
    width: '100%',
    alignItems: 'center',
  },
  joinText: {
    color: '#ffffff',
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    textAlign: 'center',
  },
});
