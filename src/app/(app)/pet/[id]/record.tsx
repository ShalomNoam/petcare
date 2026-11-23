/**
 * Shared add / edit screen for every record type.
 * Route: /pet/<id>/record?table=vaccinations[&recordId=<id>]
 */
import { useLocalSearchParams } from 'expo-router';
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
  Screen,
  SourceTag,
  SwitchRow,
  TextField,
} from '@/components';
import { db, type RecordSource } from '@/data';
import { goBack } from '@/lib/nav';
import { syncAutoReminders } from '@/data/reminders';
import { isFormTable, recordForms, type FieldDef } from '@/features/recordForms';
import { confirm } from '@/lib/confirm';
import { formatTime, parseTime, todayIso, toIsoDate } from '@/lib/format';
import { refreshNotifications } from '@/lib/notifications';
import { space } from '@/theme';

type Values = Record<string, string | boolean | null>;

function initialValues(fields: FieldDef[]): Values {
  const v: Values = {};
  for (const f of fields) {
    if (f.type === 'choice') v[f.key] = f.defaultValue ?? null;
    else if (f.type === 'date') v[f.key] = f.defaultToday ? todayIso() : null;
    else if (f.type === 'bool') v[f.key] = true;
    else if (f.type === 'time') v[f.key] = '09:00';
    else v[f.key] = '';
  }
  return v;
}

