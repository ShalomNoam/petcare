import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme';

import { AppText } from './AppText';

type Props = {
  /** 1 → "01" */
  number?: number;
  title: string;
  subtitle?: string;
  /** Optional trailing element, e.g. a small "add" button. */
  action?: ReactNode;
};

/** Numbered section header: big bold brand number + title. */
export function SectionHeader({ number, title, subtitle, action }: Props) {
  const num = number !== undefined ? String(number).padStart(2, '0') : undefined;
  return (
    <View style={styles.row}>
      <View style={styles.titleRow} accessible accessibilityRole="header">
        {num && (
          <AppText variant="number" tone="brand" accessibilityElementsHidden importantForAccessibility="no">
            {num}
          </AppText>
        )}
        <View style={styles.texts}>
          <AppText variant="h2">{title}</AppText>
          {subtitle && (
            <AppText variant="small" tone="muted">
              {subtitle}
            </AppText>
          )}
        </View>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s2,
    marginBottom: space.s2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.s2, flexShrink: 1 },
  texts: { flexShrink: 1 },
});
