import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, space } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'onBrand' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  /** Main action: shows the attached arrow circle. */
  withArrow?: boolean;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
};

const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.brand, fg: colors.white },
  secondary: { bg: colors.panel, fg: colors.brand, border: colors.line },
  onBrand: { bg: colors.white, fg: colors.brand },
  ghost: { bg: 'transparent', fg: colors.brand },
  danger: { bg: colors.danger, fg: colors.white },
};

/** Fully rounded pill button. The primary action gets an attached arrow circle. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  withArrow,
  icon,
  loading,
  disabled,
  fullWidth,
  accessibilityHint,
}: Props) {
  const p = palette[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.row,
        fullWidth && styles.fullWidth,
        { opacity: inactive ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <View
        style={[
          styles.pill,
          fullWidth && styles.grow,
          { backgroundColor: p.bg, borderColor: p.border ?? p.bg },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={p.fg} />
        ) : (
          <>
            {icon && <Icon name={icon} color={p.fg} size={20} />}
            <AppText variant="button" style={{ color: p.fg }}>
              {label}
            </AppText>
          </>
        )}
      </View>
      {withArrow && (
        <View style={[styles.dot, { backgroundColor: p.bg, borderColor: p.border ?? p.bg }]}>
          <Icon name="forward" color={p.fg} size={22} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s1, alignSelf: 'flex-start' },
  fullWidth: { alignSelf: 'stretch' },
  grow: { flex: 1 },
  pill: {
    minHeight: sizes.buttonHeight,
    paddingHorizontal: space.s3,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s1,
  },
  dot: {
    width: sizes.arrowDot,
    height: sizes.arrowDot,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
