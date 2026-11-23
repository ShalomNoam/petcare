/**
 * Document extraction: a photo or PDF from the clinic → structured fields.
 * Nothing here writes to the database. The owner reviews and confirms in the app.
 */
import type Anthropic from '@anthropic-ai/sdk';

import { callStructured } from './claude.ts';

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
/** Claude accepts images up to ~5 MB; PDFs up to 32 MB per request. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const nullableDate = { anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }] };

export const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['doc_type', 'doc_date', 'title', 'clinic', 'diagnoses', 'medications', 'vaccinations', 'procedures', 'weight_kg', 'next_appointment', 'allergies', 'notes'],
  properties: {
    doc_type: { type: 'string', enum: ['visit_summary', 'blood_test', 'prescription', 'vaccination_record', 'surgery_report', 'other'] },
    doc_date: nullableDate,
    title: nullableString,
    clinic: nullableString,
    diagnoses: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['title', 'details'], properties: { title: { type: 'string' }, details: nullableString } },
    },
    medications: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'dosage', 'frequency', 'start_date', 'end_date'],
        properties: { name: { type: 'string' }, dosage: nullableString, frequency: nullableString, start_date: nullableDate, end_date: nullableDate },
      },
    },
    vaccinations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'name', 'given_on', 'next_due'],
        properties: {
          kind: { type: 'string', enum: ['vaccine', 'deworming', 'flea_tick'] },
          name: { type: 'string' },
          given_on: nullableDate,
          next_due: nullableDate,
        },
      },
    },
    procedures: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'title', 'date', 'notes'],
        properties: { kind: { type: 'string', enum: ['surgery', 'hospitalization', 'visit'] }, title: { type: 'string' }, date: nullableDate, notes: nullableString },
      },
    },
    weight_kg: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    next_appointment: nullableDate,
    allergies: { type: 'array', items: { type: 'string' } },
    notes: nullableString,
  },
} as const;

export const EXTRACTION_SYSTEM = `אתה מסייע לבעלי חיות מחמד בישראל לסדר את התיק הרפואי של החיה.
תקבל צילום או PDF של מסמך וטרינרי (סיכום ביקור, בדיקת דם, מרשם, פנקס חיסונים, דוח ניתוח).
המשימה: לחלץ רק מה שכתוב במסמך, בצורה מובנית, כדי שהבעלים יבדקו ויאשרו.

כללים:
- חלץ רק מידע שמופיע במסמך במפורש. אל תנחש ואל תשלים. אם שדה לא מופיע, החזר null או רשימה ריקה.
- תאריכים בפורמט YYYY-MM-DD. במסמכים ישראליים התאריך כתוב יום/חודש/שנה (למשל 03/04/2026 הוא 3 באפריל).
- כתוב בעברית. שמות תרופות וחיסונים מסחריים אפשר להשאיר כפי שהם מופיעים.
- תרופות: העתק את המינון והתדירות כפי שהם כתובים, בלי לפרש ובלי להמליץ.
- חיסונים: kind=vaccine לחיסון, deworming לתילוע, flea_tick לטיפול נגד פרעושים וקרציות. "מועד הבא" נכנס ל-next_due.
- procedures: ניתוח=surgery, אשפוז=hospitalization, ביקור/בדיקה=visit.
- diagnoses: אבחנות שהווטרינר כתב. בבדיקת דם, ציין רק ממצאים שהמסמך עצמו מסמן כחריגים.
- allergies: רק אלרגיות שכתובות במסמך.
- title: שם קצר למסמך, למשל "סיכום ביקור – מרפאת הצפון".
- notes: משפט קצר על דברים חשובים שלא נכנסו לשדות, או null.
- אם המסמך אינו מסמך וטרינרי או לא קריא, החזר doc_type=other ורשימות ריקות, והסבר ב-notes.`;

export function documentBlock(base64: string, mimeType: string): Anthropic.Beta.BetaContentBlockParam {
  if (mimeType === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
  }
  return {
    type: 'image',
    source: { type: 'base64', media_type: mimeType as (typeof SUPPORTED_IMAGE_TYPES)[number], data: base64 },
  };
}

export function isSupportedMime(mimeType: string): boolean {
  return mimeType === 'application/pdf' || (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

export async function extractDocument<T>(client: Anthropic, base64: string, mimeType: string, petSummary: string): Promise<T> {
  return callStructured<T>(client, {
    system: EXTRACTION_SYSTEM,
    schema: EXTRACTION_SCHEMA as unknown as Record<string, unknown>,
    effort: 'medium',
    messages: [
      {
        role: 'user',
        content: [
          documentBlock(base64, mimeType),
          { type: 'text', text: `החיה: ${petSummary}\nחלץ את המידע מהמסמך המצורף.` },
        ],
      },
    ],
  });
}

/** Base64 for large byte arrays without blowing the call stack. */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
