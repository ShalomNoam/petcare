import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

type Props = {
  title: string;
  subtitle?: string | null;
  /** Small line above the title (date, kind). */
  overline?: string | null;
  tags?: ReactNode;
  onPress?: () => void;
  /** Draw the timeline dot + line (history section). */
  timeline?: boolean;
  last?: boolean;
};

/** A row inside a section card. Pressable rows open the edit form. */
export function RecordRow({ title, subtitle, overline, tags, onPress, timeline, last }: Props) {
  const content = (
    <View style={styles.row}>
      {timeline && (
        <View style={styles.rail} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.dot} />
          {!last && <View style={styles.line} />}
        </View>
      )}
      <View style={styles.body}>
        {overline && (
          <AppText variant="small" tone="muted">
            {overline}
          </AppText>
        )}
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle && (
          <AppText variant="small" tone="muted">
            {subtitle}
          </AppText>
        )}
        {tags && <View style={styles.tags}>{tags}</View>}
      </View>
      {onPress && <Icon name="chevronForward" color={colors.muted} size={20} />}
    </View>
  );

  if (!onPress) return <View style={[styles.wrap, !last && !timeline && styles.divider]}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[overline, title, subtitle].filter(Boolean).join(', ')}
      accessibilityHint="פתיחה לעריכה"
      style={({ pressed }) => [styles.wrap, !last && !timeline && styles.divider, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: space.s2, minHeight: 44 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  body: { flex: 1, gap: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s1, marginTop: space.half },
  rail: { width: 16, alignSelf: 'stretch', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.brand, marginTop: 6 },
  line: { flex: 1, width: 2, backgroundColor: colors.line, marginTop: 4, marginBottom: -space.s2 },
});
