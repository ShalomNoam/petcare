/** צילום מסמך: camera / gallery / PDF → upload → AI reads it → review screen. */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, HeroHeader, Icon, Loading, Screen, SectionHeader } from '@/components';
import { goBack } from '@/lib/nav';
import { runExtraction, uploadDocument } from '@/features/documents';
import { pickDocument, pickImage, type PickedFile } from '@/features/pickers';
import { useAuth } from '@/lib/auth';
import { colors, radius, space } from '@/theme';

type Phase = 'choose' | 'preview' | 'uploading' | 'reading' | 'failed';

export default function Scan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, demo } = useAuth();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [phase, setPhase] = useState<Phase>('choose');
  const [error, setError] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);

  async function choose(kind: 'camera' | 'library' | 'pdf') {
    const picked = kind === 'pdf' ? await pickDocument() : await pickImage(kind);
    if (!picked) return;
    setFile(picked);
    setPhase('preview');
    setError(null);
  }

  async function send() {
    if (!file || !user) return;
    setError(null);
    try {
      setPhase('uploading');
      const doc = docId ? { id: docId } : await uploadDocument(user.id, id, file);
      setDocId(doc.id);
      setPhase('reading');
      await runExtraction(doc.id);
      router.replace({ pathname: '/pet/[id]/review/[docId]', params: { id, docId: doc.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'משהו השתבש');
      setPhase('failed');
    }
  }

  if (phase === 'uploading') return <Loading label="מעלה את המסמך…" />;
  if (phase === 'reading') return <Loading label="ה-AI קורא את המסמך. זה לוקח עד דקה…" />;

  return (
    <Screen header={<HeroHeader onBack={goBack} title="צילום מסמך" subtitle="סיכום ביקור, בדיקת דם, מרשם או פנקס חיסונים." />}>
      {phase === 'choose' && (
        <Card size="xl" style={styles.card}>
          <SectionHeader number={1} title="בחר מסמך" />
          <Button label="צילום עכשיו" withArrow icon="camera-outline" onPress={() => choose('camera')} />
          <Button label="תמונה מהגלריה" variant="secondary" icon="images-outline" onPress={() => choose('library')} />
          <Button label="קובץ PDF" variant="secondary" icon="document-outline" onPress={() => choose('pdf')} />
        </Card>
      )}

      {(phase === 'preview' || phase === 'failed') && file && (
        <Card size="xl" style={styles.card}>
          <SectionHeader number={2} title="לשלוח לקריאה?" />
          {file.mimeType.startsWith('image/') ? (
            <Image source={{ uri: file.uri }} style={styles.preview} contentFit="contain" accessibilityLabel="תצוגה מקדימה של המסמך" />
          ) : (
            <View style={styles.pdf}>
              <Icon name="document-text-outline" size={40} color={colors.brand} />
              <AppText variant="bodyStrong">{file.name ?? 'קובץ PDF'}</AppText>
            </View>
          )}
          <AppText variant="small" tone="muted">
            הקובץ המקורי נשמר בתיק. ה-AI רק מציע מה להוסיף, ושום דבר לא נכנס לתיק בלי האישור שלך.
            {demo ? ' במצב הדגמה מוצגת תוצאה לדוגמה.' : ''}
          </AppText>
          {error && (
            <AppText variant="small" tone="danger">
              {error}
            </AppText>
          )}
          <Button label={phase === 'failed' ? 'לנסות שוב' : 'קריאה עם AI'} withArrow icon="sparkles-outline" onPress={send} />
          {phase === 'failed' && docId && (
            <Button label="לשמור בלי קריאה ולהזין ידנית" variant="ghost" onPress={() => router.replace({ pathname: '/pet/[id]', params: { id } })} />
          )}
          {phase === 'preview' && <Button label="בחירת קובץ אחר" variant="ghost" onPress={() => setPhase('choose')} />}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.s2 },
  preview: { width: '100%', height: 320, borderRadius: radius.md, backgroundColor: colors.page },
  pdf: { alignItems: 'center', gap: space.s1, padding: space.s3, borderRadius: radius.md, backgroundColor: colors.page },
});
