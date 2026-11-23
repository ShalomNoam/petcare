/**
 * POST {} → { ok: true }
 *
 * Deletes the caller's account and ALL their data:
 *   1. every file under "<user_id>/" in the pet-files bucket
 *   2. the auth user → cascades to profiles, pets and every medical table
 */
import { authenticate, corsHeaders, errorResponse, json, type Ctx } from '../_shared/auth.ts';

declare const Deno: { serve(handler: (req: Request) => Promise<Response>): void };

const BUCKET = 'pet-files';

/** Lists every object under a prefix (folders are "<uid>/<pet_id>/..."). */
async function listAll(ctx: Ctx, prefix: string): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await ctx.admin.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    if (!data?.length) break;
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      // Folders come back without an id.
      if (entry.id === null) out.push(...(await listAll(ctx, path)));
      else out.push(path);
    }
    if (data.length < 1000) break;
    offset += data.length;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const ctx = await authenticate(req);
  if (ctx instanceof Response) return ctx;

  try {
    const files = await listAll(ctx, ctx.userId);
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await ctx.admin.storage.from(BUCKET).remove(files.slice(i, i + 100));
      if (error) throw error;
    }
    const { error } = await ctx.admin.auth.admin.deleteUser(ctx.userId);
    if (error) throw error;
    return json({ ok: true, files_removed: files.length });
  } catch (e) {
    console.error('delete-account failed', e);
    return errorResponse('מחיקת החשבון נכשלה. נסה שוב, ואם זה חוזר פנה אלינו.', 500);
  }
});