export default function RecordForm() {
  const { id: petId, table, recordId } = useLocalSearchParams<{ id: string; table: string; recordId?: string }>();
  const config = isFormTable(table) ? recordForms[table] : null;

  const [values, setValues] = useState<Values>(() => (config ? initialValues(config.fields) : {}));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(!!recordId);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [source, setSource] = useState<{ source: RecordSource; document_id: string | null } | null>(null);

  // Load the existing record when editing.
  useEffect(() => {
    if (!config || !recordId) return;
    db()
      .get(config.table, recordId)
      .then((row) => {
        if (!row) return;
        const r = row as unknown as Record<string, unknown>;
        const v: Values = {};
        for (const f of config.fields) {
          if (f.key === 'due_date') v.due_date = toIsoDate(new Date(String(r.due_at)));
          else if (f.key === 'due_time') v.due_time = formatTime(String(r.due_at));
          else if (f.type === 'number') v[f.key] = r[f.key] == null ? '' : String(r[f.key]);
          else v[f.key] = (r[f.key] as string | boolean | null) ?? (f.type === 'bool' ? false : f.type === 'date' ? null : '');
        }
        setValues(v);
        if ('source' in r) setSource({ source: r.source as RecordSource, document_id: (r.document_id as string) ?? null });
      })
      .finally(() => setLoading(false));
  }, [config, recordId]);

  if (!config || !petId) return <ErrorView message="סוג רשומה לא מוכר" />;
  if (loading) return <Loading />;

  const set = (key: string, value: string | boolean | null) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest);
  };

  function validate(): Record<string, unknown> | null {
    const errs: Record<string, string> = {};
    const row: Record<string, unknown> = {};
    for (const f of config!.fields) {
      const raw = values[f.key];
      const empty = raw === null || raw === '' || raw === undefined;
      if ('required' in f && f.required && empty) {
        errs[f.key] = 'שדה חובה';
        continue;
      }
      if (f.type === 'number') {
        const n = Number(String(raw).replace(',', '.'));
        if (!empty && (Number.isNaN(n) || n <= 0 || n >= 1000)) errs[f.key] = 'מספר לא תקין';
        else row[f.key] = empty ? null : n;
      } else if (f.type === 'time') {
        if (!parseTime(String(raw))) errs[f.key] = 'שעה בפורמט 09:30';
      } else if (f.type === 'text' || f.type === 'multiline') {
        row[f.key] = empty ? null : String(raw).trim();
      } else {
        row[f.key] = raw;
      }
    }
    // Cross-field rules
    if (row.end_date && row.start_date && String(row.end_date) < String(row.start_date)) errs.end_date = 'תאריך הסיום לפני תאריך ההתחלה';
    if (row.next_due && row.given_on && String(row.next_due) < String(row.given_on)) errs.next_due = 'המועד הבא לפני תאריך הטיפול';

    if (config!.table === 'reminders' && !errs.due_date && !errs.due_time) {
      const [h, m] = parseTime(String(values.due_time))!;
      const d = new Date(`${values.due_date}T00:00:00`);
      d.setHours(h, m, 0, 0);
      row.due_at = d.toISOString();
      delete row.due_date;
      delete row.due_time;
    }
    setErrors(errs);
    return Object.keys(errs).length ? null : row;
  }

  async function save() {
    const row = validate();
    if (!row) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (recordId) {
        await db().update(config!.table, recordId, row);
      } else {
        await db().insert(config!.table, { ...row, pet_id: petId, ...(config!.table === 'reminders' ? { origin: 'manual' } : { source: 'owner' }) } as never);
      }
      if (config!.table === 'vaccinations' || config!.table === 'medications') await syncAutoReminders(petId!);
      if (config!.table === 'reminders') await refreshNotifications();
      goBack();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'השמירה נכשלה');
      setSaving(false);
    }
  }

  async function remove() {
    if (!recordId) return;
    const ok = await confirm('למחוק?', 'הפריט יימחק מהתיק. אי אפשר לבטל.', 'מחיקה', true);
    if (!ok) return;
    await db().remove(config!.table, recordId);
    if (config!.table === 'vaccinations' || config!.table === 'medications') await syncAutoReminders(petId!);
    if (config!.table === 'reminders') await refreshNotifications();
    goBack();
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen header={<HeroHeader onBack={goBack} title={recordId ? config.editTitle : config.addTitle} />}>
        <Card size="xl" style={styles.card}>
          {source && (
            <View style={styles.source}>
              <SourceTag source={source.source} documentId={source.document_id} petId={petId} />
            </View>
          )}
          {config.fields.map((f) => {
            const v = values[f.key];
            const err = errors[f.key];
            const optional = !('required' in f && f.required) && f.type !== 'bool';
            switch (f.type) {
              case 'choice':
                return <ChoiceChips key={f.key} label={f.label} options={f.options} value={v as string} onChange={(x) => set(f.key, x)} error={err} />;
              case 'date':
                return <DateField key={f.key} label={f.label} value={(v as string) ?? null} onChange={(x) => set(f.key, x)} optional={optional} hint={f.hint} error={err} />;
              case 'bool':
                return <SwitchRow key={f.key} label={f.label} hint={f.hint} value={!!v} onChange={(x) => set(f.key, x)} />;
              case 'time':
                return <TextField key={f.key} label={f.label} value={String(v ?? '')} onChangeText={(x) => set(f.key, x)} keyboardType="numbers-and-punctuation" placeholder="09:00" ltr error={err} maxLength={5} />;
              case 'number':
                return <TextField key={f.key} label={f.label} value={String(v ?? '')} onChangeText={(x) => set(f.key, x)} keyboardType="decimal-pad" placeholder={f.placeholder} ltr error={err} optional={optional} hint={f.hint} />;
              default:
                return (
                  <TextField
                    key={f.key}
                    label={f.label}
                    value={String(v ?? '')}
                    onChangeText={(x) => set(f.key, x)}
                    placeholder={f.placeholder}
                    hint={f.hint}
                    optional={optional}
                    error={err}
                    multiline={f.type === 'multiline'}
                    style={f.type === 'multiline' ? styles.multiline : undefined}
                    maxLength={f.type === 'multiline' ? 1000 : 200}
                  />
                );
            }
          })}
          {saveError && (
            <AppText variant="small" tone="danger">
              {saveError}
            </AppText>
          )}
          <Button label="שמירה" withArrow loading={saving} onPress={save} />
        </Card>
        {recordId && <Button label="מחיקה" variant="ghost" icon="trash-outline" onPress={remove} />}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space.s3 },
  source: { flexDirection: 'row' },
  multiline: { minHeight: 96, paddingTop: space.s1, textAlignVertical: 'top' },
});
