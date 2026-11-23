import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { notify } from '@/lib/confirm';

export type PickedFile = { uri: string; mimeType: string; name?: string };

/** Camera or gallery photo. Returns null when cancelled or permission denied. */
export async function pickImage(from: 'camera' | 'library', opts: { square?: boolean } = {}): Promise<PickedFile | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: !!opts.square,
    aspect: opts.square ? [1, 1] : undefined,
  };

  if (from === 'camera' && Platform.OS !== 'web') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      notify('אין גישה למצלמה', 'אפשר לאשר גישה בהגדרות הטלפון.');
      return null;
    }
  }

  const result = from === 'camera' && Platform.OS !== 'web'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', name: a.fileName ?? undefined };
}

/** PDF (or image) from the files app. */
export async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, mimeType: a.mimeType ?? 'application/pdf', name: a.name };
}
