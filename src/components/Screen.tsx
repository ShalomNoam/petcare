import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/theme';

type Props = {
  /** Rendered edge-to-edge above the padded content (usually a HeroHeader). */
  header?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
};

/** Page container: mint background, 24px side padding, safe-area aware. */
export function Screen({ header, children, scroll = true }: Props) {
  const insets = useSafeAreaInsets();
  const content = (
    <>
      {header}
      <View
        style={[
          styles.content,
          { paddingBottom: insets.bottom + space.s4 },
          !header && { paddingTop: insets.top + space.s2 },
        ]}
      >
        {children}
      </View>
    </>
  );

  return scroll ? (
    <ScrollView style={styles.page} contentContainerStyle={styles.grow} keyboardShouldPersistTaps="handled">
      {content}
    </ScrollView>
  ) : (
    <View style={[styles.page, styles.grow]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  grow: { flexGrow: 1 },
  content: { paddingHorizontal: space.s3, paddingTop: space.s3, gap: space.s3 },
});
