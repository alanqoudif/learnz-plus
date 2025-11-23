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
  SafeAreaView,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fontFamilies, spacing, borderRadius, shadows } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { joinSchoolByTeacherCode } from '../services/schoolService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function JoinSchoolScreen({ navigation }: any) {
  const { state, dispatch } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const handleJoin = async (joinCode?: string) => {
    if (!state.userProfile?.id) return;
    const trimmed = (joinCode || code).trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('خطأ', 'يرجى إدخال رمز الدعوة');
      return;
    }
    setIsJoining(true);
    setShowScanner(false);
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
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    if (status === 'granted') {
      setShowScanner(true);
    } else {
      Alert.alert('صلاحيات مطلوبة', 'يرجى منح إذن الوصول للكاميرا لمسح QR Code');
    }
  }, []);

  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    // استخراج الرمز من QR Code
    const scannedCode = data.trim().toUpperCase();
    if (scannedCode) {
      setCode(scannedCode);
      setShowScanner(false);
      // AutoFill والانضمام تلقائياً
      handleJoin(scannedCode);
    }
  }, []);


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
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <Text style={[styles.title, dynamicStyles.title]}>الانضمام للمدرسة</Text>
      <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
        أدخل رمز المعلم أو رمز المدرسة الذي شاركه قائدك، أو امسح QR Code.
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
        style={[styles.scanButton, { borderColor: colors.primary, borderWidth: 1 }]}
        onPress={requestCameraPermission}
      >
        <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
        <Text style={[styles.scanButtonText, { color: colors.primary }]}>مسح QR Code</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.joinButton, dynamicStyles.joinButton, isJoining && { opacity: 0.7 }]}
        onPress={() => handleJoin()}
        disabled={isJoining}
      >
        {isJoining ? <ActivityIndicator color="#fff" /> : <Text style={styles.joinText}>انضمام</Text>}
      </TouchableOpacity>

      {/* QR Code Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <SafeAreaView style={[styles.scannerContainer, { backgroundColor: '#000' }]}>
          <View style={[styles.scannerHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity
              onPress={() => setShowScanner(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>امسح QR Code</Text>
            <View style={{ width: 28 }} />
          </View>
          {hasPermission && (
            <BarCodeScanner
              onBarCodeScanned={showScanner ? handleBarCodeScanned : undefined}
              style={styles.scanner}
            />
          )}
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerHint}>
              ضع QR Code داخل الإطار
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
  scanButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  scanButtonText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  scannerTitle: {
    color: '#fff',
    fontFamily: fontFamilies.bold,
    fontSize: 18,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scanner: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
  },
  scannerHint: {
    marginTop: spacing['2xl'],
    color: '#fff',
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
});
