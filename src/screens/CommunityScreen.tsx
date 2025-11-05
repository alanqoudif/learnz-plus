import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { fontFamilies } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { firestore, COLLECTIONS } from '../config/firebase';
import { CommunityPost } from '../types';
import { communityService } from '../services/communityService';

export default function CommunityScreen() {
  const { state } = useApp();
  const schoolId = (state as any).userProfile?.schoolId || null;
  const userId = state.currentTeacher?.id || null;
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<CommunityPost>>(null);

  useEffect(() => {
    if (!schoolId) return;
    const sub = communityService.subscribeToCommunity(schoolId, (items) => {
      setPosts(items);
    });
    return () => sub.unsubscribe();
  }, [schoolId]);

  const canSend = useMemo(() => !!schoolId && !!userId && (title.trim().length > 0 || body.trim().length > 0) && !sending, [schoolId, userId, title, body, sending]);

  const onSend = async () => {
    if (!canSend || !schoolId || !userId) return;
    try {
      setSending(true);
      await communityService.createAnnouncementPost(schoolId, userId, { title: title.trim(), body: body.trim() });
      setTitle('');
      setBody('');
      // scroll to top (newest first)
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
    } catch (e) {
      console.warn('Failed to send post', e);
    } finally {
      setSending(false);
    }
  };

  if (!schoolId) {
    return (
      <JoinByCode />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <Text style={styles.header}>مجتمع المدرسة</Text>
          <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString('ar-SA')}</Text>
          </View>
        )}
          />
          <View style={styles.composer}>
            <TextInput
          style={styles.input}
          placeholder="عنوان مختصر"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#95a5a6"
              returnKeyType="next"
              blurOnSubmit={false}
        />
            <TextInput
          style={[styles.input, styles.multi]}
          placeholder="اكتب رسالة للمجتمع"
          value={body}
          onChangeText={setBody}
          placeholderTextColor="#95a5a6"
          multiline
              returnKeyType="send"
              onSubmitEditing={() => { if (canSend) { Keyboard.dismiss(); onSend(); } }}
        />
            <TouchableOpacity disabled={!canSend} onPress={() => { Keyboard.dismiss(); onSend(); }} style={[styles.sendBtn, !canSend && { opacity: 0.5 }]}> 
              <Text style={styles.sendText}>{sending ? 'جاري الإرسال...' : 'إرسال'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { fontSize: 22, fontFamily: fontFamilies.bold, padding: 16, color: '#2c3e50' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  title: { fontSize: 16, fontFamily: fontFamilies.semibold, color: '#2c3e50', marginBottom: 6 },
  body: { fontSize: 14, fontFamily: fontFamilies.regular, color: '#6c757d' },
  meta: { fontSize: 12, color: '#95a5a6', marginTop: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  note: { fontFamily: fontFamilies.regular, color: '#7f8c8d' },
  composer: { padding: 12, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  input: { backgroundColor: '#f4f6f7', borderRadius: 10, padding: 12, fontFamily: fontFamilies.regular, color: '#2c3e50', marginBottom: 8 },
  multi: { minHeight: 60, textAlignVertical: 'top' },
  sendBtn: { backgroundColor: '#2ecc71', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  sendText: { color: '#fff', fontFamily: fontFamilies.semibold },
});

function JoinByCode() {
  const { state, refreshData } = useApp();
  const userId = state.currentTeacher?.id || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onlyDigits = (t: string) => t.replace(/\D/g, '').slice(0, 6);

  const onChange = (t: string) => setCode(onlyDigits(t));
  const canJoin = code.length === 6 && !loading && !!userId;

  const onJoin = async () => {
    if (!canJoin) return;
    try {
      setLoading(true);
      await communityService.joinSchoolByCode(userId, code);
      Keyboard.dismiss();
      await refreshData();
    } catch (e: any) {
      console.warn(e?.message || e);
      alert(e?.message || 'فشل الانضمام');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
      <Text style={{ textAlign: 'center', fontFamily: fontFamilies.bold, fontSize: 18, marginBottom: 12 }}>أدخل رمز الدعوة (6 أرقام)</Text>
      <TextInput
        style={{
          backgroundColor: '#f4f6f7',
          borderRadius: 12,
          padding: 14,
          textAlign: 'center',
          fontFamily: fontFamilies.semibold,
          letterSpacing: 8,
          color: '#2c3e50'
        }}
        keyboardType="number-pad"
        value={code}
        onChangeText={onChange}
        placeholder="______"
        placeholderTextColor="#bdc3c7"
        maxLength={6}
        returnKeyType="done"
        onSubmitEditing={() => { if (canJoin) onJoin(); }}
      />
      <TouchableOpacity onPress={onJoin} disabled={!canJoin} style={{ backgroundColor: '#2980b9', opacity: canJoin ? 1 : 0.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 16 }}>
        <Text style={{ color: '#fff', fontFamily: fontFamilies.semibold }}>{loading ? 'جاري الانضمام...' : 'انضمام'}</Text>
      </TouchableOpacity>
    </View>
  );
}


