import { db, type Extraction, type PetDocument } from '@/data';
import { storagePath } from '@/data/files';

import type { PickedFile } from './pickers';

/** Uploads the original file and creates the document row. The original is always kept. */
export async function uploadDocument(userId: string, petId: string, file: PickedFile): Promise<PetDocument> {
  const path = storagePath(userId, petId, file.mimeType);
  await db().uploadFile(path, file.uri, file.mimeType);
  return db().insert('documents', {
    pet_id: petId,
    file_path: path,
    mime_type: file.mimeType,
    title: file.name ?? null,
    extraction_status: 'none',
  });
}

/** Runs AI extraction and stores the result on the document as "ready" (awaiting the owner's review). */
export async function runExtraction(documentId: string): Promise<Extraction> {
  await db().update('documents', documentId, { extraction_status: 'processing' });
  try {
    const extraction = await db().extractDocument(documentId);
    await db().update('documents', documentId, { extraction_status: 'ready', extracted: extraction });
    return extraction;
  } catch (e) {
    await db().update('documents', documentId, { extraction_status: 'failed' });
    throw e;
  }
}
