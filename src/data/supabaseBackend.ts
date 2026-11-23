import { supabase } from '@/lib/supabase';

import { readFileBytes } from './files';
import type { Backend, Extraction, RecordTable } from './types';

const BUCKET = 'pet-files';

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Like check(), for queries that must return rows (insert … single, list). */
function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  const data = check(res);
  if (data === null) throw new Error('No data returned');
  return data;
}

/** Edge Function errors carry the JSON body in `context`; surface its message. */
async function invoke<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) {
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      const json = ctx ? await ctx.json() : null;
      if (json?.error) message = json.error;
    } catch {
      // keep the original message
    }
    throw new Error(message);
  }
  return data as T;
}

const orderBy: Partial<Record<RecordTable, { column: string; ascending: boolean }>> = {
  events: { column: 'event_date', ascending: false },
  vaccinations: { column: 'given_on', ascending: false },
  weights: { column: 'measured_on', ascending: false },
  reminders: { column: 'due_at', ascending: true },
  chat_messages: { column: 'created_at', ascending: true },
};

// The generic helpers below go through `any` once, because supabase-js cannot
// narrow a table-name union; the Backend interface keeps call sites typed.
const from = (table: string) => supabase.from(table as any) as any;

export const supabaseBackend: Backend = {
  kind: 'supabase',

  async getProfile(userId) {
    return check(await supabase.from('profiles').select('*').eq('id', userId).maybeSingle());
  },
  async updateProfile(userId, patch) {
    check(await supabase.from('profiles').update(patch).eq('id', userId));
  },

  async listPets() {
    return must(await supabase.from('pets').select('*').order('created_at'));
  },
  async getPet(id) {
    return check(await supabase.from('pets').select('*').eq('id', id).maybeSingle());
  },
  async insertPet(input) {
    return must(await supabase.from('pets').insert(input).select('*').single());
  },
  async updatePet(id, patch) {
    const { id: _id, owner_id: _o, created_at: _c, updated_at: _u, ...rest } = patch;
    check(await supabase.from('pets').update(rest).eq('id', id));
  },
  async deletePet(id) {
    // Remove the pet's files first (rows cascade in the database).
    const { data: docs } = await supabase.from('documents').select('file_path').eq('pet_id', id);
    const { data: pet } = await supabase.from('pets').select('photo_path').eq('id', id).maybeSingle();
    const paths = [...(docs ?? []).map((d) => d.file_path), pet?.photo_path].filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    check(await supabase.from('pets').delete().eq('id', id));
  },

  async list(table, petId) {
    const o = orderBy[table] ?? { column: 'created_at', ascending: false };
    return check(await from(table).select('*').eq('pet_id', petId).order(o.column, { ascending: o.ascending }));
  },
  async listAll(table) {
    const o = orderBy[table] ?? { column: 'created_at', ascending: false };
    return check(await from(table).select('*').order(o.column, { ascending: o.ascending }));
  },
  async get(table, id) {
    return check(await from(table).select('*').eq('id', id).maybeSingle());
  },
  async insert(table, row) {
    return check(await from(table).insert(row).select('*').single());
  },
  async update(table, id, patch) {
    check(await from(table).update(patch).eq('id', id));
  },
  async remove(table, id) {
    if (table === 'documents') {
      const { data } = await supabase.from('documents').select('file_path').eq('id', id).maybeSingle();
      if (data?.file_path) await supabase.storage.from(BUCKET).remove([data.file_path]);
    }
    check(await from(table).delete().eq('id', id));
  },

  async uploadFile(path, uri, mimeType) {
    const body = await readFileBytes(uri);
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: mimeType, upsert: false });
    if (error) throw new Error(error.message);
  },
  async fileUrl(path) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  },
  async removeFiles(paths) {
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  },

  async extractDocument(documentId) {
    const res = await invoke<{ extraction: Extraction }>('extract-document', { document_id: documentId });
    return res.extraction;
  },
  async sendChat(petId, text) {
    const res = await invoke<{ messages: Awaited<ReturnType<Backend['sendChat']>> }>('vet-chat', { pet_id: petId, message: text });
    return res.messages;
  },
  async deleteAccount() {
    await invoke('delete-account', {});
    await supabase.auth.signOut();
  },
};
