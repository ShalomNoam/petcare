/**
 * Turns an AI extraction into editable "draft items" for the review screen,
 * and turns confirmed items into database rows (source = 'document').
 */
import type { Extraction } from '@/data';
import { at9 } from '@/data/reminders';
import { todayIso } from '@/lib/format';
import { eventKindLabel, vaccinationKindLabel } from '@/lib/labels';

export type DraftTable = 'events' | 'medications' | 'vaccinations' | 'weights' | 'alerts' | 'reminders';
type FieldType = 'text' | 'date' | 'number';

export type DraftField = { key: string; label: string; type: FieldType; required?: boolean };
export type DraftItem = {
  key: string;
  table: DraftTable;
  /** Pill shown on the card, e.g. "חיסון", "ניתוח" */
  kindLabel: string;
  include: boolean;
  values: Record<string, string | null>;
  /** Fixed values that are not edited (kind, active, ...) */
  fixed: Record<string, unknown>;
  fields: DraftField[];
};

const F = {
  title: { key: 'title', label: 'כותרת', type: 'text', required: true } as DraftField,
  name: { key: 'name', label: 'שם', type: 'text', required: true } as DraftField,
};

export function buildDraft(x: Extraction): DraftItem[] {
  const docDate = x.doc_date ?? todayIso();
  const items: DraftItem[] = [];
  let n = 0;
  const key = () => `i${n++}`;

  for (const a of x.allergies) {
    items.push({ key: key(), table: 'alerts', kindLabel: 'אלרגיה', include: true, fixed: { kind: 'allergy' }, values: { title: a, details: null },
      fields: [F.title, { key: 'details', label: 'פרטים', type: 'text' }] });
  }
  for (const d of x.diagnoses) {
    items.push({ key: key(), table: 'events', kindLabel: 'אבחנה', include: true, fixed: { kind: 'diagnosis', clinic: x.clinic },
      values: { title: d.title, notes: d.details, event_date: docDate },
      fields: [F.title, { key: 'notes', label: 'פרטים', type: 'text' }, { key: 'event_date', label: 'תאריך', type: 'date', required: true }] });
  }
  for (const p of x.procedures) {
    items.push({ key: key(), table: 'events', kindLabel: eventKindLabel[p.kind], include: true, fixed: { kind: p.kind, clinic: x.clinic },
      values: { title: p.title, notes: p.notes, event_date: p.date ?? docDate },
      fields: [F.title, { key: 'notes', label: 'הערות', type: 'text' }, { key: 'event_date', label: 'תאריך', type: 'date', required: true }] });
  }
  for (const m of x.medications) {
    items.push({ key: key(), table: 'medications', kindLabel: 'תרופה', include: true, fixed: {},
      values: { name: m.name, dosage: m.dosage, frequency: m.frequency, start_date: m.start_date ?? docDate, end_date: m.end_date },
      fields: [F.name, { key: 'dosage', label: 'מינון', type: 'text' }, { key: 'frequency', label: 'תדירות', type: 'text' },
        { key: 'start_date', label: 'מתאריך', type: 'date' }, { key: 'end_date', label: 'עד תאריך', type: 'date' }] });
  }
  for (const v of x.vaccinations) {
    items.push({ key: key(), table: 'vaccinations', kindLabel: vaccinationKindLabel[v.kind], include: true, fixed: { kind: v.kind },
      values: { name: v.name, given_on: v.given_on ?? docDate, next_due: v.next_due },
      fields: [F.name, { key: 'given_on', label: 'תאריך', type: 'date', required: true }, { key: 'next_due', label: 'מועד הבא', type: 'date' }] });
  }
  if (x.weight_kg) {
    items.push({ key: key(), table: 'weights', kindLabel: 'משקל', include: true, fixed: {},
      values: { kg: String(x.weight_kg), measured_on: docDate },
      fields: [{ key: 'kg', label: 'משקל בק"ג', type: 'number', required: true }, { key: 'measured_on', label: 'תאריך', type: 'date', required: true }] });
  }
  if (x.next_appointment) {
    items.push({ key: key(), table: 'reminders', kindLabel: 'תור', include: true, fixed: { kind: 'appointment', repeat_interval: 'none', origin: 'manual' },
      values: { title: 'תור המשך לווטרינר', due_date: x.next_appointment },
      fields: [F.title, { key: 'due_date', label: 'תאריך', type: 'date', required: true }] });
  }
  return items;
}

/** Validation errors per item key → field key. */
export function validateDraft(items: DraftItem[]): Record<string, Record<string, string>> {
  const errors: Record<string, Record<string, string>> = {};
  for (const item of items) {
    if (!item.include) continue;
    for (const f of item.fields) {
      const v = item.values[f.key];
      const empty = v === null || v === undefined || String(v).trim() === '';
      let msg: string | null = null;
      if (f.required && empty) msg = 'שדה חובה';
      else if (f.type === 'number' && !empty && !(Number(String(v).replace(',', '.')) > 0)) msg = 'מספר לא תקין';
      if (msg) (errors[item.key] ??= {})[f.key] = msg;
    }
  }
  return errors;
}

/** Database row for a confirmed item. */
export function toRow(item: DraftItem, petId: string, documentId: string): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  for (const f of item.fields) {
    const raw = item.values[f.key];
    const empty = raw === null || raw === undefined || String(raw).trim() === '';
    v[f.key] = empty ? null : f.type === 'number' ? Number(String(raw).replace(',', '.')) : String(raw).trim();
  }
  if (item.table === 'reminders') {
    const { due_date, ...rest } = v;
    return { ...rest, ...item.fixed, pet_id: petId, due_at: at9(String(due_date)), done: false };
  }
  if (item.table === 'medications') {
    const end = v.end_date as string | null;
    return { ...v, ...item.fixed, pet_id: petId, active: !end || end >= todayIso(), source: 'document', document_id: documentId };
  }
  return { ...v, ...item.fixed, pet_id: petId, source: 'document', document_id: documentId };
}
