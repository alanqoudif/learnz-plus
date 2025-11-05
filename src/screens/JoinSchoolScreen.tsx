import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { fontFamilies } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { communityService } from '../services/communityService';

export default function JoinSchoolScreen({ navigation }: any) {
  const { state } = useApp();
  const [code, setCode] = useState('');

  const handleJoin = async () => {
    if (!state.currentTeacher) return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('خطأ', 'يرجى إدخال رمز الدعوة');
      return;
    }
    try {
      await communityService.joinSchoolByCode(state.currentTeacher.id, trimmed);
      Alert.alert('تم', 'تم الانضمام للمدرسة بنجاح');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'تعذر الانضمام');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>الانضمام للمدرسة</Text>
      <Text style={styles.subtitle}>أدخل رمز الدعوة الذي شاركه القائد</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="مثال: ABCD1234"
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
    backgroundColor: '#3498db',
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


