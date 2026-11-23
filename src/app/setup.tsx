import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, HeroHeader, Screen, SectionHeader } from '@/components';
import { useAuth } from '@/lib/auth';
import { space } from '@/theme';

/** Shown only when .env is missing the Supabase values. */
export default function Setup() {
  const { startDemo } = useAuth();
  const [starting, setStarting] = useState(false);

  return (
    <Screen header={<HeroHeader eyebrow="תיק חיה" title={'כל ההיסטוריה\nשל החיה.\nבכיס.'} subtitle="האפליקציה עוד לא מחוברת לשרת." />}>
      <Card size="xl" style={styles.card}>
        <SectionHeader number={1} title="לנסות עכשיו" />
        <AppText tone="muted">מצב הדגמה עם שתי חיות לדוגמה. כל המידע נשמר רק בטלפון, וה-AI מחזיר תשובות לדוגמה.</AppText>
        <Button
          label="כניסה למצב הדגמה"
          withArrow
          loading={starting}
          onPress={async () => {
            setStarting(true);
            await startDemo();
          }}
        />
      </Card>
      <Card size="xl" style={styles.card}>
        <SectionHeader number={2} title="חיבור לשרת" />
        <View style={styles.steps}>
          <AppText>העתק את ‎.env.example ל-‎.env בתיקיית הפרויקט.</AppText>
          <AppText>מלא את ‎EXPO_PUBLIC_SUPABASE_URL ו-‎EXPO_PUBLIC_SUPABASE_KEY.</AppText>
          <AppText>עצור והפעל מחדש את ‎npx expo start.</AppText>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ card: { gap: space.s2 }, steps: { gap: space.s1 } });
