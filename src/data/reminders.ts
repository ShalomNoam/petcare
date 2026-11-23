/**
 * Automatic reminders, derived from the record:
 *   - every vaccination / deworming / flea & tick treatment with a future "next due" date
 *   - every active regular medication (daily, 09:00 by default)
 * Called after any change to vaccinations or medications. Manual reminders are never touched.
 */
import { todayIso } from '@/lib/format';
import { vaccinationKindLabel } from '@/lib/labels';
import { refreshNotifications } from '@/lib/notifications';

import { db } from './index';
import type { Medication, Reminder, RepeatInterval, Vaccination } from './types';

export function at9(dateIso: string): string {
  return new Date(`${dateIso.slice(0, 10)}T09:00:00`).toISOString();
}

/** "חיסון: כלבת", "תילוע" (no "תילוע: תילוע"), "פרעושים וקרציות: ברבקטו" */
function autoTitle(v: Pick<Vaccination, 'kind' | 'name'>): string {
  const label = vaccinationKindLabel[v.kind];
  if (v.name.includes(label)) return v.name;
  return `${label}: ${v.name}`;
}

type Desired = Pick<Reminder, 'kind' | 'title' | 'due_at' | 'repeat_interval' | 'vaccination_id' | 'medication_id'>;

export function desiredAutoReminders(vaccinations: Vaccination[], medications: Medication[], today = todayIso()): Desired[] {
  const out: Desired[] = [];
  // Only the most recent record of each vaccine/treatment counts (a new rabies shot replaces the old reminder).
  const latest = new Map<string, Vaccination>();
  for (const v of vaccinations) {
    const k = `${v.kind}:${v.name.trim()}`;
    const cur = latest.get(k);
    if (!cur || v.given_on > cur.given_on) latest.set(k, v);
  }
  for (const v of latest.values()) {
    if (!v.next_due || v.next_due < today) continue;
    out.push({
      kind: v.kind,
      title: autoTitle(v),
      due_at: at9(v.next_due),
      repeat_interval: 'none',
      vaccination_id: v.id,
      medication_id: null,
    });
  }
  for (const m of medications) {
    if (!m.active || (m.end_date && m.end_date < today)) continue;
    out.push({
      kind: 'medication',
      title: `תרופה: ${m.name}`,
      due_at: at9(today),
      repeat_interval: 'daily',
      vaccination_id: null,
      medication_id: m.id,
    });
  }
  return out;
}

export async function syncAutoReminders(petId: string) {
  const [vaccinations, medications, reminders] = await Promise.all([
    db().list('vaccinations', petId),
    db().list('medications', petId),
    db().list('reminders', petId),
  ]);
  const desired = desiredAutoReminders(vaccinations, medications);
  const auto = reminders.filter((r) => r.origin === 'auto');
  const keyOf = (r: { vaccination_id: string | null; medication_id: string | null }) =>
    r.vaccination_id ? `v:${r.vaccination_id}` : `m:${r.medication_id}`;
  const existing = new Map(auto.map((r) => [keyOf(r), r]));

  for (const d of desired) {
    const cur = existing.get(keyOf(d));
    existing.delete(keyOf(d));
    if (!cur) {
      await db().insert('reminders', { ...d, pet_id: petId, origin: 'auto', done: false });
    } else if (d.vaccination_id && (cur.due_at !== d.due_at || cur.title !== d.title)) {
      // Next-due date changed → move the reminder and re-arm it.
      await db().update('reminders', cur.id, { due_at: d.due_at, title: d.title, done: false });
    } else if (d.medication_id && cur.title !== d.title) {
      // Keep the time the owner chose; only refresh the title.
      await db().update('reminders', cur.id, { title: d.title });
    }
  }
  // Auto reminders whose source is gone / no longer due.
  for (const stale of existing.values()) {
    await db().remove('reminders', stale.id);
  }
  await refreshNotifications();
}

/** The next occurrence after `fromIso` for a repeating reminder. */
export function nextOccurrence(fromIso: string, repeat: RepeatInterval, now = new Date()): string | null {
  if (repeat === 'none') return null;
  const d = new Date(fromIso);
  do {
    if (repeat === 'daily') d.setDate(d.getDate() + 1);
    else if (repeat === 'weekly') d.setDate(d.getDate() + 7);
    else if (repeat === 'monthly') d.setMonth(d.getMonth() + 1);
    else d.setFullYear(d.getFullYear() + 1);
  } while (d <= now);
  return d.toISOString();
}

/** "בוצע": one-off → done; repeating → advance to the next occurrence. */
export async function completeReminder(r: Reminder) {
  const next = nextOccurrence(r.due_at, r.repeat_interval);
  if (next) await db().update('reminders', r.id, { due_at: next });
  else await db().update('reminders', r.id, { done: true });
  await refreshNotifications();
}
