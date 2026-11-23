/**
 * מסך אישור: the owner sees what the AI found, edits, unticks, and confirms.
 * Nothing enters the record before this screen's "אישור והוספה לתיק".
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ChoiceChips,
  DateField,
  ErrorView,
  HeroHeader,
  Loading,
  Pill,
  Screen,
  SectionHeader,
  SwitchRow,
  TextField,
} from '@/components';
import { db, type DocType, type Extraction, type PetDocument } from '@/data';
import { goBack } from '@/lib/nav';
import { syncAutoReminders } from '@/data/reminders';
import { buildDraft, toRow, validateDraft, type DraftItem } from '@/features/reviewDraft';
import { docTypeLabel, options } from '@/lib/labels';
import { space } from '@/theme';

export default function Review() {
  const { id, docId } = useLocalSearchParams<{ id: string; docId: string }>();
  const [doc, setDoc] = useState<PetDocument | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [meta, setMeta] = useState<{ title: string; doc_type: DocType; doc_date: string | null }>({ title: '', doc_type: 'other', doc_date: null });
  const [notes, setNotes] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    db()
      .get('documents', docId)
      .then((d) => {
        setDoc(d);
        const x = d?.extracted as Extraction | null;
        if (x) {
          setItems(buildDraft(x));
          setMeta({ title: x.title ?? d?.title ?? '', doc_type: x.doc_type, doc_date: x.doc_date });
          setNotes(x.notes);
        }
      })
      .finally(() => setLoading(false));
  }, [docId]);

  if (loading) return <Loading />;
  if (!doc) return <ErrorView message="המסמך לא נמצא" />;
  if (!doc.extracted) return <ErrorView message="אין תוצאת קריאה למסמך הזה" />;

  const update = (key: string, patch: Partial<DraftItem> | { field: string; value: string | null }) =>
    setItems((list) =>
      list.map((it) =>
        it.key !== key ? it : 'field' in patch ? { ...it, values: { ...it.values, [patch.field]: patch.value } } : { ...it, ...patch },
      ),
    );

  const selected = items.filter((i) => i.include).length;

  async function confirmAll() {
    const errs = validateDraft(items);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setSaveError('יש שדות שצריך להשלים או לבטל את הסימון שלהם.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      for (const item of items.filter((i) => i.include)) {
        await db().insert(item.table, toRow(item, id, docId) as never);
      }
      await db().update('documents', docId, {
        extraction_status: 'confirmed',
        title: meta.title.trim() || docTypeLabel[meta.doc_type],
        doc_type: meta.doc_type,
        doc_date: meta.doc_date,
      });
      await syncAutoReminders(id);
      router.dismissTo({ pathname: '/pet/[id]', params: { id } });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'השמירה נכשלה');
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen header={<HeroHeader onBack={goBack} eyebrow="מה ה-AI זיהה" title="בדיקה ואישור" subtitle="אפשר לתקן כל שדה, ולבטל פריטים שלא צריך." />}>
        <Card size="xl" style={styles.card}>
          <SectionHeader number={1} title="המסמך" />
          <TextField label="שם המסמך" value={meta.title} onChangeText={(t) => setMeta((m) => ({ ...m, title: t }))} />
          <ChoiceChips label="סוג" options={options(docTypeLabel)} value={meta.doc_type} onChange={(v) => setMeta((m) => ({ ...m, doc_type: v }))} />
          <DateField label="תאריך המסמך" optional value={meta.doc_date} onChange={(v) => setMeta((m) => ({ ...m, doc_date: v }))} />
          {notes && (
            <AppText variant="small" tone="muted">
              {notes}
            </AppText>
          )}
        </Card>

        <SectionHeader number={2} title="מה ייכנס לתיק" subtitle={`${selected} מתוך ${items.length} פריטים מסומנים`} />
        {items.length === 0 && (
          <Card size="xl">
            <AppText tone="muted">לא זוהו פרטים להוספה. המסמך יישמר בתיק כפי שהוא.</AppText>
          </Card>
        )}
        {items.map((item) => (
          <Card key={item.key} size="xl" style={[styles.card, !item.include && styles.off]}>
            <View style={styles.itemHead}>
              <Pill label={item.kindLabel} tone="sun" />
              <Pill label="מתוך מסמך" tone="neutral" icon="document-text-outline" />
            </View>
            <SwitchRow label="להוסיף לתיק" value={item.include} onChange={(v) => update(item.key, { include: v })} />
            {item.include &&
              item.fields.map((f) =>
                f.type === 'date' ? (
                  <DateField
                    key={f.key}
                    label={f.label}
                    optional={!f.required}
                    value={item.values[f.key] ?? null}
                    onChange={(v) => update(item.key, { field: f.key, value: v })}
                    error={errors[item.key]?.[f.key]}
                  />
                ) : (
                  <TextField
                    key={f.key}
                    label={f.label}
                    optional={!f.required}
                    value={item.values[f.key] ?? ''}
                    keyboardType={f.type === 'number' ? 'decimal-pad' : 'default'}
                    ltr={f.type === 'number'}
                    onChangeText={(v) => update(item.key, { field: f.key, value: v })}
                    error={errors[item.key]?.[f.key]}
                  />
                ),
              )}
          </Card>
        ))}

        {saveError && (
          <AppText variant="small" tone="danger">
            {saveError}
          </AppText>
        )}
        <Button label={selected ? `אישור והוספה לתיק (${selected})` : 'שמירת המסמך בלבד'} withArrow loading={saving} onPress={confirmAll} />
        <Button label="לא עכשיו" variant="ghost" onPress={goBack} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space.s2 },
  off: { opacity: 0.6 },
  itemHead: { flexDirection: 'row', gap: space.s1 },
});
