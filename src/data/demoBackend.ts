/**
 * Demo backend: everything is stored on the device (AsyncStorage).
 * Lets you try every screen without Supabase / Anthropic keys.
 * AI features return clearly-marked sample answers.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { detectEmergency, enforceRules } from '../../supabase/functions/_shared/safety';

import { demoSeeds } from './demoData';
import { uuid } from './files';
import type { Backend, Extraction, Pet, Profile, RecordTable, RowOf } from './types';

const KEY = 'demo-store-v1';
export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';
export const DEMO_PHONE = '972500000001';

type Store = {
  profile: Profile;
  pets: Pet[];
  tables: Record<RecordTable, Record<string, unknown>[]>;
  files: Record<string, string>; // storage path → local uri
};

let cache: Store | null = null;

function now() {
  return new Date().toISOString();
}

function emptyTables(): Store['tables'] {
  return { documents: [], alerts: [], medications: [], events: [], vaccinations: [], weights: [], reminders: [], chat_messages: [] };
}

/** Builds a fresh demo store with the two sample pets. */
export function buildDemoStore(): Store {
  const t = now();
  const store: Store = {
    profile: { id: DEMO_USER_ID, phone: DEMO_PHONE, first_name: 'אורח', national_id: null, created_at: t, updated_at: t },
    pets: [],
    tables: emptyTables(),
    files: {},
  };
  for (const seed of demoSeeds()) {
    const pet: Pet = { ...seed.pet, id: uuid(), owner_id: DEMO_USER_ID, created_at: t, updated_at: t };
    store.pets.push(pet);
    const add = (table: RecordTable, rows: object[]) =>
      rows.forEach((r) => store.tables[table].push({ ...r, id: uuid(), pet_id: pet.id, created_at: t, updated_at: t }));
    add('alerts', seed.alerts);
    add('medications', seed.medications);
    add('events', seed.events);
    add('vaccinations', seed.vaccinations);
    add('weights', seed.weights);
    add('reminders', seed.reminders.map((r) => ({ ...r, vaccination_id: null, medication_id: null })));
  }
  return store;
}

async function load(): Promise<Store> {
  if (cache) return cache;
  const raw = await AsyncStorage.getItem(KEY);
  cache = raw ? (JSON.parse(raw) as Store) : buildDemoStore();
  if (!raw) await save();
  return cache;
}

async function save() {
  if (cache) await AsyncStorage.setItem(KEY, JSON.stringify(cache));
}

export async function resetDemoStore() {
  cache = null;
  await AsyncStorage.removeItem(KEY);
}

const sortRules: Partial<Record<RecordTable, { key: string; asc: boolean }>> = {
  events: { key: 'event_date', asc: false },
  vaccinations: { key: 'given_on', asc: false },
  weights: { key: 'measured_on', asc: false },
  reminders: { key: 'due_at', asc: true },
  chat_messages: { key: 'created_at', asc: true },
};

function sorted<T>(table: RecordTable, rows: T[]): T[] {
  const rule = sortRules[table] ?? { key: 'created_at', asc: false };
  return [...rows].sort((a, b) => {
    const va = String((a as Record<string, unknown>)[rule.key] ?? '');
    const vb = String((b as Record<string, unknown>)[rule.key] ?? '');
    return rule.asc ? va.localeCompare(vb) : vb.localeCompare(va);
  });
}

/** Removes a pet's rows from every table (mirrors ON DELETE CASCADE). */
function cascadePet(store: Store, petId: string) {
  for (const table of Object.keys(store.tables) as RecordTable[]) {
    store.tables[table] = store.tables[table].filter((r) => r.pet_id !== petId);
  }
}

const DEMO_EXTRACTION: Extraction = {
  doc_type: 'visit_summary',
  doc_date: new Date().toISOString().slice(0, 10),
  title: 'סיכום ביקור (דוגמה)',
  clinic: 'מרפאה לדוגמה',
  diagnoses: [{ title: 'דלקת אוזניים חיצונית', details: 'אוזן ימין' }],
  medications: [{ name: 'טיפות אוזניים', dosage: 'לפי הוראות המרפאה', frequency: 'פעמיים ביום', start_date: new Date().toISOString().slice(0, 10), end_date: null }],
  vaccinations: [],
  procedures: [{ kind: 'visit', title: 'בדיקת אוזניים', date: new Date().toISOString().slice(0, 10), notes: null }],
  weight_kg: 29.1,
  next_appointment: null,
  allergies: [],
  notes: 'במצב הדגמה מוצגת תוצאה קבועה. עם מפתח Anthropic, ה-AI יקרא את המסמך האמיתי.',
};

