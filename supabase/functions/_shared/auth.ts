/**
 * Shared Edge Function helpers: CORS, JSON responses, and resolving the
 * calling user from their JWT.
 *
 * `admin` uses the service key and bypasses RLS, so every query made with it
 * MUST filter by the verified `userId` (we always check pet ownership first).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export function errorResponse(message: string, status = 400): Response {
  return json({ error: message }, status);
}

declare const Deno: { env: { get(name: string): string | undefined } };

function env(name: string): string | undefined {
  return Deno.env.get(name);
}

/** Service key: legacy SUPABASE_SERVICE_ROLE_KEY, or the new SUPABASE_SECRET_KEYS JSON. */
function serviceKey(): string {
  const legacy = env('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const keys = env('SUPABASE_SECRET_KEYS');
  if (keys) {
    const parsed = JSON.parse(keys) as Record<string, string>;
    const first = parsed.default ?? Object.values(parsed)[0];
    if (first) return first;
  }
  throw new Error('Missing service key in the Edge Function environment');
}

export function requireEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing secret ${name}. Set it with: supabase secrets set ${name}=...`);
  return v;
}

export type Ctx = { userId: string; admin: SupabaseClient };

/** Verifies the caller's JWT and returns their id + an admin client. */
export async function authenticate(req: Request): Promise<Ctx | Response> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return errorResponse('לא מחובר', 401);
  const admin = createClient(requireEnv('SUPABASE_URL'), serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return errorResponse('לא מחובר', 401);
  return { userId: data.user.id, admin };
}

/** Loads a pet only if it belongs to the user. */
export async function loadOwnedPet(ctx: Ctx, petId: string) {
  const { data } = await ctx.admin.from('pets').select('*').eq('id', petId).eq('owner_id', ctx.userId).maybeSingle();
  return data as null | {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    sex: string;
    birth_date: string | null;
    neutered: boolean | null;
  };
}

export function ageYears(birth: string | null): string {
  if (!birth) return 'גיל לא ידוע';
  const months = Math.floor((Date.now() - new Date(birth).getTime()) / (30.44 * 86400000));
  if (months < 12) return `${months} חודשים`;
  return `${Math.floor(months / 12)} שנים`;
}
