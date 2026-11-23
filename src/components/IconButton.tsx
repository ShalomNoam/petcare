import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, sizes } from '@/theme';

import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'onBrand' | 'brand' | 'plain';
};

/** Round 44pt icon button (top bars, list actions). */
export function IconButton({ icon, label, onPress, tone = 'onBrand' }: Props) {
  const bg = tone === 'onBrand' ? colors.onBrandFaint : tone === 'brand' ? colors.brand : colors.page;
  const fg = tone === 'plain' ? colors.brand : colors.white;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: pressed ? 0.8 : 1 }]}
    >
      <Icon name={icon} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: sizes.minTouch,
    height: sizes.minTouch,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
