/**
 * Temporary style-guide screen for step 1 (skeleton + theme + RTL).
 * It will be replaced by "החיות שלי" in step 3.
 */
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, HeroHeader, Icon, Pill, Screen, SectionHeader } from '@/components';
import { isRTL, rtlUnavailableInExpoGo } from '@/lib/rtl';
import { colors, space } from '@/theme';

export default function StyleGuide() {
  return (
    <Screen
      header={
        <HeroHeader eyebrow="שלב 1 · שלד ועיצוב" title={'כל ההיסטוריה\nשל החיה. בכיס.'} subtitle="מסך בדיקה של הטיפוגרפיה, הצבעים והקומפוננטות.">
          <Button label="הוסף חיה" variant="onBrand" withArrow />
        </HeroHeader>
      }
    >
      {rtlUnavailableInExpoGo && (
        <Card tone="page" style={styles.notice}>
          <AppText variant="bodyStrong" tone="danger">
            המסך מוצג משמאל לימין
          </AppText>
          <AppText variant="small" tone="muted">
            ב-Expo Go כיוון המסך נקבע לפי שפת הטלפון. כדי לבדוק RTL, העבר את שפת הטלפון לעברית או השתמש ב-development build.
          </AppText>
        </Card>
      )}

      <Card>
        <SectionHeader number={1} title="טיפוגרפיה" />
        <AppText variant="hero">כותרת ענק</AppText>
        <AppText variant="h1">כותרת ראשית</AppText>
        <AppText variant="h2">כותרת משנה</AppText>
        <AppText variant="body">
          טקסט רגיל בפונט Assistant. הבעלים מצלמים מסמך מהמרפאה, וה-AI ממלא את התיק.
        </AppText>
        <AppText variant="small" tone="muted">
          טקסט משני, בגודל המינימלי 15.
        </AppText>
      </Card>

      <Card>
        <SectionHeader number={2} title="תגיות" />
        <View style={styles.wrap}>
          <Pill label="חובה" tone="sun" />
          <Pill label="מדווח על ידי הבעלים" tone="brand" icon="person-outline" />
          <Pill label="חיסון בעוד 5 ימים" tone="neutral" icon="calendar-outline" />
          <Pill label="אלרגיה" tone="danger" icon="warning-outline" />
          <Pill label="רשות" tone="outline" />
        </View>
      </Card>

      <Card>
        <SectionHeader number={3} title="כפתורים" />
        <View style={styles.stack}>
          <Button label="שמירה" withArrow />
          <Button label="צילום מסמך" variant="secondary" icon="camera-outline" />
          <Button label="ביטול" variant="ghost" />
          <Button label="מחיקת חשבון" variant="danger" fullWidth />
        </View>
      </Card>

      <Card onPress={() => {}} accessibilityLabel="כרטיס לדוגמה של חיה">
        <SectionHeader number={4} title="כיווניות" subtitle={`כיוון נוכחי: ${isRTL ? 'ימין לשמאל' : 'שמאל לימין'}`} />
        <View style={styles.row}>
          <AppText variant="bodyStrong">הבא</AppText>
          <Icon name="chevronForward" color={colors.brand} />
        </View>
        <AppText variant="small" tone="muted">
          ב-RTL החץ צריך להצביע שמאלה, והמספרים והכותרות צריכים להיות מימין.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s1 },
  stack: { gap: space.s2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s1, marginBottom: space.s1 },
  notice: { gap: space.half, borderWidth: 1.5, borderColor: colors.danger },
});
