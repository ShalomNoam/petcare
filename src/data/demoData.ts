/**
 * Demo dataset: two pets with history. Dates are relative to today so the
 * reminders and "next vaccine" pills always look current.
 * Used by demo mode, and by Settings → "טעינת נתוני הדגמה" on a real account.
 */
import type { Alert, Medication, Pet, PetEvent, Reminder, Vaccination, Weight } from './types';

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function at9(dateIso: string): string {
  const d = new Date(`${dateIso}T09:00:00`);
  return d.toISOString();
}

type Seed = {
  pet: Omit<Pet, 'id' | 'owner_id' | 'created_at' | 'updated_at'>;
  alerts: Omit<Alert, 'id' | 'pet_id' | 'created_at' | 'updated_at'>[];
  medications: Omit<Medication, 'id' | 'pet_id' | 'created_at' | 'updated_at'>[];
  events: Omit<PetEvent, 'id' | 'pet_id' | 'created_at' | 'updated_at'>[];
  vaccinations: Omit<Vaccination, 'id' | 'pet_id' | 'created_at' | 'updated_at'>[];
  weights: Omit<Weight, 'id' | 'pet_id' | 'created_at' | 'updated_at'>[];
  reminders: Omit<Reminder, 'id' | 'pet_id' | 'created_at' | 'updated_at' | 'vaccination_id' | 'medication_id'>[];
};

const owner = { source: 'owner' as const, document_id: null };

export function demoSeeds(): Seed[] {
  return [
    {
      pet: {
        name: 'רקסי',
        species: 'dog',
        breed: 'מעורב לברדור',
        sex: 'male',
        birth_date: day(-365 * 6 - 40),
        photo_path: null,
        chip_number: '900164000123456',
        neutered: true,
      },
      alerts: [
        { kind: 'allergy', title: 'אלרגיה לעוף', details: 'גירוד ופריחה אחרי מזון עם עוף', ...owner },
        { kind: 'anesthesia', title: 'התעורר לאט מהרדמה', details: 'בניתוח 2024, התאושש כ-6 שעות', ...owner },
        { kind: 'behavior', title: 'מפחד אצל הווטרינר', details: 'עדיף לחסום פה בבדיקה', ...owner },
      ],
      medications: [
        { name: 'אפוקוול', dosage: 'לפי הוראת הווטרינר', frequency: 'פעם ביום', start_date: day(-90), end_date: null, active: true, notes: 'לגירוד', ...owner },
      ],
      events: [
        { kind: 'surgery', event_date: day(-700), title: 'ניתוח הסרת גידול שומני', diagnosis: 'ליפומה שפירה', clinic: 'מרפאת הצפון', notes: null, ...owner },
        { kind: 'hospitalization', event_date: day(-420), title: 'אשפוז לילה', diagnosis: 'דלקת קיבה ומעיים', clinic: 'בית חולים וטרינרי', notes: 'קיבל נוזלים', ...owner },
        { kind: 'visit', event_date: day(-35), title: 'ביקורת שנתית', diagnosis: 'דרמטיטיס אלרגית', clinic: 'מרפאת הצפון', notes: 'הומלץ מזון היפואלרגני', ...owner },
      ],
      vaccinations: [
        { kind: 'vaccine', name: 'כלבת', given_on: day(-358), next_due: day(7), ...owner },
        { kind: 'vaccine', name: 'משושה', given_on: day(-358), next_due: day(7), ...owner },
        { kind: 'deworming', name: 'תילוע', given_on: day(-80), next_due: day(10), ...owner },
        { kind: 'flea_tick', name: 'טיפול נגד פרעושים וקרציות', given_on: day(-25), next_due: day(5), ...owner },
      ],
      weights: [
        { kg: 27.5, measured_on: day(-400), ...owner },
        { kg: 28.9, measured_on: day(-200), ...owner },
        { kg: 29.4, measured_on: day(-35), ...owner },
      ],
      reminders: [
        { kind: 'appointment', title: 'ביקורת עור', due_at: at9(day(14)), repeat_interval: 'none', origin: 'manual', done: false },
      ],
    },
    {
      pet: {
        name: 'מיצי',
        species: 'cat',
        breed: 'חתולה ביתית',
        sex: 'female',
        birth_date: day(-365 * 2 - 100),
        photo_path: null,
        chip_number: null,
        neutered: true,
      },
      alerts: [{ kind: 'chronic', title: 'רגישות במערכת השתן', details: 'מזון רפואי לשתן', ...owner }],
      medications: [],
      events: [
        { kind: 'surgery', event_date: day(-560), title: 'עיקור', diagnosis: null, clinic: 'מרפאת העיר', notes: null, ...owner },
        { kind: 'visit', event_date: day(-150), title: 'בדיקת שתן', diagnosis: 'גבישים בשתן', clinic: 'מרפאת העיר', notes: 'מעבר למזון רפואי', ...owner },
      ],
      vaccinations: [
        { kind: 'vaccine', name: 'מרובע לחתולים', given_on: day(-200), next_due: day(165), ...owner },
        { kind: 'deworming', name: 'תילוע', given_on: day(-60), next_due: day(30), ...owner },
      ],
      weights: [
        { kg: 3.9, measured_on: day(-300), ...owner },
        { kg: 4.2, measured_on: day(-150), ...owner },
      ],
      reminders: [],
    },
  ];
}
