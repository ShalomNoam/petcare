import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius, sizes, space } from '@/theme';

import { AppText } from './AppText';
import { Pill } from './Pill';

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  /** For numbers / codes that should stay left-to-right (phone, OTP, ID). */
  ltr?: boolean;
};

export function TextField({ label, hint, error, optional, ltr, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <AppText variant="label">{label}</AppText>
        {optional && <Pill label="רשות" tone="outline" />}
      </View>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.muted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          ltr ? styles.ltr : styles.rtl,
          focused && styles.focused,
          !!error && styles.errored,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.s1 },
  input: {
    minHeight: sizes.buttonHeight,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    paddingHorizontal: space.s2,
    fontFamily: fonts.body600,
    fontSize: 18,
    color: colors.ink,
  },
  // Hebrew text input: right aligned. Phone/codes: LTR digits, still right aligned for consistency.
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  ltr: { textAlign: 'right', writingDirection: 'ltr' },
  focused: { borderColor: colors.brand },
  errored: { borderColor: colors.danger },
});
