import { router } from 'expo-router';
import { Pressable } from 'react-native';

import type { RecordSource } from '@/data';

import { Pill } from './Pill';

type Props = { source: RecordSource; documentId: string | null; petId: string };

/**
 * "מדווח על ידי הבעלים" for owner-typed data, or a link to the original
 * document for data that came from a scanned document.
 */
export function SourceTag({ source, documentId, petId }: Props) {
  if (source === 'document' && documentId) {
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/pet/[id]/document/[docId]', params: { id: petId, docId: documentId } })}
        accessibilityRole="link"
        accessibilityLabel="מתוך מסמך. פתיחת המסמך המקורי"
        hitSlop={8}
      >
        <Pill label="מתוך מסמך" tone="sun" icon="document-text-outline" />
      </Pressable>
    );
  }
  if (source === 'document') return <Pill label="מתוך מסמך" tone="neutral" icon="document-text-outline" />;
  return <Pill label="מדווח על ידי הבעלים" tone="brand" icon="person-outline" />;
}