export const demoBackend: Backend = {
  kind: 'demo',

  async getProfile() {
    return (await load()).profile;
  },
  async updateProfile(_userId, patch) {
    const s = await load();
    s.profile = { ...s.profile, ...patch, updated_at: now() };
    await save();
  },

  async listPets() {
    return [...(await load()).pets].sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  async getPet(id) {
    return (await load()).pets.find((p) => p.id === id) ?? null;
  },
  async insertPet(input) {
    const s = await load();
    const t = now();
    const pet: Pet = {
      breed: null,
      birth_date: null,
      photo_path: null,
      chip_number: null,
      neutered: null,
      ...input,
      id: uuid(),
      owner_id: DEMO_USER_ID,
      created_at: t,
      updated_at: t,
    };
    s.pets.push(pet);
    await save();
    return pet;
  },
  async updatePet(id, patch) {
    const s = await load();
    s.pets = s.pets.map((p) => (p.id === id ? { ...p, ...patch, updated_at: now() } : p));
    await save();
  },
  async deletePet(id) {
    const s = await load();
    s.pets = s.pets.filter((p) => p.id !== id);
    cascadePet(s, id);
    await save();
  },

  async list(table, petId) {
    const s = await load();
    return sorted(table, s.tables[table].filter((r) => r.pet_id === petId)) as RowOf<typeof table>[];
  },
  async listAll(table) {
    const s = await load();
    return sorted(table, s.tables[table]) as RowOf<typeof table>[];
  },
  async get(table, id) {
    const s = await load();
    return (s.tables[table].find((r) => r.id === id) as RowOf<typeof table>) ?? null;
  },
  async insert(table, row) {
    const s = await load();
    const t = now();
    const defaults: Record<string, unknown> = { source: 'owner', document_id: null };
    const full = { ...defaults, ...row, id: uuid(), created_at: t, updated_at: t } as Record<string, unknown>;
    s.tables[table].push(full);
    await save();
    return full as RowOf<typeof table>;
  },
  async update(table, id, patch) {
    const s = await load();
    s.tables[table] = s.tables[table].map((r) => (r.id === id ? { ...r, ...patch, updated_at: now() } : r));
    await save();
  },
  async remove(table, id) {
    const s = await load();
    s.tables[table] = s.tables[table].filter((r) => r.id !== id);
    if (table === 'vaccinations') s.tables.reminders = s.tables.reminders.filter((r) => r.vaccination_id !== id);
    if (table === 'medications') s.tables.reminders = s.tables.reminders.filter((r) => r.medication_id !== id);
    if (table === 'documents') {
      for (const t of ['alerts', 'medications', 'events', 'vaccinations', 'weights'] as RecordTable[]) {
        s.tables[t] = s.tables[t].map((r) => (r.document_id === id ? { ...r, document_id: null } : r));
      }
    }
    await save();
  },

  async uploadFile(path, uri) {
    const s = await load();
    s.files[path] = uri;
    await save();
  },
  async fileUrl(path) {
    return (await load()).files[path] ?? null;
  },
  async removeFiles(paths) {
    const s = await load();
    paths.forEach((p) => delete s.files[p]);
    await save();
  },

  async extractDocument() {
    await new Promise((r) => setTimeout(r, 1200));
    return DEMO_EXTRACTION;
  },

  async sendChat(petId, text) {
    const s = await load();
    const t = now();
    const userMsg = { id: uuid(), pet_id: petId, role: 'user' as const, content: text, triage_level: null, created_at: t };
    const urgent = detectEmergency(text).length > 0;
    const sample = urgent
      ? { reply: '', triage_level: 'monitor' as const } // the safety net upgrades this to urgent
      : {
          reply:
            'זו תשובת הדגמה. במצב אמיתי הסוכן מתחשב בפרופיל של החיה ועונה על השאלה שלך.\n\nמה לבדוק בבית: תיאבון, שתייה, מצב רוח ויציאות. אם יש החמרה, חום, הקאות חוזרות או אדישות, זו כבר סיבה לפנות לווטרינר.',
          triage_level: 'monitor' as const,
        };
    const ruled = enforceRules(text, sample);
    const answer = {
      id: uuid(),
      pet_id: petId,
      role: 'assistant' as const,
      content: ruled.reply,
      triage_level: ruled.triage_level,
      created_at: new Date(Date.now() + 1).toISOString(),
    };
    s.tables.chat_messages.push(userMsg, answer);
    await save();
    await new Promise((r) => setTimeout(r, 700));
    return [userMsg, answer];
  },

  async deleteAccount() {
    await resetDemoStore();
  },
};
