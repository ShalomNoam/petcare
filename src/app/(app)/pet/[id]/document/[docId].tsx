/** The original document + everything in the record that came from it. */
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyLine, ErrorView, HeroHeader, Loading, Pill, RecordRow, Screen, SectionHeader } from '@/components';
import { goBack } from '@/lib/nav';
import { db } from '@/data';
import { syncAutoReminders } from '@/data/reminders';
import { useQuery } from '@/data/useQuery';
import { runExtraction } from '@/features/documents';
import { confirm, notify } from '@/lib/confirm';
import { formatDate, formatKg } from '@/lib/format';
import { alertKindLabel, docTypeLabel, eventKindLabel, vaccinationKindLabel } from '@/lib/labels';
import { colors, radius, space } from '@/theme';

async function load(petId: string, docId: string) {
  const doc = await db().get('documents', docId);
  if (!doc) return null;
  const [url, alerts, medications, events, vaccinations, weights] = await Promise.all([
    db().fileUrl(doc.file_path).catch(() => null),
    db().list('alerts', petId),
    db().list('medications', petId),
    db().list('events', petId),
    db().list('vaccinations', petId),
    db().list('weights', petId),
  ]);
  const mine = <T extends { document_id: string | null }>(rows: T[]) => rows.filter((r) => r.document_id === docId);
  const linked = [
    ...mine(alerts).map((a) => ({ id: a.id, title: a.title, overline: alertKindLabel[a.kind] })),
    ...mine(events).map((e) => ({ id: e.id, title: e.title, overline: `${eventKindLabel[e.kind]} · ${formatDate(e.event_date)}` })),
    ...mine(medications).map((m) => ({ id: m.id, title: m.name, overline: 'תרופה' })),
    ...mine(vaccinations).map((v) => ({ id: v.id, title: v.name, overline: `${vaccinationKindLabel[v.kind]} · ${formatDate(v.given_on)}` })),
    ...mine(weights).map((w) => ({ id: w.id, title: formatKg(w.kg), overline: `משקל · ${formatDate(w.measured_on)}` })),
  ];
  return { doc, url, linked };
}

export default function DocumentView() {
  const { id, docId } = useLocalSearchParams<{ id: string; docId: string }>();
  const { data, loading, error, reload } = useQuery(() => load(id, docId), [id, docId]);
  const [reading, setReading] = useState(false);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <ErrorView message="המסמך לא נמצא" />;
  const { doc, url, linked } = data;
  const isImage = doc.mime_type.startsWith('image/');
  const title = doc.title ?? (doc.doc_type ? docTypeLabel[doc.doc_type] : 'מסמך');

  async function openFile() {
    if (!url) return notify('הקובץ לא זמין', 'במצב הדגמה אין קבצים לדוגמה.');
    if (Platform.OS === 'web') window.open(url, '_blank');
    else await WebBrowser.openBrowserAsync(url);
  }

  async function read() {
    setReading(true);
    try {
      await runExtraction(doc.id);
      router.push({ pathname: '/pet/[id]/review/[docId]', params: { id, docId: doc.id } });
    } catch (e) {
      notify('הקריאה נכשלה', e instanceof Error ? e.message : undefined);
    } finally {
      setReading(false);
      reload();
    }
  }

  async function remove() {
    const ok = await confirm('למחוק את המסמך?', 'הקובץ המקורי יימחק. פרטים שנכנסו לתיק ממנו יישארו, בלי הקישור למסמך.', 'מחיקה', true);
    if (!ok) return;
    await db().remove('documents', doc.id);
    await syncAutoReminders(id);
    goBack();
  }

  return (
    <Screen header={<HeroHeader onBack={goBack} eyebrow={doc.doc_date ? formatDate(doc.doc_date) : undefined} title={title} />}>
      <Card size="xl" style={styles.card}>
        <SectionHeader number={1} title="הקובץ המקורי" />
        {isImage && url ? (
          <Image source={{ uri: url }} style={styles.image} contentFit="contain" accessibilityLabel={`צילום של ${title}`} />
        ) : (
          <AppText tone="muted">{url ? 'קובץ PDF' : 'הקובץ לא זמין במצב הדגמה.'}</AppText>
        )}
        <Button label={isImage ? 'פתיחה במסך מלא' : 'פתיחת הקובץ'} variant="secondary" icon="open-outline" onPress={openFile} />
      </Card>

      {doc.extraction_status === 'ready' && (
        <Card size="xl" style={styles.card}>
          <Pill label="מחכה לאישור" tone="sun" />
          <AppText>ה-AI קרא את המסמך. בדוק מה ייכנס לתיק.</AppText>
          <Button label="בדיקה ואישור" withArrow onPress={() => router.push({ pathname: '/pet/[id]/review/[docId]', params: { id, docId: doc.id } })} />
        </Card>
      )}
      {(doc.extraction_status === 'none' || doc.extraction_status === 'failed') && (
        <Card size="xl" style={styles.card}>
          {doc.extraction_status === 'failed' && <Pill label="הקריאה הקודמת נכשלה" tone="danger" />}
          <Button label="קריאה עם AI" withArrow icon="sparkles-outline" loading={reading} onPress={read} />
        </Card>
      )}

      <Card size="xl">
        <SectionHeader number={2} title="נכנס לתיק מהמסמך" />
        {linked.length === 0 && <EmptyLine text="עוד לא נכנסו פרטים מהמסמך הזה." />}
        {linked.map((l, i) => (
          <RecordRow key={l.id} overline={l.overline} title={l.title} last={i === linked.length - 1} />
        ))}
      </Card>

      <View>
        <Button label="מחיקת המסמך" variant="ghost" icon="trash-outline" onPress={remove} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.s2 },
  image: { width: '100%', height: 360, borderRadius: radius.md, backgroundColor: colors.page },
});
