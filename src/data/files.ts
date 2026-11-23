import { File } from 'expo-file-system';
import { Platform } from 'react-native';

/** Reads a local file (camera, gallery, document picker) into an ArrayBuffer for upload. */
export async function readFileBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    return res.arrayBuffer();
  }
  return new File(uri).arrayBuffer();
}

export function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case 'application/pdf':
      return 'pdf';
    case 'image/png':
      return 'png';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

/** "<user>/<pet>/<random>.<ext>" – the first segment must be the user id (Storage RLS). */
export function storagePath(userId: string, petId: string, mimeType: string): string {
  return `${userId}/${petId}/${uuid()}.${extensionFor(mimeType)}`;
}

export function uuid(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
