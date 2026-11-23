import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, sizes, space } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

type Props = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  onBack?: () => void;
  /** Optional element in the top bar opposite the back button (e.g. settings). */
  topAction?: ReactNode;
  /** Extra content under the title (pills, a photo, a button). */
  children?: ReactNode;
};

/** Full-color opening area with a large white title. */
export function HeroHeader({ title, eyebrow, subtitle, onBack, topAction, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, { paddingTop: insets.top + space.s2 }]}>
      {(onBack || topAction) && (
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="חזרה"
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Icon name="back" color={colors.white} />
            </Pressable>
          ) : (
            <View />
          )}
          {topAction}
        </View>
      )}
      {eyebrow && (
        <AppText variant="label" tone="onBrandMuted" style={styles.eyebrow}>
          {eyebrow}
        </AppText>
      )}
      <AppText variant="hero" tone="white" accessibilityRole="header">
        {title}
      </AppText>
      {subtitle && (
        <AppText variant="body" tone="onBrandMuted" style={styles.subtitle}>
          {subtitle}
        </AppText>
      )}
      {children && <View style={styles.children}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.brand,
    paddingHorizontal: space.s3,
    paddingBottom: space.s4,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.s2,
  },
  iconBtn: {
    width: sizes.minTouch,
    height: sizes.minTouch,
    borderRadius: radius.pill,
    backgroundColor: colors.onBrandFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { marginBottom: space.s1 },
  subtitle: { marginTop: space.s1 },
  children: { marginTop: space.s3, gap: space.s2 },
});
