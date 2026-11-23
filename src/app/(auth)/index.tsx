import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { AppText, Button, Card, HeroHeader, Screen, TextField } from '@/components';
import { useAuth } from '@/lib/auth';
import { toE164IL } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme';

/** Step 1 of sign-in: Israeli mobile number → send SMS code. */
export default function PhoneScreen() {
  const { startDemo } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function sendCode() {
    const e164 = toE164IL(phone);
    if (!e164) {
      setError('צריך מספר נייד ישראלי, למשל 050-1234567');
      return;
    }
    setError(null);
    setSending(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: e164 });
    setSending(false);
    if (otpError) {
      setError(otpError.status === 429 ? 'נשלחו יותר מדי קודים. נסה שוב בעוד דקה.' : 'לא הצלחנו לשלוח קוד. בדוק את המספר ונסה שוב.');
      return;
    }
    router.push({ pathname: '/verify', params: { phone: e164 } });
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={
          <HeroHeader
            eyebrow="תיק חיה"
            title={'כל ההיסטוריה\nשל החיה.\nבכיס.'}
            subtitle="התחברות עם מספר הנייד. נשלח לך קוד ב-SMS."
          />
        }
      >
        <Card size="xl" style={styles.card}>
          <TextField
            label="מספר נייד"
            placeholder="050-1234567"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            ltr
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              if (error) setError(null);
            }}
            onSubmitEditing={sendCode}
            error={error}
            maxLength={16}
          />
          <Button label="שלחו לי קוד" withArrow loading={sending} onPress={sendCode} />
        </Card>
        <AppText variant="small" tone="muted" center>
          בהתחברות אתה מסכים לתנאי השימוש ולמדיניות הפרטיות.
        </AppText>
        <Button label="לנסות במצב הדגמה" variant="ghost" icon="flask-outline" onPress={startDemo} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: space.s3 },
});
