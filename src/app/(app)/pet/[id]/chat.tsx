/** AI consultation chat, per pet. Helps decide if and when to see a vet. */
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, HeroHeader, Icon, IconButton, Loading, TriageCard } from '@/components';
import { goBack } from '@/lib/nav';
import { db, type ChatMessage } from '@/data';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { colors, fonts, radius, sizes, space } from '@/theme';

const SUGGESTIONS = ['הקיא פעם אחת, מה לעשות?', 'מגרד הרבה כבר כמה ימים', 'אכל משהו שלא היה צריך', 'כמה פעמים ביום להאכיל?'];

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { demo } = useAuth();
  const insets = useSafeAreaInsets();
  const [petName, setPetName] = useState('');
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    Promise.all([db().getPet(id), db().list('chat_messages', id)]).then(([pet, msgs]) => {
      setPetName(pet?.name ?? '');
      setMessages(msgs);
    });
  }, [id]);

  async function send(raw = text) {
    const body = raw.trim();
    if (!body || sending) return;
    setText('');
    setError(null);
    setSending(true);
    // Optimistic user bubble
    const temp: ChatMessage = { id: 'pending', pet_id: id, role: 'user', content: body, triage_level: null, created_at: new Date().toISOString() };
    setMessages((m) => [...(m ?? []), temp]);
    try {
      const saved = await db().sendChat(id, body);
      setMessages((m) => [...(m ?? []).filter((x) => x.id !== 'pending'), ...saved]);
    } catch (e) {
      setMessages((m) => (m ?? []).filter((x) => x.id !== 'pending'));
      setText(body);
      setError(e instanceof Error ? e.message : 'השליחה נכשלה');
    } finally {
      setSending(false);
    }
  }

  async function clear() {
    if (!messages?.length) return;
    const ok = await confirm('למחוק את השיחה?', 'כל ההודעות עם הסוכן על החיה הזו יימחקו.', 'מחיקה', true);
    if (!ok) return;
    for (const m of messages) await db().remove('chat_messages', m.id);
    setMessages([]);
  }

  if (!messages) return <Loading />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <HeroHeader
        onBack={goBack}
        topAction={messages.length ? <IconButton icon="trash-outline" label="מחיקת השיחה" onPress={clear} /> : undefined}
        eyebrow={petName ? `על ${petName}` : undefined}
        title="התייעצות"
      />
      <View style={styles.disclaimer} accessibilityRole="text">
        <Icon name="information-circle" color={colors.brand} size={20} />
        <AppText variant="small" style={styles.grow}>
          הסוכן עוזר להחליט אם ומתי ללכת לווטרינר. הוא לא מחליף וטרינר. במצב חירום, פנו מיד למיון וטרינרי.
          {demo ? ' במצב הדגמה התשובות הן לדוגמה.' : ''}
        </AppText>
      </View>

      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View style={styles.empty}>
            <AppText variant="h2">מה קורה עם {petName}?</AppText>
            <AppText tone="muted">תאר מה ראית. הסוכן מכיר את הגיל, המשקל, האלרגיות והתרופות של {petName}.</AppText>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} onPress={() => send(s)} style={styles.suggestion} accessibilityRole="button" accessibilityLabel={s}>
                  <AppText variant="label" tone="brand">
                    {s}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubbleRow, m.role === 'user' ? styles.mine : styles.theirs]}>
            <View style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.botBubble]}>
              <AppText tone={m.role === 'user' ? 'white' : 'ink'}>{m.content}</AppText>
              {m.role === 'assistant' && m.triage_level && <TriageCard level={m.triage_level} />}
            </View>
          </View>
        ))}
        {sending && (
          <View style={[styles.bubbleRow, styles.theirs]}>
            <View style={[styles.bubble, styles.botBubble]}>
              <AppText tone="muted">כותב תשובה…</AppText>
            </View>
          </View>
        )}
        {error && (
          <AppText variant="small" tone="danger" center>
            {error}
          </AppText>
        )}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + space.s1 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="כתוב מה קורה…"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={2000}
          style={styles.input}
          accessibilityLabel="הודעה לסוכן"
        />
        <Pressable
          onPress={() => send()}
          disabled={!text.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="שליחה"
          style={[styles.send, (!text.trim() || sending) && styles.sendOff]}
        >
          <Icon name="forward" color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.page },
  grow: { flex: 1 },
  disclaimer: {
    flexDirection: 'row',
    gap: space.s1,
    alignItems: 'flex-start',
    margin: space.s2,
    marginBottom: 0,
    padding: space.s2,
    borderRadius: radius.md,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  list: { padding: space.s2, gap: space.s2, flexGrow: 1 },
  empty: { gap: space.s2, paddingTop: space.s2 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s1 },
  suggestion: { minHeight: sizes.minTouch, justifyContent: 'center', paddingHorizontal: space.s2, borderRadius: radius.pill, backgroundColor: colors.panel, borderWidth: 1.5, borderColor: colors.line },
  bubbleRow: { flexDirection: 'row' },
  // Like WhatsApp in Hebrew: own messages on the left (end), answers on the right (start).
  mine: { justifyContent: 'flex-end' },
  theirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '88%', borderRadius: radius.lg, padding: space.s2, gap: space.s2 },
  userBubble: { backgroundColor: colors.brand },
  botBubble: { backgroundColor: colors.panel },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: space.s1, paddingHorizontal: space.s2, paddingTop: space.s1, backgroundColor: colors.panel, borderTopWidth: 1, borderTopColor: colors.line },
  input: {
    flex: 1,
    minHeight: sizes.buttonHeight,
    maxHeight: 140,
    borderRadius: radius.lg,
    backgroundColor: colors.page,
    paddingHorizontal: space.s2,
    paddingTop: 14,
    paddingBottom: 14,
    fontFamily: fonts.body400,
    fontSize: 17,
    color: colors.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  send: { width: sizes.buttonHeight, height: sizes.buttonHeight, borderRadius: radius.pill, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
});
