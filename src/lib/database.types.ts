/**
 * Database types, mirroring supabase/migrations.
 * Once the hosted project exists, this file can be regenerated with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 */

export type Species = 'dog' | 'cat' | 'rabbit' | 'bird' | 'other';
export type Sex = 'male' | 'female' | 'unknown';
export type RecordSource = 'owner' | 'document';
export type AlertKind = 'allergy' | 'chronic' | 'anesthesia' | 'behavior' | 'other';
export type EventKind = 'surgery' | 'hospitalization' | 'visit' | 'diagnosis';
export type VaccinationKind = 'vaccine' | 'deworming' | 'flea_tick';
export type ReminderKind = 'vaccine' | 'deworming' | 'flea_tick' | 'medication' | 'appointment' | 'other';
export type RepeatInterval = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type DocType = 'visit_summary' | 'blood_test' | 'prescription' | 'vaccination_record' | 'surgery_report' | 'other';
export type ExtractionStatus = 'none' | 'processing' | 'ready' | 'failed' | 'confirmed';
export type TriageLevel = 'urgent' | 'soon' | 'monitor';

type Timestamps = { created_at: string; updated_at: string };
type Sourced = { source: RecordSource; document_id: string | null };

export type Profile = Timestamps & {
  id: string;
  phone: string | null;
  first_name: string | null;
  national_id: string | null;
};

export type Pet = Timestamps & {
  id: string;
  owner_id: string;
  name: string;
  species: Species;
  breed: string | null;
  sex: Sex;
  birth_date: string | null;
  photo_path: string | null;
  chip_number: string | null;
  neutered: boolean | null;
};

export type PetDocument = Timestamps & {
  id: string;
  pet_id: string;
  file_path: string;
  mime_type: string;
  title: string | null;
  doc_type: DocType | null;
  doc_date: string | null;
  extraction_status: ExtractionStatus;
  extracted: unknown | null;
};

export type Alert = Timestamps & Sourced & {
  id: string;
  pet_id: string;
  kind: AlertKind;
  title: string;
  details: string | null;
};

export type Medication = Timestamps & Sourced & {
  id: string;
  pet_id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  notes: string | null;
};

export type PetEvent = Timestamps & Sourced & {
  id: string;
  pet_id: string;
  kind: EventKind;
  event_date: string;
  title: string;
  diagnosis: string | null;
  clinic: string | null;
  notes: string | null;
};

export type Vaccination = Timestamps & Sourced & {
  id: string;
  pet_id: string;
  kind: VaccinationKind;
  name: string;
  given_on: string;
  next_due: string | null;
};

export type Weight = Timestamps & Sourced & {
  id: string;
  pet_id: string;
  kg: number;
  measured_on: string;
};

export type Reminder = Timestamps & {
  id: string;
  pet_id: string;
  kind: ReminderKind;
  title: string;
  due_at: string;
  repeat_interval: RepeatInterval;
  origin: 'auto' | 'manual';
  vaccination_id: string | null;
  medication_id: string | null;
  done: boolean;
};

export type ChatMessage = {
  id: string;
  pet_id: string;
  role: 'user' | 'assistant';
  content: string;
  triage_level: TriageLevel | null;
  created_at: string;
};

/** Columns the database fills in (ids, timestamps, defaults). */
type AutoCols = 'id' | 'created_at' | 'updated_at';
type Insert<T, Optional extends keyof T = never> = Omit<T, AutoCols | Optional> & Partial<Pick<T, Optional>>;

type Table<Row, Ins, Upd = Partial<Ins>> = { Row: Row; Insert: Ins; Update: Upd; Relationships: [] };
type SourcedOpt = 'source' | 'document_id';

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, never, Partial<Pick<Profile, 'first_name' | 'national_id'>>>;
      pets: Table<Pet, Insert<Pet, 'owner_id' | 'breed' | 'birth_date' | 'photo_path' | 'chip_number' | 'neutered'>>;
      documents: Table<PetDocument, Insert<PetDocument, 'title' | 'doc_type' | 'doc_date' | 'extraction_status' | 'extracted'>>;
      alerts: Table<Alert, Insert<Alert, SourcedOpt | 'details'>>;
      medications: Table<Medication, Insert<Medication, SourcedOpt | 'dosage' | 'frequency' | 'start_date' | 'end_date' | 'active' | 'notes'>>;
      events: Table<PetEvent, Insert<PetEvent, SourcedOpt | 'diagnosis' | 'clinic' | 'notes'>>;
      vaccinations: Table<Vaccination, Insert<Vaccination, SourcedOpt | 'kind' | 'next_due'>>;
      weights: Table<Weight, Insert<Weight, SourcedOpt>>;
      reminders: Table<Reminder, Insert<Reminder, 'repeat_interval' | 'origin' | 'vaccination_id' | 'medication_id' | 'done'>>;
      chat_messages: Table<ChatMessage, never, never>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
