import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { db, type Pet } from '@/data';
import { speciesIcon } from '@/lib/labels';
import { colors, radius, sizes } from '@/theme';

import { AppText } from './AppText';

type Props = {
  pet: Pick<Pet, 'name' | 'species' | 'photo_path'>;
  size?: number;
  /** A local uri to show before the photo is uploaded. */
  localUri?: string | null;
  ring?: boolean;
};

/** Round pet photo; falls back to the species emoji. */
export function PetAvatar({ pet, size = sizes.avatar, localUri, ring }: Props) {
  const [fetched, setFetched] = useState<{ path: string; url: string | null } | null>(null);
  const path = pet.photo_path;

  useEffect(() => {
    if (!path) return;
    let alive = true;
    db()
      .fileUrl(path)
      .then((u) => alive && setFetched({ path, url: u }))
      .catch(() => alive && setFetched({ path, url: null }));
    return () => {
      alive = false;
    };
  }, [path]);

  const url = localUri ?? (path && fetched?.path === path ? fetched.url : null);

  const box = { width: size, height: size, borderRadius: radius.pill };
  return (
    <View
      style={[styles.box, box, ring && styles.ring]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`תמונה של ${pet.name}`}
    >
      {url ? (
        <Image source={{ uri: url }} style={box} contentFit="cover" transition={150} />
      ) : (
        <AppText style={{ fontSize: size * 0.45, lineHeight: size * 0.6 }}>{speciesIcon[pet.species]}</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.page, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ring: { borderWidth: 3, borderColor: colors.white },
});
