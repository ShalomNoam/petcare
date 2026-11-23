import { StyleSheet, Switch, View } from 'react-native';

import { colors, space } from '@/theme';

import { AppText } from './AppText';

type Props = { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void };

export function SwitchRow({ label, hint, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText variant="label">{label}</AppText>
        {hint && (
          <AppText variant="small" tone="muted">
            {hint}
          </AppText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.brand, false: colors.line }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s2, minHeight: 44 },
  text: { flex: 1, gap: 2 },
});
