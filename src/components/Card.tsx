import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  size?: 'lg' | 'xl';
  tone?: 'panel' | 'page' | 'brand';
  style?: StyleProp<ViewStyle>;
};

const bg = { panel: colors.panel, page: colors.page, brand: colors.brand };

/** White rounded card, no heavy shadow. Pressable when `onPress` is given. */
export function Card({ children, onPress, accessibilityLabel, size = 'lg', tone = 'panel', style }: Props) {
  const base = [
    styles.card,
    { borderRadius: radius[size], backgroundColor: bg[tone] },
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.s3 },
  pressed: { borderColor: colors.brand, borderWidth: 1.5, opacity: 0.95 },
});
