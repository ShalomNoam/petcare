/**
 * POST { document_id } → { extraction }
 *
 * Downloads the user's uploaded document from Storage, sends it to Claude
 * (vision / PDF) and stores the structured result on the document row with
 * status "ready". Nothing enters the medical record until the owner confirms
 * in the app.
 */
import { ClaudeError, makeClient } from '../_shared/claude.ts';
import { ageYears, authenticate, corsHeaders, errorResponse, json, loadOwnedPet, requireEnv } from '../_shared/auth.ts';
import { extractDocument, isSupportedMime, MAX_IMAGE_BYTES, MAX_PDF_BYTES, toBase64 } from '../_shared/extraction.ts';

declare const Deno: { serve(handler: (req: Request) => Promise<Response>): void };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  const ctx = await authenticate(req);
  if (ctx instanceof Response) return ctx;

  let documentId: string | undefined;
  try {
    ({ document_id: documentId } = await req.json());
  } catch {
    return errorResponse('בקשה לא תקינה');
  }
  if (!documentId) return errorResponse('חסר document_id');

  const { data: doc } = await ctx.admin.from('documents').select('*').eq('id', documentId).maybeSingle();
  const pet = doc ? await loadOwnedPet(ctx, doc.pet_id) : null;
  if (!doc || !pet) return errorResponse('המסמך לא נמצא', 404);
  if (!String(doc.file_path).startsWith(`${ctx.userId}/`)) return errorResponse('המסמך לא נמצא', 404);

  if (!isSupportedMime(doc.mime_type)) {
    await ctx.admin.from('documents').update({ extraction_status: 'failed' }).eq('id', doc.id);
    return errorResponse('אפשר לקרוא תמונות JPG/PNG או קובצי PDF.', 415);
  }

  await ctx.admin.from('documents').update({ extraction_status: 'processing' }).eq('id', doc.id);

  try {
    const { data: file, error: dlError } = await ctx.admin.storage.from('pet-files').download(doc.file_path);
    if (dlError || !file) throw new Error('download failed');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const limit = doc.mime_type === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
    if (bytes.length > limit) {
      await ctx.admin.from('documents').update({ extraction_status: 'failed' }).eq('id', doc.id);
      return errorResponse('הקובץ גדול מדי לקריאה. נסה צילום ברזולוציה נמוכה יותר.', 413);
    }

    const client = makeClient(requireEnv('ANTHROPIC_API_KEY'));
    const petSummary = `${pet.name}, ${pet.species}${pet.breed ? `, ${pet.breed}` : ''}, ${ageYears(pet.birth_date)}`;
    const extraction = await extractDocument(client, toBase64(bytes), doc.mime_type, petSummary);

    await ctx.admin.from('documents').update({ extraction_status: 'ready', extracted: extraction }).eq('id', doc.id);
    return json({ extraction });
  } catch (e) {
    console.error('extract-document failed', e);
    await ctx.admin.from('documents').update({ extraction_status: 'failed' }).eq('id', doc.id);
    const message = e instanceof ClaudeError ? 'לא הצלחנו לקרוא את המסמך. אפשר להזין את הפרטים ידנית.' : 'קריאת המסמך נכשלה. נסה שוב.';
    return errorResponse(message, 502);
  }
});
