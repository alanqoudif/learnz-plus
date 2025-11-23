import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { fontFamilies, colors } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { joinSchoolByTeacherCode } from '../services/schoolService';

export default function JoinSchoolScreen({ navigation }: any) {
  const { state, dispatch } = useApp();
  const [code, setCode] = useState('');

  const handleJoin = async () => {
    if (!state.userProfile?.id) return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('خطأ', 'يرجى إدخال رمز الدعوة');
      return;
    }
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
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>الانضمام للمدرسة</Text>
      <Text style={styles.subtitle}>أدخل رمز المعلم الذي شاركه قائد المدرسة</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="مثال: AB23F9"
        placeholderTextColor="#999"
        autoCapitalize="characters"
        textAlign="center"
      />
      <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
        <Text style={styles.joinText}>انضمام</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontFamily: fontFamilies.bold,
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  joinText: {
    color: '#fff',
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
  },
});
