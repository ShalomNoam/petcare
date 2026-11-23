/**
 * POST { pet_id, message } → { messages: [userMessage, assistantMessage] }
 *
 * Loads the pet's profile (species, age, weight, alerts, medications) and the
 * recent chat history, asks the agent, applies the safety rules, and stores
 * both messages. Messages are written only here (service role), so the
 * triage level shown in the app always comes from the server.
 */
import { ageYears, authenticate, corsHeaders, errorResponse, json, loadOwnedPet, requireEnv } from '../_shared/auth.ts';
import { runChat, type HistoryMessage } from '../_shared/chat.ts';
import { makeClient } from '../_shared/claude.ts';

declare const Deno: { serve(handler: (req: Request) => Promise<Response>): void };

const MAX_MESSAGE_CHARS = 2000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const ctx = await authenticate(req);
  if (ctx instanceof Response) return ctx;

  let body: { pet_id?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return errorResponse('בקשה לא תקינה');
  }
  const text = (body.message ?? '').trim();
  if (!body.pet_id || !text) return errorResponse('חסרה הודעה');
  if (text.length > MAX_MESSAGE_CHARS) return errorResponse('ההודעה ארוכה מדי');

  const pet = await loadOwnedPet(ctx, body.pet_id);
  if (!pet) return errorResponse('החיה לא נמצאה', 404);

  const [alerts, meds, weights, history] = await Promise.all([
    ctx.admin.from('alerts').select('kind,title,details').eq('pet_id', pet.id),
    ctx.admin.from('medications').select('name,dosage,frequency').eq('pet_id', pet.id).eq('active', true),
    ctx.admin.from('weights').select('kg').eq('pet_id', pet.id).order('measured_on', { ascending: false }).limit(1),
    ctx.admin.from('chat_messages').select('role,content').eq('pet_id', pet.id).order('created_at', { ascending: false }).limit(20),
  ]);

  try {
    const client = makeClient(requireEnv('ANTHROPIC_API_KEY'));
    const answer = await runChat(
      client,
      {
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        sex: pet.sex,
        age: ageYears(pet.birth_date),
        neutered: pet.neutered,
        weightKg: weights.data?.[0]?.kg ?? null,
        alerts: alerts.data ?? [],
        medications: meds.data ?? [],
      },
      ((history.data ?? []) as HistoryMessage[]).reverse(),
      text,
    );

    const now = Date.now();
    const { data: saved, error } = await ctx.admin
      .from('chat_messages')
      .insert([
        { pet_id: pet.id, role: 'user', content: text, created_at: new Date(now).toISOString() },
        { pet_id: pet.id, role: 'assistant', content: answer.reply, triage_level: answer.triage_level, created_at: new Date(now + 1).toISOString() },
      ])
      .select('*')
      .order('created_at');
    if (error) throw error;
    return json({ messages: saved });
  } catch (e) {
    console.error('vet-chat failed', e);
    return errorResponse('הסוכן לא זמין כרגע. אם יש סימן חירום, פנו מיד למיון וטרינרי.', 502);
  }
});
