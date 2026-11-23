import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

export function Loading({ label = 'טוען…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.brand} size="large" />
      <AppText tone="muted">{label}</AppText>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <AppText variant="h3" center>
        משהו השתבש
      </AppText>
      <AppText tone="muted" center>
        {message}
      </AppText>
      {onRetry && <Button label="לנסות שוב" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

/** Small muted line for an empty section. */
export function EmptyLine({ text }: { text: string }) {
  return (
    <AppText variant="small" tone="muted">
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.s2, padding: space.s4 },
});
