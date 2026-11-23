import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, space } from '@/theme';

import { AppText } from './AppText';
import { Pill } from './Pill';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  optional?: boolean;
  error?: string | null;
};

/** Single choice as a row of pill buttons (radio group). */
export function ChoiceChips<T extends string>({ label, options, value, onChange, optional, error }: Props<T>) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <View style={styles.labelRow}>
        <AppText variant="label">{label}</AppText>
        {optional && <Pill label="רשות" tone="outline" />}
      </View>
      <View style={styles.row}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              style={[styles.chip, selected && styles.selected]}
            >
              <AppText variant="label" style={{ color: selected ? colors.white : colors.ink }}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {error && (
        <AppText variant="small" tone="danger">
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: space.s1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s1 },
  chip: {
    minHeight: sizes.minTouch,
    paddingHorizontal: space.s2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.brand, borderColor: colors.brand },
});
