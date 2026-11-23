import { StyleSheet, View } from 'react-native';

import type { TriageLevel } from '@/data';
import { triageInfo } from '@/lib/labels';
import { colors, radius, space } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

const look: Record<TriageLevel, { bg: string; fg: string; border: string; icon: 'alert-circle' | 'calendar' | 'eye' }> = {
  urgent: { bg: colors.danger, fg: colors.white, border: colors.danger, icon: 'alert-circle' },
  soon: { bg: colors.sunSoft, fg: colors.sunInk, border: colors.sun, icon: 'calendar' },
  monitor: { bg: colors.page, fg: colors.brand, border: colors.brand, icon: 'eye' },
};

/** The colored urgency card shown under a symptom answer. */
export function TriageCard({ level }: { level: TriageLevel }) {
  const l = look[level];
  const info = triageInfo[level];
  return (
    <View
      style={[styles.card, { backgroundColor: l.bg, borderColor: l.border }]}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`רמת דחיפות: ${info.tag}, ${info.title}`}
    >
      <Icon name={l.icon} color={l.fg} size={26} />
      <View style={styles.text}>
        <AppText variant="label" style={{ color: l.fg }}>
          {info.tag}
        </AppText>
        <AppText variant="h3" style={{ color: l.fg }}>
          {info.title}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.s2, borderRadius: radius.md, borderWidth: 2, padding: space.s2 },
  text: { flex: 1 },
});
