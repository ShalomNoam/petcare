import type { ChatMessage, Database, Pet, Profile } from '@/lib/database.types';

export * from '@/lib/database.types';

type Tables = Database['public']['Tables'];

/** Tables that hang off a pet (everything except profiles / pets). */
export type RecordTable =
  | 'documents'
  | 'alerts'
  | 'medications'
  | 'events'
  | 'vaccinations'
  | 'weights'
  | 'reminders'
  | 'chat_messages';

export type RowOf<T extends keyof Tables> = Tables[T]['Row'];
export type InsertOf<T extends keyof Tables> = Tables[T]['Insert'];
export type UpdateOf<T extends keyof Tables> = Partial<Tables[T]['Row']>;

export type PetInsert = InsertOf<'pets'>;

/** Structured result the AI returns for a scanned document (see extract-document). */
export type Extraction = {
  doc_type: 'visit_summary' | 'blood_test' | 'prescription' | 'vaccination_record' | 'surgery_report' | 'other';
  doc_date: string | null;
  title: string | null;
  clinic: string | null;
  diagnoses: { title: string; details: string | null }[];
  medications: { name: string; dosage: string | null; frequency: string | null; start_date: string | null; end_date: string | null }[];
  vaccinations: { kind: 'vaccine' | 'deworming' | 'flea_tick'; name: string; given_on: string | null; next_due: string | null }[];
  procedures: { kind: 'surgery' | 'hospitalization' | 'visit'; title: string; date: string | null; notes: string | null }[];
  weight_kg: number | null;
  next_appointment: string | null;
  allergies: string[];
  notes: string | null;
};

export type AuthUser = { id: string; phone: string | null };

/**
 * Everything the screens need from a backend. Two implementations:
 * Supabase (real) and Demo (on-device, for trying the app without keys).
 */
export interface Backend {
  kind: 'supabase' | 'demo';

  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, patch: Partial<Pick<Profile, 'first_name' | 'national_id'>>): Promise<void>;

  listPets(): Promise<Pet[]>;
  getPet(id: string): Promise<Pet | null>;
  insertPet(input: PetInsert): Promise<Pet>;
  updatePet(id: string, patch: Partial<Pet>): Promise<void>;
  deletePet(id: string): Promise<void>;

  list<T extends RecordTable>(table: T, petId: string): Promise<RowOf<T>[]>;
  listAll<T extends RecordTable>(table: T): Promise<RowOf<T>[]>;
  get<T extends RecordTable>(table: T, id: string): Promise<RowOf<T> | null>;
  insert<T extends Exclude<RecordTable, 'chat_messages'>>(table: T, row: InsertOf<T>): Promise<RowOf<T>>;
  update<T extends RecordTable>(table: T, id: string, patch: UpdateOf<T>): Promise<void>;
  remove(table: RecordTable, id: string): Promise<void>;

  uploadFile(path: string, uri: string, mimeType: string): Promise<void>;
  fileUrl(path: string): Promise<string | null>;
  removeFiles(paths: string[]): Promise<void>;

  /** Runs AI extraction on an uploaded document. Nothing is written to the record. */
  extractDocument(documentId: string): Promise<Extraction>;
  /** Sends a chat message; returns the stored user message and the assistant answer. */
  sendChat(petId: string, text: string): Promise<ChatMessage[]>;
  /** Deletes the account, all rows and all files. */
  deleteAccount(): Promise<void>;
}
