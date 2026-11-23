/**
 * One config per record type drives the shared add/edit screen
 * (src/app/(app)/pet/[id]/record.tsx). Labels are what the owner sees.
 */
import {
  alertKindLabel,
  eventKindLabel,
  options,
  reminderKindLabel,
  repeatLabel,
  vaccinationKindLabel,
} from '@/lib/labels';

export type FormTable = 'alerts' | 'medications' | 'events' | 'vaccinations' | 'weights' | 'reminders';

export type FieldDef =
  | { key: string; label: string; type: 'text' | 'multiline'; required?: boolean; hint?: string; placeholder?: string }
  | { key: string; label: string; type: 'date'; required?: boolean; hint?: string; defaultToday?: boolean }
  | { key: string; label: string; type: 'number'; required?: boolean; hint?: string; placeholder?: string }
  | { key: string; label: string; type: 'time'; required?: boolean; hint?: string }
  | { key: string; label: string; type: 'bool'; hint?: string }
  | { key: string; label: string; type: 'choice'; required?: boolean; options: { value: string; label: string }[]; defaultValue?: string };

export type FormConfig = {
  table: FormTable;
  /** Title for "add" and "edit" screens */
  addTitle: string;
  editTitle: string;
  fields: FieldDef[];
};

export const recordForms: Record<FormTable, FormConfig> = {
  alerts: {
    table: 'alerts',
    addTitle: 'התראה חשובה',
    editTitle: 'עריכת התראה',
    fields: [
      { key: 'kind', label: 'סוג', type: 'choice', required: true, options: options(alertKindLabel), defaultValue: 'allergy' },
      { key: 'title', label: 'מה חשוב לדעת', type: 'text', required: true, placeholder: 'למשל: אלרגיה לפניצילין' },
      { key: 'details', label: 'פרטים', type: 'multiline' },
    ],
  },
  medications: {
    table: 'medications',
    addTitle: 'תרופה קבועה',
    editTitle: 'עריכת תרופה',
    fields: [
      { key: 'name', label: 'שם התרופה', type: 'text', required: true },
      { key: 'dosage', label: 'מינון', type: 'text', hint: 'כפי שכתוב במרשם', placeholder: 'למשל: חצי כדור' },
      { key: 'frequency', label: 'תדירות', type: 'text', placeholder: 'למשל: פעמיים ביום' },
      { key: 'start_date', label: 'מתאריך', type: 'date', defaultToday: true },
      { key: 'end_date', label: 'עד תאריך', type: 'date' },
      { key: 'active', label: 'נוטל כרגע', type: 'bool', hint: 'תרופה פעילה מקבלת תזכורת יומית' },
      { key: 'notes', label: 'הערות', type: 'multiline' },
    ],
  },
  events: {
    table: 'events',
    addTitle: 'אירוע בהיסטוריה',
    editTitle: 'עריכת אירוע',
    fields: [
      { key: 'kind', label: 'סוג', type: 'choice', required: true, options: options(eventKindLabel), defaultValue: 'visit' },
      { key: 'event_date', label: 'תאריך', type: 'date', required: true, defaultToday: true },
      { key: 'title', label: 'מה היה', type: 'text', required: true, placeholder: 'למשל: ניתוח עיקור' },
      { key: 'diagnosis', label: 'אבחנה', type: 'text' },
      { key: 'clinic', label: 'מרפאה', type: 'text' },
      { key: 'notes', label: 'הערות', type: 'multiline' },
    ],
  },
  vaccinations: {
    table: 'vaccinations',
    addTitle: 'חיסון או טיפול',
    editTitle: 'עריכת חיסון או טיפול',
    fields: [
      { key: 'kind', label: 'סוג', type: 'choice', required: true, options: options(vaccinationKindLabel), defaultValue: 'vaccine' },
      { key: 'name', label: 'שם', type: 'text', required: true, placeholder: 'למשל: כלבת' },
      { key: 'given_on', label: 'תאריך', type: 'date', required: true, defaultToday: true },
      { key: 'next_due', label: 'מועד הבא', type: 'date', hint: 'תיווצר תזכורת אוטומטית' },
    ],
  },
  weights: {
    table: 'weights',
    addTitle: 'משקל',
    editTitle: 'עריכת משקל',
    fields: [
      { key: 'kg', label: 'משקל בק"ג', type: 'number', required: true, placeholder: 'למשל: 12.5' },
      { key: 'measured_on', label: 'תאריך', type: 'date', required: true, defaultToday: true },
    ],
  },
  reminders: {
    table: 'reminders',
    addTitle: 'תזכורת',
    editTitle: 'עריכת תזכורת',
    fields: [
      { key: 'kind', label: 'סוג', type: 'choice', required: true, options: options(reminderKindLabel), defaultValue: 'appointment' },
      { key: 'title', label: 'כותרת', type: 'text', required: true, placeholder: 'למשל: תור לווטרינר' },
      { key: 'due_date', label: 'תאריך', type: 'date', required: true, defaultToday: true },
      { key: 'due_time', label: 'שעה', type: 'time', required: true },
      { key: 'repeat_interval', label: 'חזרה', type: 'choice', required: true, options: options(repeatLabel), defaultValue: 'none' },
    ],
  },
};

export function isFormTable(t: string | undefined): t is FormTable {
  return !!t && t in recordForms;
}
