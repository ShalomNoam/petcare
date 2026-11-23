/** Hebrew labels for every enum in the schema. */
import type {
  AlertKind,
  DocType,
  EventKind,
  ReminderKind,
  RepeatInterval,
  Sex,
  Species,
  TriageLevel,
  VaccinationKind,
} from '@/data/types';

export const speciesLabel: Record<Species, string> = {
  dog: 'כלב',
  cat: 'חתול',
  rabbit: 'ארנב',
  bird: 'ציפור',
  other: 'אחר',
};

export const speciesIcon: Record<Species, string> = {
  dog: '🐕',
  cat: '🐈',
  rabbit: '🐇',
  bird: '🐦',
  other: '🐾',
};

export function sexLabel(sex: Sex, species?: Species): string {
  if (sex === 'unknown') return 'לא ידוע';
  if (species === 'dog') return sex === 'male' ? 'זכר' : 'נקבה';
  return sex === 'male' ? 'זכר' : 'נקבה';
}

export const sexOptions: { value: Sex; label: string }[] = [
  { value: 'male', label: 'זכר' },
  { value: 'female', label: 'נקבה' },
  { value: 'unknown', label: 'לא ידוע' },
];

export const alertKindLabel: Record<AlertKind, string> = {
  allergy: 'אלרגיה',
  chronic: 'מחלה כרונית',
  anesthesia: 'תגובה להרדמה',
  behavior: 'התנהגות',
  other: 'אחר',
};

export const eventKindLabel: Record<EventKind, string> = {
  surgery: 'ניתוח',
  hospitalization: 'אשפוז',
  visit: 'ביקור',
  diagnosis: 'אבחנה',
};

export const vaccinationKindLabel: Record<VaccinationKind, string> = {
  vaccine: 'חיסון',
  deworming: 'תילוע',
  flea_tick: 'פרעושים וקרציות',
};

export const reminderKindLabel: Record<ReminderKind, string> = {
  vaccine: 'חיסון',
  deworming: 'תילוע',
  flea_tick: 'פרעושים וקרציות',
  medication: 'תרופה',
  appointment: 'תור',
  other: 'אחר',
};

export const repeatLabel: Record<RepeatInterval, string> = {
  none: 'פעם אחת',
  daily: 'כל יום',
  weekly: 'כל שבוע',
  monthly: 'כל חודש',
  yearly: 'כל שנה',
};

export const docTypeLabel: Record<DocType, string> = {
  visit_summary: 'סיכום ביקור',
  blood_test: 'בדיקת דם',
  prescription: 'מרשם',
  vaccination_record: 'פנקס חיסונים',
  surgery_report: 'דוח ניתוח',
  other: 'מסמך',
};

export const triageInfo: Record<TriageLevel, { tag: string; title: string }> = {
  urgent: { tag: 'דחוף', title: 'לפנות עכשיו' },
  soon: { tag: 'בקרוב', title: 'לקבוע תור' },
  monitor: { tag: 'מעקב', title: 'אפשר לעקוב בבית' },
};

export function options<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
