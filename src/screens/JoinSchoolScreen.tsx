import React, { useCallback, useState } from 'react';
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
import { BarCodeScanner, type BarCodeScannerResult } from 'expo-barcode-scanner';
import { fontFamilies, colors } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { joinSchoolByTeacherCode } from '../services/schoolService';

export default function JoinSchoolScreen({ navigation }: any) {
  const { state, dispatch } = useApp();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [requestingPermission, setRequestingPermission] = useState(false);

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

  const requestCameraPermission = useCallback(async () => {
    try {
      setRequestingPermission(true);
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setCameraStatus(status === 'granted' ? 'granted' : 'denied');
      return status === 'granted';
    } catch (error) {
      setCameraStatus('denied');
      Alert.alert('خطأ', 'تعذر طلب صلاحية الكاميرا');
      return false;
    } finally {
      setRequestingPermission(false);
    }
  }, []);

  const openScanner = useCallback(async () => {
    if (cameraStatus !== 'granted') {
      const granted = await requestCameraPermission();
      if (!granted) {
        Alert.alert('السماح بالكاميرا', 'نحتاج إذناً للوصول للكاميرا لمسح رمز QR.');
        return;
      }
    }
    setScannerVisible(true);
  }, [cameraStatus, requestCameraPermission]);

  const handleBarCodeScanned = useCallback((result: BarCodeScannerResult) => {
    setScannerVisible(false);
    if (result?.data) {
      const normalized = result.data.trim().toUpperCase();
      setCode(normalized);
      Alert.alert('تم التقاط الرمز', 'تحقق من الرمز ثم اضغط زر الانضمام لإكمال العملية.');
    }
  }, []);

  const closeScanner = () => setScannerVisible(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>الانضمام للمدرسة</Text>
      <Text style={styles.subtitle}>
        أدخل رمز المعلم أو رمز المدرسة الذي شاركه قائدك. يمكنك أيضًا مسح رمز QR مباشرة من جهاز زميلك.
      </Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="مثال: AB23F9"
        placeholderTextColor="#999"
        autoCapitalize="characters"
        textAlign="center"
      />
      <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
        <Text style={styles.scanText}>
          {requestingPermission ? 'جاري تفعيل الكاميرا...' : 'مسح رمز QR'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.joinButton, isJoining && { opacity: 0.7 }]}
        onPress={handleJoin}
        disabled={isJoining}
      >
        {isJoining ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinText}>انضمام</Text>}
      </TouchableOpacity>

      <Modal visible={scannerVisible} animationType="slide">
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>امسح رمز المدرسة</Text>
            <TouchableOpacity onPress={closeScanner} style={styles.closeScannerButton}>
              <Text style={styles.closeScannerText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.scannerBox}>
            <BarCodeScanner
              style={StyleSheet.absoluteFillObject}
              onBarCodeScanned={handleBarCodeScanned}
            />
          </View>
          <Text style={styles.scannerHint}>
            وجه الكاميرا نحو رمز QR الذي يظهر على جهاز زميلك أو في بطاقة الدعوة.
          </Text>
        </View>
      </Modal>
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
  scanButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  scanText: {
    color: colors.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  joinText: {
    color: '#fff',
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  scannerHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  scannerTitle: {
    fontFamily: fontFamilies.bold,
    color: '#fff',
    fontSize: 20,
  },
  closeScannerButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fff',
  },
  closeScannerText: {
    color: '#fff',
    fontFamily: fontFamilies.semibold,
  },
  scannerBox: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  scannerHint: {
    textAlign: 'center',
    color: '#fff',
    fontFamily: fontFamilies.regular,
    marginTop: 16,
  },
});
