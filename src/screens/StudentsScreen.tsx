import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Class } from '../types';
import { fontFamilies, spacing, borderRadius } from '../utils/theme';
import { ocrService } from '../services/ocrService';
import { lightHaptic, successHaptic } from '../utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SheetStep = 'options' | 'manual' | 'ocr';

interface OcrCandidate {
  id: string;
  name: string;
  selected: boolean;
}

export default function StudentsScreen({ navigation }: any) {
  const { state, createStudent } = useApp();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const classes = state.classes;
  const [selectedClassId, setSelectedClassId] = useState<string | null>(classes[0]?.id ?? null);
  const selectedClass = useMemo<Class | null>(
    () => classes.find(cls => cls.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetStep, setSheetStep] = useState<SheetStep>('options');
  const [studentName, setStudentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrCandidates, setOcrCandidates] = useState<OcrCandidate[]>([]);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [selectedRosterFiles, setSelectedRosterFiles] = useState<string[]>([]);

  const totalStudents = classes.reduce((sum, cls) => sum + cls.students.length, 0);

  const openSheet = useCallback((classId?: string) => {
    lightHaptic();
    setSelectedClassId(classId || selectedClassId || classes[0]?.id || null);
    setSheetStep('options');
    setStudentName('');
    setOcrCandidates([]);
    setSheetVisible(true);
  }, [classes, selectedClassId]);

  const closeSheet = useCallback(() => {
    setSheetVisible(false);
    setSheetStep('options');
    setStudentName('');
    setOcrCandidates([]);
    setIsOcrLoading(false);
    setSelectedRosterFiles([]);
  }, []);

  const handleManualSubmit = useCallback(async () => {
    if (!selectedClass) {
      Alert.alert('اختر فصلاً', 'يرجى اختيار الفصل أولاً.');
      return;
    }

    if (!studentName.trim()) {
      Alert.alert('الاسم مطلوب', 'أدخل اسم الطالب.');
      return;
    }

    const exists = selectedClass.students.some(
      student => student.name.trim().toLowerCase() === studentName.trim().toLowerCase()
    );
    if (exists) {
      Alert.alert('موجود مسبقاً', 'هناك طالب بنفس الاسم في هذا الفصل.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createStudent({
        name: studentName.trim(),
        classId: selectedClass.id,
      });
      successHaptic();
      closeSheet();
      Alert.alert('تمت الإضافة', `تمت إضافة ${studentName.trim()} إلى ${selectedClass.name}.`);
    } catch (error) {
      console.error('Error creating student', error);
      Alert.alert('خطأ', 'تعذر إضافة الطالب. تحقق من اتصالك أو صلاحياتك.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedClass, studentName, createStudent, closeSheet]);

  const handlePickRoster = useCallback(async () => {
    if (!selectedClass) {
      Alert.alert('اختر فصلاً', 'يرجى اختيار الفصل أولاً.');
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const assets = 'assets' in result && Array.isArray(result.assets)
      ? result.assets
      : (result as any).assets
        ? (result as any).assets
        : [(result as any)];

    const uris = assets
      .map((item: any) => item.uri)
      .filter(Boolean);

    if (!uris.length) {
      Alert.alert('لم يتم تحديد ملفات', 'اختر ملفاً واحداً على الأقل.');
      return;
    }

    try {
      setIsOcrLoading(true);
      setSheetStep('ocr');
      setSelectedRosterFiles(
        assets.map((item: any) => item.name || item.uri?.split('/').pop() || 'ملف بدون اسم')
      );
      const parsed = await ocrService.processSheets(uris);
      const formatted = parsed.map((student, index) => ({
        id: `${Date.now()}-${index}`,
        name: student.name.trim(),
        selected: true,
      }));
      setOcrCandidates(formatted);
    } catch (error: any) {
      console.error('OCR error', error);
      Alert.alert(
        'فشل قراءة الشيت',
        error?.message || 'تأكد من وضوح الملفات المختارة ثم حاول مرة أخرى.'
      );
      setSheetStep('options');
    } finally {
      setIsOcrLoading(false);
    }
  }, [selectedClass]);

  const handleSaveOcrStudents = useCallback(async () => {
    if (!selectedClass) return;
    const toSave = ocrCandidates.filter(candidate => candidate.selected && candidate.name.trim());
    if (!toSave.length) {
      Alert.alert('حدد الطلاب', 'اختر طالباً واحداً على الأقل للإضافة.');
      return;
    }

    try {
      setIsSubmitting(true);
      let added = 0;
      for (const candidate of toSave) {
        const exists = selectedClass.students.some(
          student => student.name.trim().toLowerCase() === candidate.name.trim().toLowerCase()
        );
        if (!exists) {
          await createStudent({
            name: candidate.name.trim(),
            classId: selectedClass.id,
          });
          added++;
        }
      }
      successHaptic();
      Alert.alert('تم التحديث', `تمت إضافة ${added} طالب${added !== 1 ? 'اً' : ''}.`);
      closeSheet();
    } catch (error) {
      console.error('Error saving OCR students', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إضافة الطلاب.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedClass, ocrCandidates, closeSheet, createStudent]);

  const renderStudentCircle = (name: string, index: number) => (
    <View key={`${name}-${index}`} style={[styles.avatar, { backgroundColor: colors.background.secondary }]}>
      <Text style={styles.avatarText}>{name.slice(0, 2)}</Text>
    </View>
  );

  const renderClassCard = ({ item }: { item: Class }) => (
    <View style={[styles.classCard, { backgroundColor: colors.background.card }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.classTitle, { color: colors.text.primary }]}>{item.name}</Text>
          <Text style={[styles.classSubtitle, { color: colors.text.secondary }]}>
            شعبة {item.section} • {item.students.length} طالب
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addPill, { backgroundColor: colors.primary }]}
          onPress={() => openSheet(item.id)}
        >
          <Ionicons name="person-add-outline" size={18} color="#fff" />
          <Text style={styles.addPillText}>طالب جديد</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.studentRow}>
        {item.students.slice(0, 4).map((student, index) => renderStudentCircle(student.name, index))}
        {item.students.length > 4 && (
          <View style={[styles.avatar, { backgroundColor: colors.background.secondary }]}>
            <Text style={styles.avatarText}>+{item.students.length - 4}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.cardButton, { borderColor: colors.border.light }]}
          onPress={() => navigation.navigate('StudentManagement', { classId: item.id })}
        >
          <Ionicons name="list-outline" size={16} color={colors.text.primary} />
          <Text style={[styles.cardButtonText, { color: colors.text.primary }]}>إدارة الفصل</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cardButton, { borderColor: colors.primary }]}
          onPress={() => navigation.navigate('Attendance', { classId: item.id })}
        >
          <Ionicons name="checkbox-outline" size={16} color={colors.primary} />
          <Text style={[styles.cardButtonText, { color: colors.primary }]}>جلسة حضور</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={48} color={colors.primary} />
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>لا يوجد فصول</Text>
      <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
        أضف فصلاً من تبويب الحضور ثم ارجع لإدارة الطلاب هنا.
      </Text>
    </View>
  );

  const renderSheetContent = () => {
    if (!selectedClass) {
      return (
        <View style={styles.sheetBody}>
          <Text style={styles.sheetWarning}>اختر فصلاً لبدء إضافة الطلاب</Text>
        </View>
      );
    }

    if (sheetStep === 'manual') {
      return (
        <View style={styles.sheetBody}>
          <Text style={styles.sheetSubtitle}>إضافة يدوية إلى {selectedClass.name}</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>اسم الطالب</Text>
            <TextInput
              value={studentName}
              onChangeText={setStudentName}
              placeholder="مثال: أحمد محمد"
              placeholderTextColor={colors.text.tertiary}
              style={[styles.input, { color: colors.text.primary, borderColor: colors.border.light }]}
            />
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleManualSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ الطالب'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (sheetStep === 'ocr') {
      return (
        <View style={[styles.sheetBody, { maxHeight: 420 }]}>
          <Text style={styles.sheetSubtitle}>
            {isOcrLoading ? 'جارٍ قراءة الشيت...' : `مراجعة ${ocrCandidates.length} طالب`}
          </Text>
          {isOcrLoading ? (
            <Text style={styles.loadingText}>جارٍ استخراج الأسماء باستخدام Tesseract OCR...</Text>
          ) : (
            <>
              {selectedRosterFiles.length > 0 && (
                <View style={styles.filesList}>
                  {selectedRosterFiles.map((file, idx) => (
                    <Text key={`${file}-${idx}`} style={styles.fileItem}>
                      • {file}
                    </Text>
                  ))}
                </View>
              )}
            <ScrollView style={styles.candidatesList}>
              {ocrCandidates.map(candidate => (
                <View
                  key={candidate.id}
                  style={[styles.candidateRow, { borderColor: candidate.selected ? colors.primary : colors.border.light }]}
                >
                  <TouchableOpacity onPress={() => {
                    setOcrCandidates(prev => prev.map(item => item.id === candidate.id ? { ...item, selected: !item.selected } : item));
                  }}>
                    <Ionicons
                      name={candidate.selected ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={candidate.selected ? colors.primary : colors.text.secondary}
                    />
                  </TouchableOpacity>
                  <TextInput
                    value={candidate.name}
                    onChangeText={text => {
                      setOcrCandidates(prev => prev.map(item => item.id === candidate.id ? { ...item, name: text } : item));
                    }}
                    style={[styles.candidateInput, { color: colors.text.primary }]}
                  />
                </View>
              ))}
            </ScrollView>
            </>
          )}
          {!isOcrLoading && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveOcrStudents}
              disabled={isSubmitting}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? 'جاري الإضافة...' : `إضافة ${ocrCandidates.filter(c => c.selected).length} طالب`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.sheetBody}>
        <Text style={styles.sheetSubtitle}>كيف تود إضافة الطلاب؟</Text>
        <TouchableOpacity
          style={[styles.optionButton, { borderColor: colors.border.light }]}
          onPress={() => setSheetStep('manual')}
        >
          <Ionicons name="person-add" size={20} color={colors.text.primary} />
          <View>
            <Text style={[styles.optionTitle, { color: colors.text.primary }]}>إضافة يدوية</Text>
            <Text style={[styles.optionSubtitle, { color: colors.text.secondary }]}>
              استخدم نموذج آبل البسيط
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.optionButton, { borderColor: colors.border.light }]}
          onPress={handlePickRoster}
        >
          <Ionicons name="scan-outline" size={20} color={colors.primary} />
          <View>
            <Text style={[styles.optionTitle, { color: colors.text.primary }]}>مسح الشيت (OCR)</Text>
            <Text style={[styles.optionSubtitle, { color: colors.text.secondary }]}>
              رفع صورة وتحويلها إلى أسماء تلقائياً
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.hero}>
        <View>
          <Text style={[styles.heroLabel, { color: colors.text.secondary }]}>مركز الطلاب</Text>
          <Text style={[styles.heroValue, { color: colors.text.primary }]}>{totalStudents} طالب</Text>
        </View>
        <TouchableOpacity
          style={[styles.heroButton, { backgroundColor: colors.primary }]}
          onPress={() => openSheet()}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.heroButtonText}>إضافة</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={classes}
        renderItem={renderClassCard}
        keyExtractor={item => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[styles.listContent, { paddingBottom: spacing['4xl'] + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContainer, { backgroundColor: colors.background.secondary }]}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={closeSheet}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
              <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>
                {selectedClass ? selectedClass.name : 'اختر فصل'}
              </Text>
              <View style={{ width: 22 }} />
            </View>
            {renderSheetContent()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    direction: 'rtl',
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroLabel: {
    fontSize: 16,
    fontFamily: fontFamilies.medium,
  },
  heroValue: {
    fontSize: 32,
    fontFamily: fontFamilies.bold,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 24,
  },
  heroButtonText: {
    color: '#fff',
    fontFamily: fontFamilies.semibold,
  },
  listContent: {
    paddingBottom: spacing['4xl'],
  },
  classCard: {
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
  },
  classSubtitle: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 18,
  },
  addPillText: {
    color: '#fff',
    fontFamily: fontFamilies.semibold,
  },
  studentRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fontFamilies.semibold,
    color: '#1C1C1E',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cardButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  cardButtonText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: spacing['4xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: fontFamilies.regular,
    textAlign: 'center',
    lineHeight: 22,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
  },
  sheetBody: {
    gap: spacing.md,
  },
  sheetSubtitle: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
  },
  sheetWarning: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    color: '#6E6E73',
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamilies.regular,
    backgroundColor: '#fff',
  },
  primaryButton: {
    borderRadius: 18,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: fontFamilies.semibold,
  },
  optionSubtitle: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
  },
  loadingText: {
    textAlign: 'center',
    fontFamily: fontFamilies.medium,
    color: '#6E6E73',
  },
  candidatesList: {
    maxHeight: 280,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  candidateInput: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: 15,
  },
  filesList: {
    marginBottom: spacing.sm,
  },
  fileItem: {
    fontFamily: fontFamilies.regular,
    color: '#6E6E73',
    fontSize: 13,
    textAlign: 'right',
  },
});
