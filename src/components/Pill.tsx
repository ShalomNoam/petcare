import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type PillTone = 'sun' | 'brand' | 'neutral' | 'danger' | 'outline' | 'onBrand';

const tones: Record<PillTone, { bg: string; fg: string; border?: string }> = {
  sun: { bg: colors.sun, fg: colors.ink },
  brand: { bg: colors.page, fg: colors.brand },
  neutral: { bg: colors.page, fg: colors.muted },
  danger: { bg: colors.dangerSoft, fg: colors.dangerInk },
  outline: { bg: 'transparent', fg: colors.muted, border: colors.line },
  onBrand: { bg: colors.onBrandFaint, fg: colors.white },
};

type Props = { label: string; tone?: PillTone; icon?: IconName };

/** Small status tag: "חובה", "מדווח על ידי הבעלים", "חיסון בעוד 5 ימים". */
export function Pill({ label, tone = 'brand', icon }: Props) {
  const t = tones[tone];
  return (
    <View
      style={[styles.pill, { backgroundColor: t.bg, borderColor: t.border ?? t.bg }]}
      accessible
      accessibilityLabel={label}
    >
      {icon && <Icon name={icon} size={15} color={t.fg} />}
      <AppText variant="label" style={[styles.text, { color: t.fg }]} numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.half,
    paddingHorizontal: 12,
    paddingVertical: space.half,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: '100%',
  },
  text: { flexShrink: 1 },
});
